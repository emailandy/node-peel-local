
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { writeFile } from "fs/promises";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate file type
    const validTypes = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp3"];
    // Also check extension as backup since mime types can vary
    const validExtensions = [".mp3", ".wav"];
    const ext = path.extname(file.name).toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
       return NextResponse.json({ success: false, error: "Invalid file type. Only MP3 and WAV are allowed." }, { status: 400 });
    }

    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!fs.existsSync(audioDir)) {
      await fs.promises.mkdir(audioDir, { recursive: true });
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = path.join(audioDir, safeName);

    await writeFile(filePath, buffer);
    console.log(`Uploaded audio file to ${filePath}`);

    return NextResponse.json({ success: true, filename: safeName, url: `/audio/${safeName}` });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
