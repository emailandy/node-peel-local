"use client";

import { useCallback } from "react";
import { Handle, Position, NodeProps, Node, useHandleConnections } from "@xyflow/react";
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
  const handleConnections = useHandleConnections({ type: 'target', id: 'image' });

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
      className="w-80 min-h-[650px]"
      minHeight={650}
    >
      {/* Image input - for I2V or Conditioning */}
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: "20%" }}
        data-handletype="image"
      />
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none text-right"
        style={{
          right: `calc(100% + 8px)`,
          top: "calc(20% - 18px)",
          color: "var(--handle-color-image)",
        }}
      >
        Image
      </div>
      {/* Video input - for video extension */}
      <Handle
        type="target"
        position={Position.Left}
        id="video"
        style={{ top: "50%" }}
        data-handletype="video"
      />
      {/* Video label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none text-right"
        style={{
          right: `calc(100% + 8px)`,
          top: "calc(50% - 18px)",
          color: "var(--handle-color-video)",
        }}
      >
        Video
      </div>

      {/* Text input */}
      <Handle
        type="target"
        position={Position.Left}
        id="text"
        style={{ top: "65%" }}
      />
      {/* Text label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none text-right"
        style={{
          right: `calc(100% + 8px)`,
          top: "calc(65% - 18px)",
          color: "var(--handle-color-text)",
        }}
      >
        Prompt
      </div>

      {/* Video output */}
      <Handle
        type="source"
        position={Position.Right}
        id="video"
        data-handletype="image"
      />
      {/* Output label */}
      <div
        className="absolute text-[10px] font-medium whitespace-nowrap pointer-events-none"
        style={{
          left: `calc(100% + 8px)`,
          top: "calc(50% - 18px)",
          color: "var(--handle-color-image)",
        }}
      >
        Video
      </div>

      <div className="flex-1 flex flex-col min-h-0 gap-2">
        {/* Preview area */}
        {nodeData.outputVideo ? (
          <div className="relative w-full flex-1 min-h-0 bg-black rounded overflow-hidden group">
            <video
              key={nodeData.outputVideo}
              src={nodeData.outputVideo}
              controls
              autoPlay
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-contain"
              loop
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                const error = target.error;
                console.error("Video error details:", {
                  code: error?.code,
                  message: error?.message,
                  src: target.src
                });

                let errorMsg = "Unknown error";
                if (error?.code === 1) errorMsg = "Aborted";
                if (error?.code === 2) errorMsg = "Network Error (possibly 404 or CORS)";
                if (error?.code === 3) errorMsg = "Decode Error (corrupt or unsupported codec)";
                if (error?.code === 4) errorMsg = "Source Not Supported";

                useWorkflowStore.getState().updateNodeData(id, {
                  error: `Video playback error: ${errorMsg} (Code: ${error?.code})`
                });
              }}
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
            <div className="absolute top-1 right-1 z-20 flex gap-1">
              <a
                href={nodeData.outputVideo}
                download
                className="w-5 h-5 bg-neutral-900/80 hover:bg-neutral-700/80 rounded flex items-center justify-center text-neutral-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                title="Download video"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <button
                onClick={handleClearVideo}
                className="w-5 h-5 bg-neutral-900/80 hover:bg-red-600/80 rounded flex items-center justify-center text-neutral-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                title="Clear video"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {nodeData.error && nodeData.error.startsWith("Video playback error") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/80 text-red-400 text-xs text-center">
                <span>{nodeData.error}</span>
                <a
                  href={nodeData.outputVideo!}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 underline text-neutral-400 hover:text-white"
                >
                  Try direct link
                </a>
              </div>
            )}
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

          {/* Condition Images (First/Last Frame) */}
          {/* If connected, show status. Always optional expand for manual override checking (though ignored by backend if priority set) */}
          <div className="flex flex-col gap-2 border border-neutral-800 rounded p-2 bg-neutral-900/30">
            {handleConnections.length > 0 ? (
              <div className="text-[10px] text-green-400 flex items-center gap-1.5 pb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Using {handleConnections.length} connected image{handleConnections.length > 1 ? 's' : ''}
              </div>
            ) : (
              <div className="text-[10px] text-neutral-500 pb-1">
                No images connected
              </div>
            )}

            <details className="group/details">
              <summary className="text-[10px] text-neutral-400 cursor-pointer hover:text-neutral-300 select-none flex items-center gap-1 list-none">
                <svg className="w-3 h-3 transition-transform group-open/details:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Manual First/Last Frames</span>
              </summary>
              <div className="flex gap-2 pt-2 pl-2 border-l border-neutral-800 ml-1.5 mt-1">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[9px] text-neutral-500">First Frame</label>
                  {nodeData.firstFrameImage ? (
                    <div className="relative group w-full aspect-video bg-neutral-900 rounded border border-neutral-700 overflow-hidden">
                      <img src={nodeData.firstFrameImage} className="w-full h-full object-cover" alt="First frame" />
                      <button
                        onClick={() => updateNodeData(id, { firstFrameImage: null })}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-900/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full aspect-video border border-dashed border-neutral-700 rounded hover:bg-neutral-800/50 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) updateNodeData(id, { firstFrameImage: ev.target.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="text-[9px] text-neutral-500 text-center px-1">Upload Start</span>
                    </label>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[9px] text-neutral-500">Last Frame</label>
                  {nodeData.lastFrameImage ? (
                    <div className="relative group w-full aspect-video bg-neutral-900 rounded border border-neutral-700 overflow-hidden">
                      <img src={nodeData.lastFrameImage} className="w-full h-full object-cover" alt="Last frame" />
                      <button
                        onClick={() => updateNodeData(id, { lastFrameImage: null })}
                        className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-900/80 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center w-full aspect-video border border-dashed border-neutral-700 rounded hover:bg-neutral-800/50 cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              if (ev.target?.result) updateNodeData(id, { lastFrameImage: ev.target.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <span className="text-[9px] text-neutral-500 text-center px-1">Upload End</span>
                    </label>
                  )}
                </div>
              </div>
            </details>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={nodeData.aspectRatio || "16:9"}
              onChange={(e) => updateNodeData(id, { aspectRatio: e.target.value as any })}
              className="text-[10px] py-1 px-1.5 border border-neutral-700 rounded bg-neutral-900/50 focus:outline-none focus:ring-1 focus:ring-neutral-600 text-neutral-300"
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
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
            <option value="4">4s</option>
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

          {/* Reference type selector - REMOVED per user request */}

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
