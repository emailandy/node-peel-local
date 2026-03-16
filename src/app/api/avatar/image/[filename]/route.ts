import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Simple mime type lookup to avoid external dependencies
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".json": return "application/json";
    default: return "application/octet-stream";
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ filename: string }> }
) {
  const params = await props.params;
  const filename = params.filename;

  if (!filename) {
    return new NextResponse("Filename is required", { status: 400 });
  }

  // Security: Prevent path traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "user-avatars", safeFilename);

  if (!fs.existsSync(filePath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    const contentType = getMimeType(safeFilename);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving avatar image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
