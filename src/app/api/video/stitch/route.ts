
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import os from "os";
import ffmpeg from "fluent-ffmpeg";
import { mergeAudioVideo, stitchVideos } from "@/lib/ffmpeg-service";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Matched to frontend limit
    },
  },
};

// Helper to write base64 to file and return detected extension
async function writeBase64ToFile(base64Data: string, filePathWithoutExt: string): Promise<string> {
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');

  let ext = "mp3";
  if (mimeType.includes("wav")) ext = "wav";
  else if (mimeType.includes("ogg")) ext = "ogg";
  else if (mimeType.includes("mpeg")) ext = "mp3";
  else if (mimeType.includes("webm")) ext = "webm";
  else if (mimeType.includes("aac")) ext = "aac";

  const fullPath = `${filePathWithoutExt}.${ext}`;
  await fs.promises.writeFile(fullPath, buffer);
  return fullPath;
}

// Helper to download URL to file
async function downloadUrlToFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  await fs.promises.writeFile(filePath, Buffer.from(arrayBuffer));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videos, audio } = body;

    console.log(`[Stitch API] Input: ${videos?.length} videos, Audio present: ${!!audio}`);

    if (!videos || !Array.isArray(videos) || videos.length < 2) {
      return NextResponse.json(
        { error: "At least two videos are required for stitching." },
        { status: 400 }
      );
    }

    const tempDir = path.join(os.tmpdir(), `stitch-${uuidv4()}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    const inputFiles: string[] = [];
    let audioFile: string | null = null;

    try {
      // 1. Process Audio
      if (audio) {
        const audioBaseName = path.join(tempDir, "input-audio");
        if (audio.startsWith("data:")) {
          audioFile = await writeBase64ToFile(audio, audioBaseName);
        } else if (audio.startsWith("http")) {
          audioFile = `${audioBaseName}.mp3`; // Fallback extension
          await downloadUrlToFile(audio, audioFile);
        } else {
          // Handle relative paths for local testing if needed
          throw new Error("Local relative audio paths not supported via API");
        }
        console.log(`[Stitch API] Processed audio file: ${audioFile}`);
      }

      // 2. Process Videos
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const inputPath = path.join(tempDir, `input-${i}.mp4`);
        
        if (video.startsWith("data:")) {
          const matches = video.match(/^data:([^;]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            await fs.promises.writeFile(inputPath, Buffer.from(matches[2], 'base64'));
          }
        } else if (video.startsWith("http")) {
          await downloadUrlToFile(video, inputPath);
        } else {
          // Handle relative paths (public directory)
          const publicDir = path.join(process.cwd(), "public");
          const videoPath = video.startsWith('/') ? video.slice(1) : video; // Remove leading slash
          const possiblePath = path.join(publicDir, videoPath);
          if (fs.existsSync(possiblePath)) {
            await fs.promises.copyFile(possiblePath, inputPath);
          } else {
            // Try absolute path if passed (e.g. from previous steps)
            if (fs.existsSync(video)) {
              await fs.promises.copyFile(video, inputPath);
            } else {
              throw new Error(`Video file not found: ${video}`);
            }
          }
        }
        inputFiles.push(inputPath);
      }

      // 3. Prepare Paths
      const publicOutputsDir = path.join(process.cwd(), "public", "outputs");
      if (!fs.existsSync(publicOutputsDir)) {
        await fs.promises.mkdir(publicOutputsDir, { recursive: true });
      }

      const outputFilename = `stitched-${Date.now()}-${uuidv4()}.mp4`;
      const finalOutputPath = path.join(publicOutputsDir, outputFilename);

      // 4. Stitch & Merge (Unified)
      console.log("[Stitch API] Calling Unified Merge Service...");

      if (audioFile) {
        // Truth Serum: Probe the file to see what FFmpeg sees (keeping this for safety)
        const stats = await fs.promises.stat(audioFile);
        console.log(`[Stitch API] Audio File Size: ${stats.size} bytes`);
        if (stats.size === 0) throw new Error("Audio file matches invalid size (0 bytes).");
        
        await mergeAudioVideo({
          videoPaths: inputFiles,
          audioPath: audioFile,
          outputPath: finalOutputPath
        });
      } else {
        // Fallback to simple stitch if no audio
        await stitchVideos({
          videoPaths: inputFiles,
          outputPath: finalOutputPath
        });
      }

      console.log(`[Stitch API] Success! Output: ${finalOutputPath}`);
      return NextResponse.json({ success: true, video: `/outputs/${outputFilename}` });

    } finally {
      // Cleanup
      try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("Failed to cleanup temp dir:", e);
      }
    }

  } catch (error) {
    console.error("Stitching error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video stitching failed" },
      { status: 500 }
    );
  }
}
