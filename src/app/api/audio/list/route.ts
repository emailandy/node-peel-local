
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = 'nodejs';

export async function GET() {
  try {
    const audioDir = path.join(process.cwd(), "public", "audio");
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(audioDir)) {
      await fs.promises.mkdir(audioDir, { recursive: true });
      return NextResponse.json({ files: [] });
    }

    const files = await fs.promises.readdir(audioDir);
    
    const audioFiles = files
      .filter(file => /\.(mp3|wav|ogg|mpeg|webm)$/i.test(file))
      .map(file => ({
        name: file,
        url: `/audio/${file}`,
        // basic cleanup of filename for display
        displayName: file.replace(/\.(mp3|wav|ogg|mpeg|webm)$/i, "").replace(/[_-]/g, " ")
      }));

    return NextResponse.json({ files: audioFiles });
  } catch (error) {
    console.error("Error listing audio files:", error);
    return NextResponse.json({ error: "Failed to list audio files" }, { status: 500 });
  }
}
