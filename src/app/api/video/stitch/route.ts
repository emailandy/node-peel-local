import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import os from "os";

// Helper to write base64 to file
async function writeBase64ToFile(base64Data: string, filePath: string): Promise<void> {
  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }
  const buffer = Buffer.from(matches[2], 'base64');
  await fs.promises.writeFile(filePath, buffer);
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
    const { videos } = await req.json();

    if (!videos || !Array.isArray(videos) || videos.length < 2) {
      return NextResponse.json(
        { error: "At least two videos are required for stitching." },
        { status: 400 }
      );
    }

    // Creates a temporary directory for processing
    const tempDir = path.join(os.tmpdir(), `stitch-${uuidv4()}`);
    await fs.promises.mkdir(tempDir, { recursive: true });

    const inputFiles: string[] = [];

    // Process inputs
    for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        const ext = "mp4"; // Assume mp4 for simplicity, or detect from mime/url
        const inputPath = path.join(tempDir, `input-${i}.${ext}`);
        
        if (video.startsWith("data:")) {
            await writeBase64ToFile(video, inputPath);
        } else if (video.startsWith("http")) {
            await downloadUrlToFile(video, inputPath);
        } else {
             // Handle relative paths if they are pointing to local public files (e.g. /outputs/...)
             // Construct absolute path from public dir if strictly local app
             const publicDir = path.join(process.cwd(), "public");
             const possiblePath = path.join(publicDir, video);
             if (fs.existsSync(possiblePath)) {
                 // Copy to temp to ensure safety/access
                 await fs.promises.copyFile(possiblePath, inputPath);
             } else {
                 throw new Error(`Invalid video source format or file not found: ${video}`);
             }
        }
        inputFiles.push(inputPath);
    }

    // Output path in public directory for serving
    // Ensure public/outputs exists
    const publicOutputsDir = path.join(process.cwd(), "public", "outputs");
    if (!fs.existsSync(publicOutputsDir)) {
        await fs.promises.mkdir(publicOutputsDir, { recursive: true });
    }
    
    const outputFilename = `stitched-${Date.now()}-${uuidv4()}.mp4`;
    const outputPath = path.join(publicOutputsDir, outputFilename);
    const outputUrl = `/outputs/${outputFilename}`;

    // Perform stitching
    // Using fluent-ffmpeg merge
    await new Promise<void>((resolve, reject) => {
        const command = ffmpeg();
        
        inputFiles.forEach(file => {
            command.input(file);
        });

        command
            .on("error", (err) => {
                console.error("FFmpeg error:", err);
                reject(err);
            })
            .on("end", () => {
                resolve();
            })
            .mergeToFile(outputPath, tempDir); // tempDir is optional for temp files used by merge
    });

    // Cleanup input temp files
    try {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
        console.warn("Failed to cleanup temp dir:", e);
    }

    return NextResponse.json({ success: true, video: outputUrl });

  } catch (error) {
    console.error("Stitching error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video stitching failed" },
      { status: 500 }
    );
  }
}
