"use client";

import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { AICriticNodeData } from "@/types";
import { useState, useEffect, useCallback } from "react";

// Sample evaluation criteria presets
const PRESETS = [
  { label: "Photorealism", text: "Ensure the image looks indistinguishable from a real photograph, with realistic lighting, textures, and details." },
  { label: "Prompt Adherence", text: "Verify that all elements mentioned in the prompt are present and correctly depicted in the image." },
  { label: "Visual Quality", text: "Check for high resolution, sharp focus, proper exposure, and absence of artifacts, blurring, or distortions." },
  { label: "Safety", text: "Ensure the image is safe for all audiences, free from NSFW content, violence, or offensive imagery." },
  { label: "Anatomical Correctness", text: "Check for correct anatomical proportions, especially hands, fingers, and facial features." },
  { label: "Artistic Style", text: "Confirm the image matches the requested artistic style (e.g., oil painting, pixel art, cyberpunk)." },
];

type AICriticNodeType = Node<AICriticNodeData, "aiCritic">;

export function AICriticNode({ id, data, selected }: NodeProps<AICriticNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [showSettings, setShowSettings] = useState(false);

  // Status Color Logic
  const getStatusColor = () => {
    if (nodeData.status === "loading") return "border-blue-500 shadow-blue-500/50";
    if (nodeData.status === "error") return "border-red-500 shadow-red-500/50";
    if (nodeData.status === "complete") {
      return nodeData.passed ? "border-green-500 shadow-green-500/50" : "border-red-600 shadow-red-600/50";
    }
    return "border-neutral-800";
  };

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { criteria: e.target.value });
    },
    [id, updateNodeData]
  );

  const handlePresetClick = useCallback((text: string) => {
    const current = nodeData.criteria || "";
    const separator = current.length > 0 && !current.endsWith("\n") ? "\n" : "";
    updateNodeData(id, { criteria: current + separator + text });
  }, [id, nodeData.criteria, updateNodeData]);

  return (
    <BaseNode
      id={id}
      title="AI Critic Guardrail"
      customTitle={nodeData.customTitle}
      comment={nodeData.comment}
      onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
      onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
      selected={selected}
      className={`min-w-[280px] transition-all duration-300 border-2 ${getStatusColor()}`}
    >
      {/* Inputs */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: "30%" }}
        className="w-3 h-3 bg-blue-500"
      />
      {/* Image Label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none text-right"
        style={{
          right: `calc(100% + 8px)`,
          top: "calc(30% - 7px)",
          color: "var(--handle-color-image)",
        }}
      >
        Image
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="video"
        style={{ top: "50%" }}
        className="w-3 h-3 bg-blue-500"
      />
      {/* Video Label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none text-right"
        style={{
          right: `calc(100% + 8px)`,
          top: "calc(50% - 7px)",
          color: "var(--handle-color-video)",
        }}
      >
        Video
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="text"
        style={{ top: "70%" }}
        className="w-3 h-3 bg-blue-500"
      />
      {/* Prompt Label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none text-right"
        style={{
          right: `calc(100% + 8px)`,
          top: "calc(70% - 7px)",
          color: "var(--handle-color-text)",
        }}
      >
        Prompt
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-3 p-1">

        {/* Result Visualization */}
        {nodeData.status === "complete" && nodeData.score !== null && (
          <div className={`flex items-center gap-3 p-2 rounded-lg border ${nodeData.passed ? "bg-green-900/20 border-green-800" : "bg-red-900/20 border-red-800"}`}>
            {/* Traffic Light */}
            <div className={`w-8 h-8 rounded-full shadow-inner flex items-center justify-center ${nodeData.passed ? "bg-green-500 shadow-green-400/50" : "bg-red-600 shadow-red-500/50"}`}>
              <span className="text-white font-bold text-sm">{nodeData.score}</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className={`text-xs font-bold ${nodeData.passed ? "text-green-400" : "text-red-400"}`}>
                {nodeData.passed ? "PASSED" : "FAILED"}
              </div>
              <div className="text-[10px] text-neutral-300 leading-tight line-clamp-3">
                {nodeData.reasoning}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {nodeData.status === "loading" && (
          <div className="flex items-center justify-center py-4 bg-neutral-900/30 rounded">
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-xs text-neutral-400">Judging...</span>
          </div>
        )}

        {/* Error State */}
        {nodeData.status === "error" && (
          <div className="p-2 bg-red-900/20 border border-red-800 rounded text-[10px] text-red-300">
            {nodeData.error}
          </div>
        )}

        {/* Video Preview (Mini) */}
        {/* Media Preview (Mini) */}
        {(nodeData.inputVideo || nodeData.inputImage) && (
          <div className="relative h-16 bg-black rounded overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
            {nodeData.inputVideo ? (
              <video src={nodeData.inputVideo} className="w-full h-full object-contain" />
            ) : (
              <img src={nodeData.inputImage!} className="w-full h-full object-contain" alt="Input" />
            )}
          </div>
        )}

        <div className="h-px bg-neutral-800 my-1" />

        {/* Controls */}
        <div className="flex items-center justify-between mt-1">
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <span className="mr-1">{showSettings ? "▼" : "▶"}</span> Settings
          </button>

          {/* Run Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const state = useWorkflowStore.getState();
              if (!state.isRunning) {
                state.regenerateNode(id);
              }
            }}
            disabled={nodeData.status === "loading"}
            className={`p-1 rounded-full transition-all ${nodeData.status === "loading"
                ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/50"
              }`}
            title="Run Critic"
          >
            {nodeData.status === "loading" ? (
              <div className="w-3 h-3 border-2 border-neutral-600 border-t-neutral-400 rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>

        {showSettings && (
          <div className="flex flex-col gap-2 mt-1 animate-in slide-in-from-top-2 fade-in duration-200">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-neutral-400">Evaluation Criteria</label>
              <textarea
                value={nodeData.criteria || ""}
                onChange={handleChange}
                className="w-full h-20 bg-neutral-900 border border-neutral-800 rounded p-2 text-[10px] text-neutral-300 resize-none focus:outline-none focus:border-neutral-600"
                placeholder="Define what 'Good' looks like..."
              />
              {/* Presets Chips */}
              <div className="flex flex-wrap gap-1.5 mt-1">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset.text)}
                    className="px-2 py-1 text-[9px] bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 rounded transition-colors"
                    title={preset.text}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-2 bg-neutral-900/50 rounded border border-neutral-800">
              <span className="text-[10px] text-neutral-400">Auto-Delete Fails</span>
              <button
                onClick={() => updateNodeData(id, { autoDelete: !nodeData.autoDelete })}
                className={`w-8 h-4 rounded-full relative transition-colors ${nodeData.autoDelete ? "bg-blue-600" : "bg-neutral-700"}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${nodeData.autoDelete ? "left-4.5" : "left-0.5"}`} style={{ left: nodeData.autoDelete ? "calc(100% - 14px)" : "2px" }} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="video"
        style={{ top: "50%" }}
        className="w-3 h-3 bg-blue-500"
      />
      {/* Output Label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none"
        style={{
          left: `calc(100% + 8px)`,
          top: "calc(50% - 7px)",
          color: "var(--handle-color-video)",
        }}
      >
        Video
      </div>
    </BaseNode>
  );
}
