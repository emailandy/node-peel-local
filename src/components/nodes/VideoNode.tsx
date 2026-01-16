"use client";

import { useCallback } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { VideoNodeData, VideoModelType } from "@/types";

const MODELS: { value: VideoModelType; label: string }[] = [
  { value: "veo-3.1-generate-preview", label: "Veo 3.1 (Preview)" },
  { value: "veo-3.1-fast-generate-preview", label: "Veo 3.1 Fast (Preview)" },
  { value: "veo-3.0-generate-001", label: "Veo 3.0 (001)" },
  { value: "veo-3.0-fast-generate-001", label: "Veo 3.0 Fast (001)" },
];

const CAMERA_MOVEMENTS = [
  { value: "Pan Right", label: "Pan Right" },
  { value: "Pan Left", label: "Pan Left" },
  { value: "Micro Zoom", label: "Micro Zoom" },
  { value: "Point of View (POV)", label: "Point of View (POV)" },
  { value: "Dolly Zoom In", label: "Dolly Zoom In" },
  { value: "Dolly Zoom Out", label: "Dolly Zoom Out" },
  { value: "360° Rotation", label: "360° Rotation" },
  { value: "Tilt Up", label: "Tilt Up" },
  { value: "Tilt Down", label: "Tilt Down" },
  { value: "Push In", label: "Push In" },
  { value: "Pull Out", label: "Pull Out" },
  { value: "Zoom Out", label: "Zoom Out" },
  { value: "Zoom In", label: "Zoom In" },
  { value: "High Angle", label: "High Angle" },
  { value: "Low Angle", label: "Low Angle" },
  { value: "Truck Shot", label: "Truck Shot" },
];

type VideoNodeType = Node<VideoNodeData, "video">;

export function VideoNode({ id, data, selected }: NodeProps<VideoNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const regenerateNode = useWorkflowStore((state) => state.regenerateNode);

  const handleModelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const model = e.target.value as VideoModelType;
      updateNodeData(id, { model });
    },
    [id, updateNodeData]
  );

  const handleClearVideo = useCallback(() => {
    updateNodeData(id, { outputVideo: null, status: "idle", error: null });
  }, [id, updateNodeData]);

  const handleRegenerate = useCallback(() => {
    regenerateNode(id);
  }, [id, regenerateNode]);

  return (
    <BaseNode
      id={id}
      title="Generate Video"
      customTitle={nodeData.customTitle}
      comment={nodeData.comment}
      onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
      onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
      onRun={handleRegenerate}
      selected={selected}
      isExecuting={isRunning}
      hasError={nodeData.status === "error"}
    >
      {/* Image input - optional conditioning */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: "35%" }}
        data-handletype="image"
        isConnectable={true}
      />
      {/* Video input - for video extension */}
      <Handle
        type="target"
        position={Position.Left}
        id="video"
        style={{ top: "50%" }}
        data-handletype="video"
        isConnectable={true}
      />
      {/* Text input - single connection */}
      <Handle
        type="target"
        position={Position.Left}
        id="text"
        style={{ top: "65%" }}
        data-handletype="text"
      />
      {/* Video output - technically not connectable to image inputs, but maybe for future video nodes */}
      <Handle
        type="source"
        position={Position.Right}
        id="video"
        data-handletype="image" // Reusing 'image' type for now as 'video' handle type isn't standard yet in our edges
      />

      <div className="flex-1 flex flex-col min-h-0 gap-2">
        {/* Preview area */}
        {nodeData.outputVideo ? (
          <div className="relative w-full flex-1 min-h-0 bg-black rounded overflow-hidden">
            <video
              src={nodeData.outputVideo}
              controls
              className="w-full h-full object-contain"
              loop
            />
            {/* Loading overlay for generation */}
            {nodeData.status === "loading" && (
              <div className="absolute inset-0 bg-neutral-900/70 rounded flex items-center justify-center z-10">
                <svg
                  className="w-6 h-6 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            )}
            <div className="absolute top-1 right-1 z-20">
              <button
                onClick={handleClearVideo}
                className="w-5 h-5 bg-neutral-900/80 hover:bg-red-600/80 rounded flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                title="Clear video"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full flex-1 min-h-[112px] border border-dashed border-neutral-600 rounded flex flex-col items-center justify-center">
            {nodeData.status === "loading" ? (
              <svg
                className="w-4 h-4 animate-spin text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : nodeData.status === "error" ? (
              <span className="text-[10px] text-red-400 text-center px-2">
                {nodeData.error || "Failed"}
              </span>
            ) : (
              <span className="text-neutral-500 text-[10px]">
                Run to generate video
              </span>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="flex flex-col gap-2">
          <select
            value={nodeData.model}
            onChange={handleModelChange}
            className="w-full text-[10px] py-1 px-1.5 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300 shrink-0"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={nodeData.aspectRatio || "16:9"}
              onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value as any })}
              className="text-[10px] py-1 px-1.5 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
            </select>
            <select
              value={nodeData.resolution || "720p"}
              onChange={(e) => updateNodeData(id, { resolution: e.target.value as any })}
              className="text-[10px] py-1 px-1.5 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4k</option>
            </select>
          </div>

          <select
            value={nodeData.duration || "8"}
            onChange={(e) => updateNodeData(id, { duration: e.target.value as any })}
            className="text-[10px] py-1 px-1.5 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
          >
            <option value="6">6s</option>
            <option value="8">8s</option>
          </select>

          <select
            value={nodeData.cameraMovement || "none"}
            onChange={(e) => updateNodeData(id, { cameraMovement: e.target.value })}
            className="w-full text-[10px] py-1 px-1.5 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
          >
            <option value="none">No Camera Movement</option>
            {CAMERA_MOVEMENTS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>

          <textarea
            value={nodeData.negativePrompt || ""}
            onChange={(e) => updateNodeData(id, { negativePrompt: e.target.value })}
            placeholder="Negative prompt..."
            className="w-full text-[10px] py-1 px-2 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300 min-h-[40px] resize-none"
          />
        </div>
      </div>
    </BaseNode>
  );
}
