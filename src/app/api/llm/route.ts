import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { LLMGenerateRequest, LLMGenerateResponse, LLMModelType } from "@/types";
import { logger } from "@/utils/logger";

export const maxDuration = 60; // 1 minute timeout

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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

import fs from 'fs';
import path from 'path';

// Helper to resolve image to base64
async function fetchImageAsBase64(imageUrl: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    // 1. Handle Data URLs
    const dataMatch = imageUrl.match(/^data:(.+?);base64,(.+)$/);
    if (dataMatch) {
      return { mimeType: dataMatch[1], data: dataMatch[2] };
    }

    // 2. Handle Local Files (starting with /)
    if (imageUrl.startsWith('/')) {
      // Prevent path traversal - strict public check
      const normalizedPath = path.normalize(imageUrl).replace(/^(\.\.(\/|\\|$))+/, '');
      const publicPath = path.join(process.cwd(), 'public', normalizedPath);

      if (fs.existsSync(publicPath)) {
        const buffer = await fs.promises.readFile(publicPath);
        const ext = path.extname(imageUrl).toLowerCase().replace('.', '');
        const mimeType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'webp' ? 'image/webp' : 'application/octet-stream';
        return { mimeType, data: buffer.toString('base64') };
      }
    }

    // 3. Handle Remote URLs
    if (imageUrl.startsWith('http')) {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = res.headers.get('content-type') || 'image/png';
      return { mimeType, data: buffer.toString('base64') };
    }

    return null;
  } catch (error) {
    logger.error('api.error', 'Failed to fetch image for LLM', { imageUrl }, error instanceof Error ? error : undefined);
    return null;
  }
}

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
    const processedImages = await Promise.all(images.map(async (img) => {
      const base64Data = await fetchImageAsBase64(img);
      return base64Data ? { inlineData: base64Data } : null;
    }));

    // Filter out nulls
    const validImages = processedImages.filter((img): img is { inlineData: { mimeType: string; data: string } } => img !== null);

    contents = [
      ...validImages,
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
      maxTokens = 8192,
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
      finalPrompt = `You are an expert Prompt Engineer for the "Nano Banana Pro" AI image generator. Enhance the following user prompt to create a highly detailed and effective image generation description.

Use the following guides to ensure the prompt covers all necessary aspects:

### 1. Basic Nano Banana Pro Factors
Include these 6 core factors:
*   **Subject**: Who and what is in the image? (e.g., a bartender, a cat).
*   **Composition**: Camera movements, scene shots, framing (e.g., low angle shot, close-up, wide shot).
*   **Action**: What is happening? (e.g., working out, eating mortadella, timeline, diagram).
*   **Setting/Location**: Where is the scene? (e.g., roadside gym, kitchen in golden hour, futuristic cafe).
*   **Style**: The art type/look and feel (e.g., realistic, product shoot, oil painting, scribble or line art, film scene, group photo).
*   **Editing Instructions**: Specific directions for remixing/editing if applicable (e.g., replace the background, change interior decor).

### 2. Advanced Use Cases
Enhance further with these details where relevant:
*   **Aspect Ratio**: Canvas size hints (e.g., vertical diagram in 3:4, 1:1 square shot).
*   **Camera & Lighting**: Technical details (e.g., f/1.8, long shadows, natural daylight, muted warm tones).
*   **Text Rendering**: Specific text to render (in quotes) and typography style (e.g., bold, italic, display style).
*   **Factual Details**: Specific topics/scientific accuracy (e.g., specific coffee bean type, recipe steps).
*   **Reference Inputs**: If referenced, specify their role (character, style, environment).

Your goal: A comprehensive, artistically rich, and technically precise prompt that leverages these factors.
Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "character") {
      finalPrompt = `You are an expert Prompt Engineer specializing in Character Consistency and Photorealism.

**GOAL**: Refine the user's prompt to ensure the generated character is consistent with the provided REFERENCE IMAGE (if any) and maintains high fidelity.

**CRITICAL SYSTEM INSTRUCTIONS**:
1.  **Identity & Fidelity**: Keep the original person’s face unchanged and realistic. Preserve skin texture and pores. Maintain natural proportions and face geometry. Do not alter the background or camera angle unless specified in the prompt.
2.  **Eyes Refinement**: Sharpen the eyes with natural catchlights. Keep iris color hazel (or match the reference image). Avoid over-whitening the sclera. Do not add makeup or change eyelid shape unless specified.
3.  **Glasses Scenario (Conditional)**: Analyze the reference image. IF the subject wears glasses, ensure they are rendered as thin, semi-matte rectangular eyeglasses with subtle, realistic reflections (avoid glare covering pupils). IF NO glasses are present in the reference, DO NOT add them.
4.  **Hands Correction**: Show relaxed hands with five fingers per hand, natural joint bends, and no overlaps hiding fingers. Avoid extra or fused fingers.
5.  **Anti-softness**: Increase micro-contrast and fine detail on skin, hair, and fabric while avoiding plastic smoothing and sharpening halos.

**Task**:
Rewrite the user's prompt to incorporate these constraints naturally. Ensure the subject description aligns with the reference image (if provided).
Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "avatar") {
      finalPrompt = `You are an expert Avatar Photographer and Art Director. Enhance the following user prompt to create a highly detailed, photorealistic lifestyle portrait description.

**CRITICAL INSTRUCTION: IMAGE ANALYSIS**
If an image is provided with this request, you MUST analyze it deeply. Extract and describe:
1.  **Physical Appearance**: Hair color/style, eye shape, facial features, skin tone.
2.  **Clothing & Accessories**: Detailed description of what they are wearing.
3.  **Pose & Expression**: Exact posture, head angle, hand placement, and facial expression.
4.  **Style & Vibe**: The aesthetic (e.g., candid, studio, vintage) to match.
Integrate these extracted details into the enhanced prompt to ensure the generated avatar looks like the reference.

Style Guideline & Example (Use this level of detail, tone, and structure):
"Create a photorealistic, realistic lifestyle portrait photograph... [rest of example omitted for brevity, stick to the previous style guide]"

Your goal: Combine the specific visual details from the REFERENCE IMAGE (if provided) with the user's text description, applied to the "organic candid social-media aesthetic".
Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "hair") {
      finalPrompt = `You are an expert Hair Stylist and Creative Director. Enhance the following user prompt to create a specific "Hair Style Collage" request.

**TEMPLATE TO FOLLOW**:
"A high-quality photo collage featuring the same person with identical facial features and expression, shown in multiple frames with different hairstyles. Each panel displays a unique hairstyle such as long straight hair, high ponytail, messy bun, pixie cut, braided crown, soft waves, short bob with bangs, low bun, side braid, and loose curls. Consistent neutral outfit and makeup across all images, soft studio lighting, warm blurred background, realistic skin texture, symmetrical face consistency, ultra-detailed, editorial beauty look, 4x3 grid layout, professional portrait photograph."

**INSTRUCTIONS**:
1.  Integrate the USER'S subject description (e.g., "redhead woman", "man with beard") into the "same person" part of the template.
2.  If the user specifies specific hairstyles, replace the example hairstyles with theirs.
3.  Maintain the strict Grid Collage structure and "identical facial features" requirement.

Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "portrait") {
      finalPrompt = `You are an expert Portrait Photographer. Enhance the following user prompt to create a specific "High Fidelity Portrait" request.

**CRITICAL INSTRUCTION**:
Portraits are a core strength. Faces hold structure. Expressions feel natural. Skin tones are accurate.

**GUIDELINES**:
1.  **Describe**: Age, expression, and features.
2.  **Lighting**: Include lighting direction (side lit, backlit, soft natural light).
3.  **Camera**: Add lens info for depth (85mm, shallow depth of field).

**EXAMPLE**:
"Close up portrait of a young woman with freckles, warm smile, golden hour light from the left, shot on 50mm lens, natural skin texture, photorealistic"

**TEMPLATE TO FOLLOW**:
"A photorealistic close-up selfie portrait of a [SUBJECT] with [DETAILS]. [HE/SHE] features [FACIAL FEATURES]. [HE/SHE] is wearing [CLOTHING/ACCESSORIES]. The background is [BACKGROUND] with [LIGHTING] illuminating [HIS/HER] face from the [DIRECTION], highlighting skin texture and features."

Your goal: specific, high-resolution, professional portrait descriptions.
Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "storyboard") {
      finalPrompt = `You are an expert Film Director and Storyboard Artist. Enhance the following user prompt to create a comprehensive "Cinematic 3x3 Storyboard" request.

**DIRECTIVE**:
Generate a raw, cinematic 3x3 storyboard grid (9 panels) simulating film stills, following the user's subject and theme.

**TEMPLATE STRUCTURE (Strictly observe this breakdown)**:

"DIRECTIVE:
Generate a raw, cinematic 3x3 storyboard grid (9 panels) simulating film stills from [MOVIE GENRE/THEME] movie.

SUBJECTS:
SUBJECT A: [Main Character/Object description]
SUBJECT B: [Secondary Character/Object description]

SCENE & ATMOSPHERE:
Location: [Setting description]
Lighting: [Lighting style, e.g., neon, tungsten, natural]
Key Cinematography: [Lens type, film stock, texture details]

PANEL BREAKDOWN (Chronological Flow):
Panel 1 (Top-Left): [Establishing Shot] [Description]
Panel 2 (Top-Center): [Tracking Shot] [Description]
Panel 3 (Top-Right): [Interior/POV] [Description]
Panel 4 (Mid-Left): [Mid-Shot] [Description]
Panel 5 (Mid-Center): [Close-Up Detail] [Description]
Panel 6 (Mid-Right): [Portrait] [Description]
Panel 7 (Bottom-Left): [Wide Environmental Shot] [Description]
Panel 8 (Bottom-Center): [Action] [Description]
Panel 9 (Bottom-Right): [Closing Shot] [Description]

TECHNICAL SPECS:
Film Stock: [e.g., Kodak Vision3 500T]
Lenses: [e.g., Anamorphic primes]
Color Grade: [e.g., Deep cold blues, neon greens]
Negative Prompt: CGI, 3D render, smooth digital look, illustration, fake ice, studio lighting."

**INSTRUCTIONS**:
1.  Adapt the "Arctic Expedition" example structure to the USER'S prompt topic.
2.  If the user's prompt is simple (e.g., "A cybersamurai in tokyo"), invent a compelling 9-panel narrative sequence for it.
3.  Ensure the "3x3 unique panels" composition is clearly described.

Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "storyboard_2x2") {
      finalPrompt = `You are an expert Film Director and Storyboard Artist. Enhance the following user prompt to create a comprehensive "Cinematic 2x2 Storyboard" request.

**TEMPLATE TO FOLLOW**:
"[Style], a 2x2 storyboard grid showing the sequence of [Scene/Action].
Frame 1 (Top-Left): [Describe setting and initial action]
Frame 2 (Top-Right): [Describe second action/interaction]
Frame 3 (Bottom-Left): [Describe climax or change]
Frame 4 (Bottom-Right): [Describe resolution or final shot]
Details: Consistent character design, [Lighting/Mood], solid white borders separating frames, [Color Palette], 4k, high detail."

**CONCRETE EXAMPLES**:
*   *Action/Narrative*: "A 2x2 storyboard grid showing a bank heist scene. Frame 1: Cinematic wide shot of a robber in a suit approaching the bank. Frame 2: Close-up of hands cracking a safe. Frame 3: Medium shot of alarms flashing. Frame 4: Wide shot of the getaway car driving away. Style: Neo-noir, dramatic lighting, high contrast, sketch and watercolor, solid black borders."
*   *Character/Animation*: "A 2x2 comic-style storyboard grid showing a cat trying to catch a fish. Frame 1: Cat looking at a fishbowl. Frame 2: Cat jumping. Frame 3: Cat falling into the water. Frame 4: Wet cat looking grumpy. Style: Pixar 3D style, vibrant colors, clean white borders, consistent character design."

**KEY ELEMENTS**:
1.  **Layout**: "2x2 grid" or "four-frame storyboard".
2.  **Consistency**: Explicitly mention "consistent character design" or "identical background".
3.  **Separation**: "Solid white borders" or "black borders" to define the structure.

Your goal: specific, high-resolution, professional 4-panel storyboard descriptions.
Output ONLY the enhanced prompt.

Original Prompt: "${prompt}"`;
    } else if (enhancementType === "image_to_storyboard") {
      finalPrompt = `You are an expert Film Director and Storyboard Artist. Enhance the following user prompt (or simply use the provided image as source) to create a comprehensive "Cinematic Contact Sheet" request.

**INSTRUCTION**:
Analyze the entire composition of the input image. Identify ALL key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship/interaction.
Generate a cohesive 3x3 grid "Cinematic Contact Sheet" featuring 9 distinct camera shots of exactly these subjects in the same environment.
You must adapt the standard cinematic shot types to fit the content (e.g., if a group, keep the group together; if an object, frame the whole object):

**Row 1 (Establishing Context):**
1.  **Extreme Long Shot (ELS):** The subject(s) are seen small within the vast environment.
2.  **Long Shot (LS):** The complete subject(s) or group is visible from top to bottom (head to toe / wheels to roof).
3.  **Medium Long Shot (American/3-4):** Framed from knees up (for people) or a 3/4 view (for objects).

**Row 2 (The Core Coverage):**
4.  **Medium Shot (MS):** Framed from the waist up (or the central core of the object). Focus on interaction/action.
5.  **Medium Close-Up (MCU):** Framed from chest up. Intimate framing of the main subject(s).
6.  **Close-Up (CU):** Tight framing on the face(s) or the "front" of the object.

**Row 3 (Details & Angles):**
7.  **Extreme Close-Up (ECU):** Macro detail focusing intensely on a key feature (eyes, hands, logo, texture).
8.  **Low Angle Shot (Worm's Eye):** Looking up at the subject(s) from the ground (imposing/heroic).
9.  **High Angle Shot (Bird's Eye):** Looking down on the subject(s) from above.

Ensure strict consistency: The same people/objects, same clothes, and same lighting across all 9 panels. The depth of field should shift realistically (bokeh in close-ups).

A professional 3x3 cinematic storyboard grid containing 9 panels.
The grid showcases the specific subjects/scene from the input image in a comprehensive range of focal lengths.
**Top Row:** Wide environmental shot, Full view, 3/4 cut.
**Middle Row:** Waist-up view, Chest-up view, Face/Front close-up.
**Bottom Row:** Macro detail, Low Angle, High Angle.
All frames feature photorealistic textures, consistent cinematic color grading, and correct framing for the specific number of subjects or objects analyzed. **Technical Specifications:** Photorealistic textures, anamorphic lens flares, consistent warm cinematic color grading, 8k resolution, and realistic shallow depth of field in the close-up panels.  Negative Prompt: CGI, 3D render, smooth digital look, illustration, fake ice, studio lighting, clean car, modern clothes, plastic textures.

**Output ONLY the enhanced prompt.**

Original Prompt (if any): "${prompt}"`;
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
