import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const uploadsDir = path.join(process.cwd(), "public", "user-avatars");
    const manifestPath = path.join(uploadsDir, "manifest.json");

    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json({ success: true, avatars: [] });
    }

    const content = await fs.promises.readFile(manifestPath, "utf-8");
    const avatars = JSON.parse(content);

    return NextResponse.json({ success: true, avatars });
  } catch (error) {
    console.error("Error listing avatars:", error);
    return NextResponse.json(
      { success: false, error: "Failed to list avatars" },
      { status: 500 }
    );
  }
}
