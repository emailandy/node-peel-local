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
        id="video"
        style={{ top: "50%" }}
        className="w-3 h-3 bg-blue-500"
      />

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
        {nodeData.inputVideo && (
          <div className="relative h-16 bg-black rounded overflow-hidden opacity-50 hover:opacity-100 transition-opacity">
            <video src={nodeData.inputVideo} className="w-full h-full object-contain" />
          </div>
        )}

        <div className="h-px bg-neutral-800 my-1" />

        {/* Settings Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center text-[10px] text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <span className="mr-1">{showSettings ? "▼" : "▶"}</span> Settings
        </button>

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
        className="w-3 h-3 bg-blue-500"
      />
    </BaseNode>
  );
}
