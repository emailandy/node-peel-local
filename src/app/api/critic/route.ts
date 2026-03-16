import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import fs from "fs";
import path from "path";

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute should be enough for critique

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 401 });
    }

    const { video, image, inputPrompt, criteria } = await req.json();

    if (!video && !image) {
      return NextResponse.json({ error: "Video or Image input is required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Process media input
    let mediaPart;
    const mediaData = video || image;
    const isVideo = !!video;

    if (typeof mediaData === 'string') {
      let finalData = mediaData;
      let mimeType = isVideo ? "video/mp4" : "image/jpeg";

      if (mediaData.startsWith("/")) {
        // Handle local file path (e.g., /outputs/...)
        try {
          const filePath = path.join(process.cwd(), "public", mediaData);
          if (fs.existsSync(filePath)) {
            const fileBuffer = fs.readFileSync(filePath);
            finalData = fileBuffer.toString('base64');
            const ext = path.extname(mediaData).toLowerCase();
            if (ext === '.mp4') mimeType = "video/mp4";
            else if (ext === '.png') mimeType = "image/png";
            else if (ext === '.jpg' || ext === '.jpeg') mimeType = "image/jpeg";
            else if (ext === '.webp') mimeType = "image/webp";

            console.log(`AI Critic: Loaded local file ${mediaData} (${mimeType})`);
          } else {
            console.warn(`AI Critic: File not found: ${filePath}`);
          }
        } catch (err) {
          console.error("AI Critic: Error reading local file:", err);
        }
      } else if (mediaData.includes("base64,")) {
        const [header, base64Data] = mediaData.split("base64,");
        // Try to verify mime type from header if possible
        const mimeMatch = header.match(/data:([^;]+)/);
        if (mimeMatch) mimeType = mimeMatch[1];
        finalData = base64Data;
      }

      mediaPart = {
        inlineData: {
          data: finalData,
          mimeType: mimeType
        }
      };
    } else {
      return NextResponse.json({ error: "Invalid media format" }, { status: 400 });
    }

    const systemPrompt = `You are an expert AI Visual Critic and Quality Assurance Guardrail.
Your task is to evaluate visual content (image or video) based on a specific input prompt and a set of quality criteria.

Input Prompt: "${inputPrompt || 'No prompt provided'}"
Criteria: "${criteria || 'No distortion, matches theme, realistic physics'}"

Analyze the content carefully for:
1. Adherence to the Input Prompt.
2. Visual Artifacts (distortion, morphing objects, extra limbs, bad physics).
3. Overall aesthetic quality.

Rate strictly.`;

    // Define response schema
    const schema = {
      description: "Evaluation result",
      type: SchemaType.OBJECT,
      properties: {
        score: { type: SchemaType.INTEGER, description: "Rating from 1-10" },
        reasoning: { type: SchemaType.STRING, description: "Short explanation" },
        passed: { type: SchemaType.BOOLEAN, description: "True if score > 7" },
      },
      required: ["score", "reasoning", "passed"],
    };

    console.log("Starting AI Critic evaluation...");

    const model = genAI.getGenerativeModel({
      model: "gemini-3-pro-preview",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
      }
    });

    const result = await model.generateContent([
      systemPrompt,
      mediaPart
    ]);

    const responseText = result.response.text();
    console.log("AI Critic Response:", responseText);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      // Sometimes the model might wrap in ```json ```
      const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      try {
        parsedResponse = JSON.parse(cleanText);
      } catch (e2) {
        return NextResponse.json({ error: "Failed to parse model response" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, ...parsedResponse });

  } catch (error) {
    console.error("AI Critic Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

