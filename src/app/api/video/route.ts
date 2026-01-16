import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Use edge runtime for longer timeouts if possible, or default to node if incompatible with GoogleGenAI SDK
// GoogleGenAI might require node runtime
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for video generation

const MODEL_MAP = {
  "veo-3.1-generate-preview": "veo-3.1-generate-preview",
  "veo-3.1-fast-generate-preview": "veo-3.1-generate-preview", // Placeholder: Map fast to preview if distinct model not available yet or strictly use exact names
  "veo-3.0-generate-001": "veo-3.0-generate-001",
  "veo-3.0-fast-generate-001": "veo-3.0-fast-generate-001",
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 401 });
    }

    const { prompt, images, video, model, aspectRatio, resolution, duration, personGeneration, negativePrompt } = await req.json();

    // Debug logging to trace image handling
    console.log(`[Video API] Received request:`);
    console.log(`  - prompt: ${prompt?.substring(0, 50)}...`);
    console.log(`  - images: ${images ? `${images.length} image(s)` : 'none'}`);
    console.log(`  - video: ${video ? 'yes' : 'no'}`);
    console.log(`  - model: ${model}`);

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required for video generation" }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Check if user requested a specific model, or use default
    // Using the user provided example mapping logic or falling back
    // The user example used "veo-3.1-generate-preview" directly.
    const requestedModel = model || "veo-3.1-generate-preview";

    console.log(`[Video API] Starting video generation with model: ${requestedModel}`);

    // Build common config
    const config: any = {};

    // Use user-provided settings if available, otherwise fallback to defaults.
    // Note: Veo 3.1 Preview I2V generally supports 16:9 and 8s best, but user wants control.
    if (aspectRatio) config.aspectRatio = aspectRatio;
    if (resolution) config.resolution = resolution;
    if (duration) config.durationSeconds = parseInt(duration, 10);

    if (images && images.length > 0) {
      console.log(`[Video API] I2V detected. Using user settings: AR=${config.aspectRatio}, Duration=${config.durationSeconds}s`);
      // User requested to control these parameters. 
      // Note: Veo 3.1 often requires 8s and 16:9 for I2V, but we allow flexibility here as requested.
    }

    // REMOVED: negativePrompt might not be supported in Preview yet.
    // if (negativePrompt) config.negativePrompt = negativePrompt;

    console.log("[Video API] Constructed config:", JSON.stringify(config, null, 2));

    // Process multiple input images for referenceImages
    let referenceImages: any[] = [];
    if (images && images.length > 0) {
      referenceImages = images.map((img: string) => {
        let imageData;
        // Handle data URL - extract base64 and mimeType
        if (typeof img === 'string') {
          if (img.includes("base64,")) {
            const [header, base64Data] = img.split("base64,");
            const mimeType = header.split(";")[0].split(":")[1];
            imageData = {
              imageBytes: base64Data,
              mimeType: mimeType
            };
          } else {
            imageData = {
              imageBytes: img,
              mimeType: "image/png"
            };
          }
        }
        // Match JavaScript SDK structure for VideoGenerationReferenceImage
        return {
          image: imageData,
          referenceType: "asset"  // Lowercase "asset" per user example
        };
      });
    }

    let videoInput;
    if (video) {
      // Handle data URL
      if (typeof video === 'string') {
        if (video.includes("base64,")) {
          const [header, base64Data] = video.split("base64,");
          const mimeType = header.split(";")[0].split(":")[1];
          videoInput = {
            videoBytes: base64Data,
            mimeType: mimeType
          };
        } else {
          // Fallback/Assumption
          videoInput = {
            videoBytes: video,
            mimeType: "video/mp4"
          };
        }
      }
    }

    let operation;
    if (videoInput) {
      // Video Extension
      console.log("Starting video extension...");
      operation = await ai.models.generateVideos({
        model: requestedModel,
        prompt: prompt,
        video: videoInput,
        config: config
      });
    } else if (referenceImages.length > 0) {
      // Use referenceImages in config (camelCase for JavaScript SDK)
      config.referenceImages = referenceImages;

      console.log(`[Video API] Starting video generation with ${referenceImages.length} reference image(s)...`);
      console.log(`[Video API] Config being sent:`, JSON.stringify({
        ...config,
        referenceImages: config.referenceImages?.map((r: any) => ({
          referenceType: r.referenceType,
          image: { mimeType: r.image?.mimeType, hasImageBytes: !!r.image?.imageBytes }
        }))
      }, null, 2));

      operation = await ai.models.generateVideos({
        model: requestedModel,
        prompt: prompt,
        config: config
      });
    } else {
      // Standard text-to-video without any images
      console.log("Starting text-to-video generation...");
      operation = await ai.models.generateVideos({
        model: requestedModel,
        prompt: prompt,
        config: Object.keys(config).length > 0 ? config : undefined
      });
    }

    console.log("Video generation operation started:", operation.name);

    // Poll the operation status until the video is ready.
    // We implement a timeout to avoid infinite loops
    const startTime = Date.now();
    const TIMEOUT_MS = 280000; // 280s (slightly less than function maxDuration)

    while (!operation.done) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        throw new Error("Video generation timed out");
      }

      console.log("Waiting for video generation to complete...");
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5s poll interval

      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
    }

    if (operation.error) {
      throw new Error(`Video generation operation failed: ${JSON.stringify(operation.error)}`);
    }

    // The result should be in operation.response.generatedVideos[0].video
    // This is likely a URI or direct content? 
    // The user example says: ai.files.download({ file: ... }) setting downloadPath.
    // This implies it's a File API URI.
    // We need to fetch the content of this file and return it to the client (base64 or stream).
    // Or return the URI if the frontend can handle it (unlikely if it requires auth).

    const videoFileUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    // Wait, typical response structure? 
    // User ex: ai.files.download({ file: operation.response.generatedVideos[0].video })
    // So `video` object has `uri` or `name` maybe?

    // Let's inspect the video object if possible.
    // But for now, let's assume we need to download it using `ai.files.download`.
    // But `ai.files.download` saves to disk in the example.
    // We want the bytes.
    // SDK might have `downloadFile` returning buffer?

    // Let's try to get the file content.
    // If `ai.files.download` is the only way, we might need to write to /tmp and read it back.
    // Or check if there's a way to get a stream.

    // Note: older SDKs or `files` API usually allows getting content.
    // Let's look for `ai.files.get` or `download` without path?

    // HACK: For now, because we are in Vercel/NextJS environment, writing to /tmp is safe-ish.
    // But efficient way is better.
    // Let's try to assume we can get the URI and fetch it if it's a public URL? 
    // Usually Google GenAI File URIs are NOT public.

    // Let's try to use the `download` method to a temp path.
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `video_${Date.now()}.mp4`);

    const videoResource = operation.response?.generatedVideos?.[0]?.video;

    if (!videoResource) {
      throw new Error("No video resource found in response");
    }

    await ai.files.download({
      file: videoResource,
      downloadPath: tempFilePath,
    });

    // Read the file back
    const videoBuffer = fs.readFileSync(tempFilePath);
    const videoBase64 = videoBuffer.toString('base64');
    const dataUrl = `data:video/mp4;base64,${videoBase64}`;

    // Cleanup
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error("Failed to cleanup temp file:", e);
    }

    return NextResponse.json({ success: true, video: dataUrl });

  } catch (error) {
    console.error("Video Generation Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
