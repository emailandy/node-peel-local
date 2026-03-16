
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Ensure API key is present
const envApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  // Get API key from header or env
  const apiKey = req.headers.get("x-gemini-api-key") || envApiKey;

  if (!apiKey) {
    return NextResponse.json({ error: "API key is required" }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const client = new GoogleGenAI({ apiKey });

    // We need to capture audio chunks
    const audioChunks: string[] = [];
    let resolveGeneration: () => void;
    let rejectGeneration: (reason?: any) => void;

    // Create a promise that resolves when we have enough audio
    const generationPromise = new Promise<void>((resolve, reject) => {
      resolveGeneration = resolve;
      rejectGeneration = reject;
    });

    // Connect to the Lyria model
    // @ts-ignore - The types might not be perfectly inferred for experimental features
    const session = await client.live.music.connect({
      model: 'models/lyria-realtime-exp',
      callbacks: {
        onmessage: (msg: any) => {
          // msg is LiveMusicServerMessage
          // It might have serverContent -> audioChunks
          if (msg.serverContent?.audioChunks) {
            for (const chunk of msg.serverContent.audioChunks) {
              if (chunk.data) {
                audioChunks.push(chunk.data);
              }
            }
          }
          // Check if we have enough data (e.g., ~15 seconds aka ~100 chunks? Tuning needed)
          // For a simple demo, 50 chunks might be enough for a few seconds.
          if (audioChunks.length > 50) {
            resolveGeneration();
          }
        },
        onerror: (err: any) => {
          console.error("Lyria socket error:", err);
          rejectGeneration(err);
        },
        onclose: () => {
          resolveGeneration();
        }
      }
    });

    // Set config
    await session.setMusicGenerationConfig({
      musicGenerationConfig: {
        bpm: 120, // default if not specified
      }
    });

    // Set prompt
    await session.setWeightedPrompts({
      weightedPrompts: [{ text: prompt, weight: 1.0 }]
    });

    // Start generation
    session.play();

    // specific timeout for this request
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Generation timed out")), 15000)
    );

    await Promise.race([generationPromise, timeout]).catch(err => {
      // If we have some audio, we might still want to return it even on timeout
      if (audioChunks.length === 0) throw err;
    });

    // Close session to stop generation
    try {
      // There isn't an explicit "close" on LiveMusicSession in the d.ts shown, 
      // but usually underlying conn has it, or we just let it be gc'd?
      // Wait, `LiveMusicSession` has `conn: WebSocket`.
      session.conn.close();
    } catch (e) {
      // ignore close errors
    }

    if (audioChunks.length === 0) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    // Concatenate chunks
    const combinedBase64 = audioChunks.join("");

    return NextResponse.json({
      success: true,
      audio: combinedBase64,
    });

  } catch (error) {
    console.error("Lyria generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
