import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import os from "os";

// Use edge runtime for longer timeouts if possible, or default to node if incompatible with GoogleGenAI SDK
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout

// Helper to process a single reference image
async function processReferenceImage(imgStr: string, idx: number): Promise<{ image: { imageBytes: string, mimeType: string }, referenceType: string }> {
  // Maximum size: ~4MB base64
  const MAX_BASE64_LENGTH = 4 * 1024 * 1024;

  let buffer: Buffer;
  let mimeType = "image/png";

  if (imgStr.startsWith("data:")) {
    const [header, base64Data] = imgStr.split("base64,");
    mimeType = header.split(";")[0].split(":")[1];
    buffer = Buffer.from(base64Data, "base64");
  } else {
    // URL or Path handling
    if (imgStr.startsWith("/") || imgStr.startsWith("http://localhost")) {
      let relativePath = imgStr.replace(/^http:\/\/localhost:\d+/, "");

      // Map API/Public paths to filesystem
      let fsPath = "";
      const cwd = process.cwd();
      if (relativePath.startsWith("/api/avatar/image/")) {
        fsPath = path.join(cwd, "public", "user-avatars", path.basename(relativePath));
      } else if (relativePath.startsWith("/user-avatars/")) {
        fsPath = path.join(cwd, "public", "user-avatars", path.basename(relativePath));
      } else if (relativePath.startsWith("/outputs/")) {
        fsPath = path.join(cwd, "public", "outputs", path.basename(relativePath));
      } else if (relativePath.startsWith("/public/")) {
        fsPath = path.join(cwd, relativePath);
      }

      if (fsPath && fs.existsSync(fsPath)) {
        buffer = await fs.promises.readFile(fsPath);
        const ext = path.extname(fsPath).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') mimeType = "image/jpeg";
        else if (ext === '.webp') mimeType = "image/webp";
      } else {
        console.warn(`[Video API] Could not map local path ${relativePath}, trying fetch...`);
        const res = await fetch(imgStr.startsWith("http") ? imgStr : `http://localhost:3000${imgStr}`);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
        const arrayBuffer = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        const typeHeader = res.headers.get("content-type");
        if (typeHeader) mimeType = typeHeader;
      }
    } else {
      // Remote URL
      const res = await fetch(imgStr);
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      const typeHeader = res.headers.get("content-type");
      if (typeHeader) mimeType = typeHeader;
    }
  }

  const imageBytes = buffer.toString("base64");
  console.log(`[Video API] Reference image ${idx + 1}: ${Math.round(buffer.length / 1024)} KB (${mimeType})`);

  if (imageBytes.length > MAX_BASE64_LENGTH) {
    throw new Error(`Reference image ${idx + 1} is too large (${Math.round(imageBytes.length / 1024 / 1024)}MB). Please resize under ~3MB.`);
  }

  return {
    image: { imageBytes, mimeType },
    referenceType: "ASSET"
  };
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 401 });
    }

    const {
      prompt,
      images,
      video,
      model,
      selectedModel,
      aspectRatio,
      parameters,
      resolution,
      duration,
      firstFrameImage,
      lastFrameImage
    } = await req.json();

    console.log(`[Video API] Received request with model: ${model || selectedModel?.modelId}`);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const requestedModel = model || selectedModel?.modelId || "veo-3.1-generate-preview";

    // Build Config
    const config: any = {};
    const effectiveAspectRatio = aspectRatio || parameters?.aspectRatio;

    if (effectiveAspectRatio) {
      config.aspectRatio = effectiveAspectRatio.split(' ')[0];
      config['aspect_ratio'] = config.aspectRatio;
    }

    if (parameters) {
      Object.entries(parameters).forEach(([key, value]) => {
        if (key !== 'aspectRatio' && value !== undefined && value !== null && value !== '') {
          config[key] = value;
        }
      });
    }

    if (resolution) config.resolution = resolution;

    const isHighRes = resolution === '1080p' || resolution === '4k';
    const hasExtensions = (images && images.length > 0) || video;

    if (isHighRes || hasExtensions) {
      config.durationSeconds = 8;
    } else if (duration) {
      config.durationSeconds = parseInt(String(duration), 10);
    }

    if (images && images.length > 0) {
      console.log(`[Video API] I2V detected. AR=${config.aspectRatio}`);
    }

    // Process Last Frame
    if (lastFrameImage && typeof lastFrameImage === 'string' && lastFrameImage.startsWith("data:")) {
      const [header, base64Data] = lastFrameImage.split("base64,");
      const mimeType = header.split(";")[0].split(":")[1];
      config.lastFrame = { imageBytes: base64Data, mimeType };
    }

    // Process Reference Images
    let referenceImages: any[] = [];
    if (images && images.length > 0) {
      referenceImages = await Promise.all(images.map((img: string, idx: number) => processReferenceImage(img, idx)));
    }

    let operation;

    // Video Extension
    if (video && typeof video === 'string') {
      console.log("Starting video extension...");
      let videoBytes, mimeType = "video/mp4";
      if (video.includes("base64,")) {
        const parts = video.split("base64,");
        mimeType = parts[0].split(";")[0].split(":")[1];
        videoBytes = parts[1];
      } else {
        videoBytes = video;
      }

      operation = await ai.models.generateVideos({
        model: requestedModel,
        prompt: prompt,
        video: { videoBytes, mimeType },
        config: config
      });
    }
    // Image to Video (Reference Images)
    else if (referenceImages.length > 0) {
      const isVeo31 = requestedModel.includes("veo-3.1");
      if (isVeo31) {
        console.log(`[Video API] Using connected image as First Frame for ${requestedModel}...`);
        const firstRef = referenceImages[0];
        operation = await ai.models.generateVideos({
          model: requestedModel,
          prompt: prompt,
          image: {
            imageBytes: firstRef.image.imageBytes,
            mimeType: firstRef.image.mimeType
          } as any,
          config: config
        });
      } else {
        config.referenceImages = referenceImages;
        operation = await ai.models.generateVideos({
          model: requestedModel,
          prompt: prompt,
          config: config
        });
      }
    }
    // First Frame Image (explicit)
    else if (firstFrameImage && typeof firstFrameImage === 'string') {
      console.log("Starting Image-to-Video (First Frame)...");
      const [header, base64Data] = firstFrameImage.split("base64,");
      const mimeType = header.split(";")[0].split(":")[1];

      operation = await ai.models.generateVideos({
        model: requestedModel,
        prompt: prompt,
        image: { imageBytes: base64Data, mimeType } as any,
        config: config
      });
    }
    // Text to Video
    else {
      console.log("Starting text-to-video generation...");
      operation = await ai.models.generateVideos({
        model: requestedModel,
        prompt: prompt,
        config: Object.keys(config).length > 0 ? config : undefined
      });
    }

    console.log("Video generation started:", operation.name);

    // Poll logic
    const startTime = Date.now();
    const TIMEOUT_MS = 280000;

    while (!operation.done) {
      if (Date.now() - startTime > TIMEOUT_MS) throw new Error("Video generation timed out");
      await new Promise(r => setTimeout(r, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const videoResource = operation.response?.generatedVideos?.[0]?.video;
    if (!videoResource) {
      const debugInfo = JSON.stringify(operation, null, 2);
      console.error("[Video Debug] Operation result missing video:", debugInfo);
      throw new Error(`No video resource found. Debug: ${debugInfo}`);
    }

    // Download Logic
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `video_${Date.now()}.mp4`);

    await ai.files.download({
      file: (videoResource as any).name || videoResource,
      downloadPath: tempFilePath,
    });

    const videoBuffer = fs.readFileSync(tempFilePath);
    const publicOutputsDir = path.join(process.cwd(), "public", "outputs");
    if (!fs.existsSync(publicOutputsDir)) await fs.promises.mkdir(publicOutputsDir, { recursive: true });

    const outputFilename = `generated-video-${Date.now()}-${uuidv4()}.mp4`;
    const outputPath = path.join(publicOutputsDir, outputFilename);
    await fs.promises.writeFile(outputPath, videoBuffer);

    try { fs.unlinkSync(tempFilePath); } catch (e) { console.error("Cleanup failed", e); }

    return NextResponse.json({ success: true, video: `/outputs/${outputFilename}` });

  } catch (error) {
    console.error("Video Generation Error:", error);
    let errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    errorMessage = errorMessage.replace(/`[a-zA-Z0-9+/=]{50,}`/g, "`[BASE64_DATA]`");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
