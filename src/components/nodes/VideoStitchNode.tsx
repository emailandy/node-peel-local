"use client";

import { useCallback } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { VideoStitchNodeData } from "@/types";

type VideoStitchNodeType = Node<VideoStitchNodeData, "videoStitch">;

export function VideoStitchNode({ id, data, selected }: NodeProps<VideoStitchNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  
  const regenerateNode = useWorkflowStore((state) => state.regenerateNode);

  const handleRun = useCallback(() => {
    regenerateNode(id);
  }, [id, regenerateNode]);

  const handleClear = useCallback(() => {
    updateNodeData(id, { outputVideo: null, status: "idle", error: null });
  }, [id, updateNodeData]);

  return (
    <BaseNode
      id={id}
      title="Video Stitcher"
      customTitle={nodeData.customTitle}
      comment={nodeData.comment}
      onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
      onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
      onRun={handleRun}
      selected={selected}
      isExecuting={isRunning}
      hasError={nodeData.status === "error"}
    >
      {/* Inputs: 4 Video slots */}
      <div className="absolute left-0 top-16 bottom-0 flex flex-col justify-evenly py-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={`input-${index}`} className="relative group">
            <Handle
              type="target"
              position={Position.Left}
              id={`video${index + 1}`}
              data-handletype="image" // Use 'image' type for compatibility if 'video' isn't standard
              className="!w-3 !h-3 !-ml-1.5 hover:!w-4 hover:!h-4 transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              Video {index + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Audio Input */}
      <div className="absolute left-0 bottom-4">
        <div className="relative group">
          <Handle
            type="target"
            position={Position.Left}
            id="audio"
            data-handletype="audio"
            className="!w-3 !h-3 !-ml-1.5 hover:!w-4 hover:!h-4 transition-all !bg-purple-500"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Audio Input
          </span>
        </div>
      </div>

      {/* Output */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        data-handletype="image"
        className="!w-3 !h-3 !-mr-1.5 hover:!w-4 hover:!h-4 transition-all"
      />

      <div className="flex-1 flex flex-col min-h-0 gap-2 pl-4">
        {/* Helper Text */}
        <div className="text-[10px] text-neutral-400 mb-2">
          Connect up to 4 videos to stitch them together sequentially.
        </div>
        {/* Debug Info */}
        <div className="text-[10px] font-mono mb-2">
          <span className={nodeData.audio ? "text-green-500" : "text-neutral-600"}>
            Audio: {nodeData.audio ? `Present (${nodeData.audio.slice(0, 50)}... [${nodeData.audio.length} chars])` : "None"}
          </span>
        </div>

        {/* Output Preview */}
        {nodeData.outputVideo ? (
          <div className="relative w-full aspect-video bg-black rounded overflow-hidden group">
            <video
              src={nodeData.outputVideo}
              controls
              className="w-full h-full object-contain"
              loop
            />
            <button
              onClick={handleClear}
              className="absolute top-1 right-1 p-1 bg-neutral-900/80 rounded text-neutral-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Clear Result"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="w-full aspect-video border border-dashed border-neutral-700 rounded flex flex-col items-center justify-center text-neutral-500 gap-2">
            {nodeData.status === "loading" ? (
              <>
                <svg className="w-5 h-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-[10px]">Stitching...</span>
              </>
            ) : nodeData.status === "error" ? (
              <>
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[10px] text-red-400 px-2 text-center">{nodeData.error || "Failed to stitch"}</span>
              </>
            ) : (
              <span className="text-[10px]">Output Preview</span>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
