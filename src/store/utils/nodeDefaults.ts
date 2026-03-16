import {
  NodeType,
  ImageInputNodeData,
  AnnotationNodeData,
  PromptNodeData,
  NanoBananaNodeData,
  GenerateVideoNodeData,
  LLMGenerateNodeData,
  SplitGridNodeData,
  OutputNodeData,
  WorkflowNodeData,
  GroupColor,
  SelectedModel,
  VideoNodeData,
  AICriticNodeData,
  VariantNodeData,
  VideoStitchNodeData,
  AudioNodeData,
} from "@/types";
import { loadGenerateImageDefaults } from "./localStorage";

/**
 * Default dimensions for each node type.
 * Used in addNode and createGroup for consistent sizing.
 */
export const defaultNodeDimensions: Record<NodeType, { width: number; height: number }> = {
  imageInput: { width: 300, height: 280 },
  annotation: { width: 300, height: 280 },
  prompt: { width: 320, height: 220 },
  nanoBanana: { width: 300, height: 300 },
  generateVideo: { width: 300, height: 300 },
  llmGenerate: { width: 320, height: 360 },
  splitGrid: { width: 300, height: 320 },
  output: { width: 320, height: 320 },
  video: { width: 320, height: 340 },
  aiCritic: { width: 300, height: 350 },
  variant: { width: 300, height: 600 },
  videoStitch: { width: 300, height: 400 },
  audio: { width: 300, height: 280 },
};

/**
 * Group color palette (dark mode tints).
 */
export const GROUP_COLORS: Record<GroupColor, string> = {
  neutral: "#262626",
  blue: "#1e3a5f",
  green: "#1a3d2e",
  purple: "#2d2458",
  orange: "#3d2a1a",
  red: "#3d1a1a",
};

/**
 * Order in which group colors are assigned.
 */
export const GROUP_COLOR_ORDER: GroupColor[] = [
  "neutral", "blue", "green", "purple", "orange", "red"
];

/**
 * Creates default data for a node based on its type.
 */
export const createDefaultNodeData = (type: NodeType): WorkflowNodeData => {
  switch (type) {
    case "imageInput":
      return {
        image: null,
        filename: null,
        dimensions: null,
      } as ImageInputNodeData;
    case "annotation":
      return {
        sourceImage: null,
        annotations: [],
        outputImage: null,
      } as AnnotationNodeData;
    case "prompt":
      return {
        prompt: "",
      } as PromptNodeData;
    case "nanoBanana": {
      const defaults = loadGenerateImageDefaults();
      const modelDisplayName = defaults.model === "nano-banana" ? "Nano Banana" : "Nano Banana Pro";
      const defaultSelectedModel: SelectedModel = {
        provider: "gemini",
        modelId: defaults.model,
        displayName: modelDisplayName,
      };
      return {
        inputImages: [],
        inputPrompt: null,
        outputImage: null,
        aspectRatio: defaults.aspectRatio,
        resolution: defaults.resolution,
        model: defaults.model,
        selectedModel: defaultSelectedModel,
        useGoogleSearch: defaults.useGoogleSearch,
        status: "idle",
        error: null,
        imageHistory: [],
        selectedHistoryIndex: 0,
      } as NanoBananaNodeData;
    }
    case "generateVideo":
      return {
        inputImages: [],
        inputPrompt: null,
        outputVideo: null,
        selectedModel: undefined,
        status: "idle",
        error: null,
        videoHistory: [],
        selectedVideoHistoryIndex: 0,
      } as GenerateVideoNodeData;
    case "llmGenerate":
      return {
        inputPrompt: null,
        inputImages: [],
        outputText: null,
        provider: "google",
        model: "gemini-3-flash-preview",
        temperature: 0.7,
        maxTokens: 8192,
        status: "idle",
        error: null,
      } as LLMGenerateNodeData;
    case "splitGrid":
      return {
        sourceImage: null,
        targetCount: 6,
        defaultPrompt: "",
        generateSettings: {
          aspectRatio: "1:1",
          resolution: "1K",
          model: "nano-banana-pro",
          useGoogleSearch: false,
        },
        childNodeIds: [],
        gridRows: 2,
        gridCols: 3,
        isConfigured: false,
        status: "idle",
        error: null,
      } as SplitGridNodeData;
    case "output":
      return {
        image: null,
      } as OutputNodeData;
    case "video":
      return {
        inputPrompt: null,
        inputImages: [],
        outputVideo: null,
        model: "veo-3.1-generate-preview",
        aspectRatio: "16:9",
        resolution: "720p",
        duration: "6",
        cameraMovement: "none",
        status: "idle",
        error: null,
      } as VideoNodeData;
    case "aiCritic":
      return {
        inputVideo: null,
        inputPrompt: null,
        criteria: "",
        score: null,
        reasoning: null,
        passed: null,
        autoDelete: false,
        status: "idle",
        error: null,
      } as AICriticNodeData;
    case "variant":
      return {
        inputImage: null,
        inputPrompt: null,
        variantMode: "demographics",
        ethnicities: [],
        genders: [],
        styles: [],
        perspectives: [],
        variantCount: 1,
        ratio: "1:1",
        gridSize: "2x2",
        quality: "draft",
        status: "idle",
        error: null,
        results: [],
      } as VariantNodeData;
    case "videoStitch":
      return {
        inputVideos: [],
        outputVideo: null,
        status: "idle",
        error: null,
      } as VideoStitchNodeData;
    case "audio":
      return {
        audio: null,
        filename: null,
        status: "idle",
        error: null,
        inputPrompt: "",
      } as AudioNodeData;
  }
};
