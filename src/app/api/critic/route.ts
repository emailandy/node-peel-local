import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute should be enough for critique

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 401 });
    }

    const { video, inputPrompt, criteria } = await req.json();

    if (!video) {
      return NextResponse.json({ error: "Video input is required" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Process video input
    let videoPart;
    if (typeof video === 'string') {
      if (video.includes("base64,")) {
        const [header, base64Data] = video.split("base64,");
        const mimeType = header.split(";")[0].split(":")[1];
        videoPart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        };
      } else {
        // Fallback if raw base64
        videoPart = {
          inlineData: {
            data: video,
            mimeType: "video/mp4"
          }
        };
      }
    } else {
      return NextResponse.json({ error: "Invalid video format" }, { status: 400 });
    }

    const systemPrompt = `You are an expert AI Video Critic and Quality Assurance Guardrail.
Your task is to evaluate a video based on a specific input prompt and a set of quality criteria.

Input Prompt: "${inputPrompt || 'No prompt provided'}"
Criteria: "${criteria || 'No distortion, matches theme, realistic physics'}"

Analyze the video carefully for:
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
      videoPart
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

