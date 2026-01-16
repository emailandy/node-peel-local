import { Node, Edge } from "@xyflow/react";

// Node Types
export type NodeType =
  | "imageInput"
  | "annotation"
  | "prompt"
  | "nanoBanana"
  | "llmGenerate"
  | "splitGrid"
  | "video"
  | "output"
  | "aiCritic"
  | "variant"
  | "generateVideo"
  | "videoStitch";

// Aspect Ratios (supported by both Nano Banana and Nano Banana Pro)
export type AspectRatio = "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "4:5" | "5:4" | "9:16" | "16:9" | "21:9";

// Resolution Options (only supported by Nano Banana Pro)
export type Resolution = "1K" | "2K" | "4K";

// Image Generation Model Options
export type ModelType = "nano-banana" | "nano-banana-pro";

// Video Generation Model Options
export type VideoModelType =
  | "veo-3.1-generate-preview"
  | "veo-3.1-fast-generate-preview"
  | "veo-3.0-generate-001"
  | "veo-3.0-fast-generate-001";

// LLM Provider Options
export type LLMProvider = "google" | "openai";

// LLM Model Options
export type LLMModelType =
  | "gemini-2.5-flash"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-preview"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano";

// Node Status
export type NodeStatus = "idle" | "loading" | "complete" | "error";

// Base node data - using Record to satisfy React Flow's type constraints
export interface BaseNodeData extends Record<string, unknown> {
  label?: string;
  customTitle?: string;
  comment?: string;
}

// Image Input Node Data
export interface ImageInputNodeData extends BaseNodeData {
  image: string | null;
  imageRef?: string;  // External image reference for storage optimization
  filename: string | null;
  dimensions: { width: number; height: number } | null;
}

// Annotation Shape Types
export type ShapeType = "rectangle" | "circle" | "arrow" | "freehand" | "text";

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
}

export interface RectangleShape extends BaseShape {
  type: "rectangle";
  width: number;
  height: number;
  fill: string | null;
}

export interface CircleShape extends BaseShape {
  type: "circle";
  radiusX: number;
  radiusY: number;
  fill: string | null;
}

export interface ArrowShape extends BaseShape {
  type: "arrow";
  points: number[];
}

export interface FreehandShape extends BaseShape {
  type: "freehand";
  points: number[];
}

export interface TextShape extends BaseShape {
  type: "text";
  text: string;
  fontSize: number;
  fill: string;
}

export type AnnotationShape =
  | RectangleShape
  | CircleShape
  | ArrowShape
  | FreehandShape
  | TextShape;

// Annotation Node Data
export interface AnnotationNodeData extends BaseNodeData {
  sourceImage: string | null;
  sourceImageRef?: string;  // External image reference for storage optimization
  annotations: AnnotationShape[];
  outputImage: string | null;
  outputImageRef?: string;  // External image reference for storage optimization
}

// Prompt Node Data
export interface PromptNodeData extends BaseNodeData {
  prompt: string;
}

// Image History Item (for tracking generated images)
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
  image?: string; // Optional base64 data for unsaved/cached images
  timestamp: number;
  prompt: string;
  aspectRatio: AspectRatio;
  model: ModelType;
}

// Provider Type
export type ProviderType = "replicate" | "fal";

// Selected Model for multi-provider support
export interface SelectedModel {
  provider: ProviderType | "gemini";
  modelId: string;
  displayName?: string;
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
  useGoogleSearch: boolean; // Only available for Nano Banana Pro
  status: NodeStatus;
  error: string | null;
  imageHistory: CarouselImageItem[]; // Carousel history (IDs only)
  selectedHistoryIndex: number; // Currently selected image in carousel
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
  variantMode: "demographics" | "style"; // Mode selection
  ethnicities: string[]; // Selected options (Demographics mode)
  genders: string[]; // Selected options (Demographics mode)
  styles: string[]; // Selected options (Style mode)
  variantCount: number; // Number of images to generate (1-4)
  ratio: AspectRatio;
  gridSize: "1x1" | "2x2" | "3x3";
  quality: "draft" | "high";
  status: NodeStatus;
  error: string | null;
  results: Array<{ id: string; image: string; label: string }>; // label = "South Asian Male" or "Cyberpunk"
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
  | LLMGenerateNodeData
  | SplitGridNodeData
  | VideoNodeData
  | OutputNodeData
  | AICriticNodeData
  | VariantNodeData
  | VideoStitchNodeData
  | GenerateVideoNodeData;

// Workflow Node with typed data (extended with optional groupId)
export type WorkflowNode = Node<WorkflowNodeData, NodeType> & {
  groupId?: string;
};

// Workflow Edge Data
export interface WorkflowEdgeData extends Record<string, unknown> {
  hasPause?: boolean;
}

// Workflow Edge
export type WorkflowEdge = Edge<WorkflowEdgeData>;

// Handle Types for connections
export type HandleType = "image" | "text";

// API Request/Response types for Image Generation
export interface GenerateRequest {
  images: string[]; // Now supports multiple images
  prompt: string;
  aspectRatio?: AspectRatio;
  resolution?: Resolution; // Only for Nano Banana Pro
  model?: ModelType;
  useGoogleSearch?: boolean; // Only for Nano Banana Pro
  numberOfImages?: number;
}

export interface GenerateResponse {
  success: boolean;
  image?: string; // Primary/First image for compatibility
  images?: string[]; // All generated images
  error?: string;
}

// API Request/Response types for LLM Text Generation
export interface LLMGenerateRequest {
  prompt: string;
  images?: string[];
  provider: LLMProvider;
  model: LLMModelType;
  temperature?: number;
  maxTokens?: number;
  enhancementType?: "image" | "video" | "branding" | "product" | "editing" | "logic" | "content";
}

export interface LLMGenerateResponse {
  success: boolean;
  text?: string;
  error?: string;
}

// Tool Types for annotation
export type ToolType = "select" | "rectangle" | "circle" | "arrow" | "freehand" | "text";

// Tool Options
export interface ToolOptions {
  strokeColor: string;
  strokeWidth: number;
  fillColor: string | null;
  fontSize: number;
  opacity: number;
}

// Auto-save configuration stored in localStorage
export interface WorkflowSaveConfig {
  workflowId: string;
  name: string;
  directoryPath: string;
  generationsPath: string | null;
  lastSavedAt: number | null;
}

// Cost tracking data stored per-workflow in localStorage
export interface WorkflowCostData {
  workflowId: string;
  incurredCost: number;
  lastUpdated: number;
}

// Group background color options (dark mode tints)
export type GroupColor =
  | "neutral"
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red";

// Group definition stored in workflow
export interface NodeGroup {
  id: string;
  name: string;
  color: GroupColor;
  position: { x: number; y: number };
  size: { width: number; height: number };
  locked?: boolean;
}
