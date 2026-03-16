/**
 * Node Types
 *
 * Types for workflow nodes including all node data interfaces,
 * handle types, and workflow node definitions.
 */

import { Node } from "@xyflow/react";
import type {
  AnnotationNodeData,
  AnnotationShape,
  BaseNodeData,
} from "./annotation";

// Re-export types from annotation for convenience
export type { AnnotationNodeData, BaseNodeData };

// Import from domain files to avoid circular dependencies
import type { AspectRatio, Resolution, ModelType, VideoModelType } from "./models";
import type { LLMProvider, LLMModelType, SelectedModel } from "./providers";

/**
 * All available node types in the workflow editor
 */
export type NodeType =
  | "imageInput"
  | "annotation"
  | "prompt"
  | "nanoBanana"
  | "generateVideo"
  | "llmGenerate"
  | "splitGrid"
  | "output"
  | "video"
  | "aiCritic"
  | "variant"
  | "videoStitch";

/**
 * Node execution status
 */
export type NodeStatus = "idle" | "loading" | "complete" | "error";

/**
 * Image input node - loads/uploads images into the workflow
 */
export interface ImageInputNodeData extends BaseNodeData {
  image: string | null;
  imageRef?: string; // External image reference for storage optimization
  filename: string | null;
  dimensions: { width: number; height: number } | null;
}

/**
 * Prompt node - text input for AI generation
 */
export interface PromptNodeData extends BaseNodeData {
  prompt: string;
}

/**
 * Image history item for tracking generated images
 */
export interface ImageHistoryItem {
  id: string;
  image: string;          // Base64 data URL
  timestamp: number;      // For display & sorting
  prompt: string;         // The prompt used
  aspectRatio: AspectRatio;
  model: ModelType;
}

// Carousel Image Item (for per-node history)
export interface CarouselImageItem {
  id: string;
  timestamp: number;
  prompt: string;
  aspectRatio: AspectRatio;
  model: ModelType;
}

// Carousel Video Item
export interface CarouselVideoItem {
  id: string;
  timestamp: number;
  prompt: string;
  model: string;
}

// Model input definition
export interface ModelInputDef {
  name: string;
  type: "image" | "text";
  required: boolean;
  label: string;
  description?: string;
}

// Nano Banana Node Data (Image Generation)
export interface NanoBananaNodeData extends BaseNodeData {
  inputImages: string[]; // Now supports multiple images
  inputImageRefs?: string[];  // External image references for storage optimization
  inputPrompt: string | null;
  outputImage: string | null;
  outputImageRef?: string;  // External image reference for storage optimization
  aspectRatio: AspectRatio;
  resolution: Resolution; // Only used by Nano Banana Pro
  model: ModelType;
  selectedModel?: SelectedModel;
  useGoogleSearch: boolean; // Only available for Nano Banana Pro
  parameters?: Record<string, unknown>;
  inputSchema?: ModelInputDef[];
  status: NodeStatus;
  error: string | null;
  imageHistory: CarouselImageItem[]; // Carousel history (IDs only)
  selectedHistoryIndex: number; // Currently selected image in carousel
}

// Generate Video node - AI video generation (Upstream)
export interface GenerateVideoNodeData extends BaseNodeData {
  inputImages: string[];
  inputImageRefs?: string[];
  inputPrompt: string | null;
  outputVideo: string | null;
  outputVideoRef?: string;
  selectedModel?: SelectedModel;
  parameters?: Record<string, unknown>;
  inputSchema?: ModelInputDef[];
  status: NodeStatus;
  error: string | null;
  videoHistory: CarouselVideoItem[];
  selectedVideoHistoryIndex: number;
}

// Video Node Data
export interface VideoNodeData extends BaseNodeData {
  inputPrompt: string | null;
  inputImages: string[]; // Optional image conditioning
  inputImageRefs?: string[];
  outputVideo: string | null; // URL or base64
  outputVideoRef?: string;
  model: VideoModelType;

  negativePrompt?: string;
  aspectRatio: "16:9" | "9:16";
  resolution: "720p" | "1080p" | "4k";
  duration: "4" | "6" | "8";
  personGeneration?: "allow_all" | "allow_adult" | "dont_allow";
  cameraMovement?: string;
  status: NodeStatus;
  error: string | null;
}

// LLM Generate Node Data (Text Generation)
export interface LLMGenerateNodeData extends BaseNodeData {
  inputPrompt: string | null;
  inputImages: string[];
  inputImageRefs?: string[];  // External image references for storage optimization
  outputText: string | null;
  provider: LLMProvider;
  model: LLMModelType;
  temperature: number;
  maxTokens: number;
  status: NodeStatus;
  error: string | null;
}

// Output Node Data
export interface OutputNodeData extends BaseNodeData {
  image: string | null;
  imageRef?: string;  // External image reference for storage optimization
  video?: string | null;
  contentType?: string;
}

// Split Grid Node Data (Utility Node)
export interface SplitGridNodeData extends BaseNodeData {
  sourceImage: string | null;
  sourceImageRef?: string;  // External image reference for storage optimization
  targetCount: number;  // 4, 6, 8, 9, or 10
  defaultPrompt: string;
  generateSettings: {
    aspectRatio: AspectRatio;
    resolution: Resolution;
    model: ModelType;
    useGoogleSearch: boolean;
  };
  childNodeIds: Array<{
    imageInput: string;
    prompt: string;
    nanoBanana: string;
  }>;
  gridRows: number;
  gridCols: number;
  isConfigured: boolean;
  status: NodeStatus;
  error: string | null;
}

// AI Critic Node Data (Guardrail)
export interface AICriticNodeData extends BaseNodeData {
  inputVideo: string | null; // URL or base64
  inputImage: string | null; // URL or base64
  inputPrompt: string | null;
  criteria: string;
  score: number | null;
  reasoning: string | null;
  passed: boolean | null;
  autoDelete: boolean;
  status: NodeStatus;
  error: string | null;
}

// Demographic Variant Generator Node Data
export interface VariantNodeData extends BaseNodeData {
  inputImage: string | null; // ControlNet/IP-Adapter input
  inputPrompt: string | null;
  variantMode: "demographics" | "style" | "reframe"; // Mode selection
  ethnicities: string[]; // Selected options (Demographics mode)
  genders: string[]; // Selected options (Demographics mode)
  styles: string[]; // Selected options (Style mode)
  perspectives: string[]; // Selected options (Reframe mode)
  variantCount: number; // Number of images to generate (1-4)
  ratio: AspectRatio;
  gridSize: "1x1" | "2x2" | "3x3";
  quality: "draft" | "high";
  status: NodeStatus;
  error: string | null;
  results: Array<{ id: string; image: string; label: string }>; // label = "South Asian Male" or "Cyberpunk"
}

// Video Stitch Node Data
export interface VideoStitchNodeData extends BaseNodeData {
  inputVideos: string[]; // URLs of connected videos
  outputVideo: string | null;
  status: NodeStatus;
  error: string | null;
}

// Union of all node data types
export type WorkflowNodeData =
  | ImageInputNodeData
  | AnnotationNodeData
  | PromptNodeData
  | NanoBananaNodeData
  | GenerateVideoNodeData
  | LLMGenerateNodeData
  | SplitGridNodeData
  | OutputNodeData
  | VideoNodeData
  | AICriticNodeData
  | VariantNodeData
  | VideoStitchNodeData;

/**
 * Workflow node with typed data (extended with optional groupId)
 */
export type WorkflowNode = Node<WorkflowNodeData, NodeType> & {
  groupId?: string;
};

/**
 * Handle types for node connections
 */
export type HandleType = "image" | "text";
