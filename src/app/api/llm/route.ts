import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { LLMGenerateRequest, LLMGenerateResponse, LLMModelType } from "@/types";
import { logger } from "@/utils/logger";

export const maxDuration = 60; // 1 minute timeout

// Generate a unique request ID for tracking
function generateRequestId(): string {
  return `llm-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Map model types to actual API model IDs
const GOOGLE_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-3-flash-preview": "gemini-3-flash-preview",
  "gemini-3-pro-preview": "gemini-3-pro-preview",
};

const OPENAI_MODEL_MAP: Record<string, string> = {
  "gpt-4.1-mini": "gpt-4.1-mini",
  "gpt-4.1-nano": "gpt-4.1-nano",
};

async function generateWithGoogle(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  // User-provided key takes precedence over env variable
  const apiKey = userApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'GEMINI_API_KEY not configured', { requestId });
    throw new Error("GEMINI_API_KEY not configured. Add it to .env.local or configure in Settings.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const modelId = GOOGLE_MODEL_MAP[model];

  logger.info('api.llm', 'Calling Google AI API', {
    requestId,
    model: modelId,
    temperature,
    maxTokens,
    imageCount: images?.length || 0,
    promptLength: prompt.length,
  });

  // Build multimodal content if images are provided
  let contents: string | Array<{ inlineData: { mimeType: string; data: string } } | { text: string }>;
  if (images && images.length > 0) {
    contents = [
      ...images.map((img) => {
        // Extract base64 data and mime type from data URL
        const matches = img.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          return {
            inlineData: {
              mimeType: matches[1],
              data: matches[2],
            },
          };
        }
        // Fallback: assume PNG if no data URL prefix
        return {
          inlineData: {
            mimeType: "image/png",
            data: img,
          },
        };
      }),
      { text: prompt },
    ];
  } else {
    contents = prompt;
  }

  const startTime = Date.now();
  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });
  const duration = Date.now() - startTime;

  // Use the convenient .text property that concatenates all text parts
  const text = response.text;
  if (!text) {
    logger.error('api.error', 'No text in Google AI response', { requestId });
    throw new Error("No text in Google AI response");
  }

  logger.info('api.llm', 'Google AI API response received', {
    requestId,
    duration,
    responseLength: text.length,
  });

  return text;
}

async function generateWithOpenAI(
  prompt: string,
  model: LLMModelType,
  temperature: number,
  maxTokens: number,
  images?: string[],
  requestId?: string,
  userApiKey?: string | null
): Promise<string> {
  // User-provided key takes precedence over env variable
  const apiKey = userApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.error('api.error', 'OPENAI_API_KEY not configured', { requestId });
    throw new Error("OPENAI_API_KEY not configured. Add it to .env.local or configure in Settings.");
  }

  const modelId = OPENAI_MODEL_MAP[model];

  logger.info('api.llm', 'Calling OpenAI API', {
    requestId,
    model: modelId,
    temperature,
    maxTokens,
    imageCount: images?.length || 0,
    promptLength: prompt.length,
  });

  // Build content array for vision if images are provided
  let content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  if (images && images.length > 0) {
    content = [
      { type: "text", text: prompt },
      ...images.map((img) => ({
        type: "image_url" as const,
        image_url: { url: img },
      })),
    ];
  } else {
    content = prompt;
  }

  const startTime = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [{ role: "user", content }],
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const duration = Date.now() - startTime;

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    logger.error('api.error', 'OpenAI API request failed', {
      requestId,
      status: response.status,
      error: error.error?.message,
    });
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    logger.error('api.error', 'No text in OpenAI response', { requestId });
    throw new Error("No text in OpenAI response");
  }

  logger.info('api.llm', 'OpenAI API response received', {
    requestId,
    duration,
    responseLength: text.length,
  });

  return text;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Get user-provided API keys from headers (override env variables)
    const geminiApiKey = request.headers.get("X-Gemini-API-Key");
    const openaiApiKey = request.headers.get("X-OpenAI-API-Key");

    const body: LLMGenerateRequest = await request.json();
    const {
      prompt,
      images,
      provider,
      model,
      temperature = 0.7,
      maxTokens = 1024,
      enhancementType // New optional field
    } = body;

    logger.info('api.llm', 'LLM generation request received', {
      requestId,
      provider,
      model,
      temperature,
      maxTokens,
      hasImages: !!(images && images.length > 0),
      imageCount: images?.length || 0,
      enhancementType,
      prompt,
    });

    if (!prompt) {
      logger.warn('api.llm', 'LLM request validation failed: missing prompt', { requestId });
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Construct valid system instructions depending on enhancement type
    let finalPrompt = prompt;

    if (enhancementType === "video") {
      finalPrompt = `You are an expert video prompt engineer for Veo 3. Enhance the following prompt to be descriptive and clear, following these specific guidelines:

1.  **Core Elements**:
    *   **Subject**: Clearly identify the object, person, animal, or scenery (e.g., cityscape, nature, vehicles, puppies).
    *   **Action**: Describe what the subject is doing (e.g., walking, running, turning head).
    *   **Style**: Specify creative direction using film style keywords (e.g., sci-fi, horror, film noir, clean animation, cartoon).
    *   **Ambiance**: Describe color and light (e.g., blue tones, night, warm tones).

2.  **Optional but Recommended**:
    *   **Camera**: Positioning and motion (e.g., aerial view, eye-level, top-down, dolly shot, worm's eye).
    *   **Composition**: Framing (e.g., wide shot, close-up, two-shot).
    *   **Focus**: Lens effects (e.g., shallow focus, deep focus, macro lens).

3.  **Tips**:
    *   Use descriptive adjectives and adverbs.
    *   Enhance facial details (e.g., use "portrait" if face is focus).

4.  **Audio Cues (If implied/relevant)**:
    *   **Dialogue**: Use quotes (e.g., "This must be the key," he murmured).
    *   **SFX**: Explicit description (e.g., tires screeching, engine roaring).
    *   **Ambient**: Soundscape (e.g., faint eerie hum in background).

Output ONLY the enhanced prompt. Do NOT include explanations.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "branding") {
      finalPrompt = `You are an expert Branding Director. Enhance the following user prompt to create a comprehensive Brand Identity request.
      
Follow this template structure and style based on these examples:

*   "Create a complete brand identity kit for a modern tech startup named 'NovaEdge Systems,' including logo variations, color palette, typography system, icon set, pattern language, and layout rules. The style should be clean, futuristic, minimal, and consistent across all assets."
*   "Generate realistic brand mockups for this 'AstraLoop Studio' logo applied to a business card, letterhead, notepad, envelope, and ID badge. Use premium materials, soft shadows, and a clean studio aesthetic to convey a polished corporate identity."
*   "Develop a full visual brand identity system for 'FluxBeam Labs,' including logo clear-space rules, do/don’t usage, brand patterns, grid system, color variations, and sample branded layouts for web + print. Style direction: geometric, energetic, and tech-forward."

Your goal: specific, high-resolution, professional branding descriptions.
Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "product") {
      finalPrompt = `You are an expert Product Photographer and Art Director. Enhance the following user prompt to create a high-end commercial product photography description.
      
Follow this template structure and style based on these examples:

*   "Show this [gold necklace] on a sandy beach with gentle morning light and soft shadows, seashells scattered nearby."
*   "Add a soft boho-style living-room background behind this [linen tote bag], with warm sunlight, rattan textures, and neutral beige tones."
*   "Place this [running shoe] on a premium 3D podium with soft studio lighting and a subtle shadow beneath it."
*   "Show this [shower gel bottle] submerged in clear turquoise ocean water, with caustic light reflections shimmering on the surface."
*   "Transform this [perfume bottle] into a luxury cosmetics-style ad with glossy highlights and a reflective black background."
*   "Place this [smartwatch] inside a futuristic CGI environment with neon accents, chrome reflections, and glowing floor lights."

Your goal: clean, commercial, highly realistic, and visually appealing product scenes. Focus on lighting, background, and texture.
Output ONLY the enhanced prompt.
Original Prompt: "${prompt}"`;
    } else if (enhancementType === "editing") {
      finalPrompt = `You are an expert Photo Editor and Retoucher. Enhance the following user prompt to create a precise photo editing instruction.
      
Follow this template structure and style based on these examples:

*   **Background Replacement**: "Replace the background of this subject with a realistic urban sunset skyline, maintaining proper shadows and ambient light interaction with the subject."
*   **Color Grading & Mood**: "Apply a moody, cinematic teal-and-orange color grade to this outdoor scene, increasing contrast, enhancing sunlight highlights, and deepening shadows."
*   **Object Removal / Cleaning**: "Remove all background distractions from this photo, including wires, litter, and signs, while seamlessly blending the surrounding environment."
*   **Style Transfer**: "Transform this photo into a hyper-realistic painting style reminiscent of Rembrandt, preserving facial features and textures but adding dramatic lighting and brushstroke textures."
*   **Portrait Retouching**: "Enhance this portrait by smoothing skin, brightening eyes, whitening teeth, and adding soft cinematic lighting, while keeping natural textures and avoiding plastic-like effects."

Your goal: clear, actionable, technical editing instructions for an AI model.
Output ONLY the enhanced prompt.
Original Prompt: "${prompt}"`;
    } else if (enhancementType === "logic") {
      finalPrompt = `You are an expert Logic and Composition Engineer for AI generation. Enhance the following user prompt to create a highly structured, logic-driven image description.

Follow this template structure and style based on these examples:

*   "An image of an office where 10 different people are neatly arranged (2 in the front row, 3 in the middle row, 5 in the back row), each holding a unique object whose name starts with the letter 'A'."
*   "Show 5 students, each wearing glasses with a different frame color, holding books where the number of letters in the title matches the Fibonacci sequence in order."
*   "Illustrate 6 people, each holding a different coin, where the combined value of any three coins equals a prime number."

Your goal: precise, mathematical, or rule-based spatial arrangement and logical constraints. Focus on counts, sequences, positioning, and conditional rules.
Output ONLY the enhanced prompt.
Original Prompt: "${prompt}"`;
    } else if (enhancementType === "content") {
      finalPrompt = `You are an expert Social Media Content Creator and Pop Culture Visualizer. Enhance the following user prompt to create viral, engaging, or stylistically specific content.

Follow this template structure and style based on these examples:

*   "Generate a 9-image 'photo dump' grid of this person's vacation: a mirror selfie, a beach shot, friends at dinner, a blurry party photo, a scenery shot, a public bus shot, a pet moment, a sunset, and a candid smile."
*   "Johnny Depp, Jackie Chan, Taylor Swift, Tom Hanks, The Rock, Michael Jackson, Shahrukh Khan, Oprah, Blackpink, Messi, Elon Musk, taking a group photo."
*   "Make 100x zoom on the bee."
*   "Make a 100 dollar bill of this person."
*   "Make a GTA 6 poster of these characters."

Your goal: creative, trendy, and specific visual scenarios. Focus on pop culture references, meme formats, specific camera angles (like 100x zoom), or stylized formats (posters, bills, grids).
Output ONLY the enhanced prompt.
Original Prompt: "${prompt}"`;
    } else if (enhancementType === "image") {
      // Nano Banana / Generic Image Enhancement
      finalPrompt = `Enhance this image generation prompt to be more descriptive, detailed, and creative, suitable for a high-quality AI image generator (like Imagen 3 or Midjourney). Maintain the original core subject but add sensory details, lighting, and style keywords. Output ONLY the enhanced prompt, no conversational text.

Original Prompt: "${prompt}"`;
    }

    let text: string;

    if (provider === "google") {
      text = await generateWithGoogle(finalPrompt, model, temperature, maxTokens, images, requestId, geminiApiKey);
    } else if (provider === "openai") {
      text = await generateWithOpenAI(finalPrompt, model, temperature, maxTokens, images, requestId, openaiApiKey);
    } else {
      logger.warn('api.llm', 'Unknown provider requested', { requestId, provider });
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: `Unknown provider: ${provider}` },
        { status: 400 }
      );
    }

    logger.info('api.llm', 'LLM generation successful', {
      requestId,
      responseLength: text.length,
    });

    return NextResponse.json<LLMGenerateResponse>({
      success: true,
      text,
    });
  } catch (error) {
    logger.error('api.error', 'LLM generation error', { requestId }, error instanceof Error ? error : undefined);

    // Handle rate limiting
    if (error instanceof Error && error.message.includes("429")) {
      return NextResponse.json<LLMGenerateResponse>(
        { success: false, error: "Rate limit reached. Please wait and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json<LLMGenerateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "LLM generation failed",
      },
      { status: 500 }
    );
  }
}
