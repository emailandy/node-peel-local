import { ProviderModel } from "./providers/types";

export const STATIC_MODELS: ProviderModel[] = [
  // Gemini Models
  {
    id: "nano-banana",
    name: "Nano Banana",
    description: "Fast image generation with Gemini 2.5 Flash. Supports text-to-image and image-to-image with aspect ratio control.",
    provider: "gemini",
    capabilities: ["text-to-image", "image-to-image"],
  },
  {
    id: "nano-banana-pro",
    name: "Nano Banana Pro",
    description: "High-quality image generation with Gemini 3 Pro. Supports text-to-image, image-to-image, resolution control (1K/2K/4K), and Google Search grounding.",
    provider: "gemini",
    capabilities: ["text-to-image", "image-to-image"],
  },
  {
    id: "veo-3.1-generate-preview",
    name: "Veo 3.1 (Preview)",
    description: "Latest generation video model from Google DeepMind. Creates high-quality, 1080p video clips.",
    provider: "gemini",
    capabilities: ["text-to-video", "image-to-video"],
  },
  {
    id: "veo-3.1-fast-generate-preview",
    name: "Veo 3.1 Fast (Preview)",
    description: "Faster, lower latency video generation for quick iteration.",
    provider: "gemini",
    capabilities: ["text-to-video", "image-to-video"],
  },
  {
    id: "veo-3.0-generate-001",
    name: "Veo 3.0",
    description: "Previous generation Veo model.",
    provider: "gemini",
    capabilities: ["text-to-video", "image-to-video"],
  },

  // Replicate Models (Popular)
  {
    id: "stability-ai/sdxl",
    name: "SDXL",
    description: "A text-to-image generative AI model that creates beautiful images.",
    provider: "replicate",
    capabilities: ["text-to-image", "image-to-image"],
    coverImage: "https://replicate.delivery/pbxt/Lz4Zp7Q1X60qP0000000000000000000000000000000000000/out-0.png"
  },
  {
    id: "black-forest-labs/flux-schnell",
    name: "Flux Schnell",
    description: "Fastest version of Flux.1, a 12 billion parameter rectified flow transformer.",
    provider: "replicate",
    capabilities: ["text-to-image"],
    coverImage: "https://replicate.delivery/yhqm/A818X20000000000000000000000000000000000000000000/out-0.png"
  },
  {
    id: "black-forest-labs/flux-pro",
    name: "Flux Pro",
    description: "State-of-the-art image generation model with top-tier prompt adherence.",
    provider: "replicate",
    capabilities: ["text-to-image"],
  },
  
  // Fal.ai Models (Popular)
  {
    id: "fal-ai/flux/schnell",
    name: "Flux Schnell",
    description: "Fastest version of Flux.1 on fal.ai.",
    provider: "fal",
    capabilities: ["text-to-image"],
  },
  {
    id: "fal-ai/flux/dev",
    name: "Flux Dev",
    description: "Development version of Flux.1 on fal.ai.",
    provider: "fal",
    capabilities: ["text-to-image"],
  },
  {
    id: "fal-ai/flux-pro/v1.1",
    name: "Flux Pro 1.1",
    description: "Latest professional version of Flux.",
    provider: "fal",
    capabilities: ["text-to-image"],
  },
  {
    id: "fal-ai/kling-video/v1.6/pro/text-to-video",
    name: "Kling 1.6 Pro",
    description: "High quality text-to-video generation.",
    provider: "fal",
    capabilities: ["text-to-video"],
  },
  {
    id: "fal-ai/luma-dream-machine",
    name: "Luma Dream Machine",
    description: "High quality video generation from Luma AI.",
    provider: "fal",
    capabilities: ["text-to-video", "image-to-video"],
  }
];
