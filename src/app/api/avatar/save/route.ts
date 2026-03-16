import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Define Avatar interface for type safety (matching client)
interface AvatarMetadata {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female' | 'other';
  category: 'family' | 'professional' | 'creative' | 'solo';
  previewUrl: string;
  createdAt: number;
}

export async function POST(request: NextRequest) {
  try {
    const { image, name, description, gender, category } = await request.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid image data" },
        { status: 400 }
      );
    }

    // Ensure directory exists
    const uploadsDir = path.join(process.cwd(), "public", "user-avatars");
    if (!fs.existsSync(uploadsDir)) {
      await fs.promises.mkdir(uploadsDir, { recursive: true });
    }

    // Decode base64
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return NextResponse.json(
        { success: false, error: "Invalid base64 string" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(matches[2], "base64");
    const timestamp = Date.now();
    const uuid = uuidv4();
    const filename = `avatar-${timestamp}-${uuid}.png`;
    const filePath = path.join(uploadsDir, filename);

    // Save file
    await fs.promises.writeFile(filePath, buffer);

    // Return URL (Dynamic API route)
    const url = `/api/avatar/image/${filename}`;
    const id = `user-${timestamp}`;

    // Update manifest.json
    try {
      if (name && description && gender && category) {
        const manifestPath = path.join(uploadsDir, "manifest.json");
        let manifest: AvatarMetadata[] = [];

        if (fs.existsSync(manifestPath)) {
          const content = await fs.promises.readFile(manifestPath, "utf-8");
          try {
            manifest = JSON.parse(content);
          } catch (e) {
            console.error("Failed to parse manifest.json", e);
            // backup corrupted manifest?
          }
        }

        const newAvatar: AvatarMetadata = {
          id,
          name,
          description,
          gender,
          category,
          previewUrl: url,
          createdAt: timestamp,
        };

        manifest.push(newAvatar);
        await fs.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      } else {
        console.warn("Missing metadata for avatar manifest:", { name, description, gender, category });
      }
    } catch (manifestError) {
      console.error("Failed to update manifest:", manifestError);
      // We don't fail the request if manifest update fails, but we verify it.
    }

    return NextResponse.json({
      success: true,
      url,
      avatar: {
        id,
        name,
        description,
        gender,
        category,
        previewUrl: url,
        createdAt: timestamp
      }
    });
  } catch (error) {
    console.error("Error saving avatar:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save avatar" },
      { status: 500 }
    );
  }
}
