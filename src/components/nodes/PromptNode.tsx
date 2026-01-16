"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { PromptNodeData } from "@/types";
import { PromptEditorModal } from "@/components/modals/PromptEditorModal";

type PromptNodeType = Node<PromptNodeData, "prompt">;

// ... existing code ...

export function PromptNode({ id, data, selected }: NodeProps<PromptNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const incrementModalCount = useWorkflowStore((state) => state.incrementModalCount);
  const decrementModalCount = useWorkflowStore((state) => state.decrementModalCount);
  const [isModalOpenLocal, setIsModalOpenLocal] = useState(false);
  const [enhancerType, setEnhancerType] = useState<"image" | "video" | "branding" | "product" | "editing" | "logic" | "content">("image");
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleEnhance = useCallback(async () => {
    if (!nodeData.prompt) return;

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nodeData.prompt, // Send usage as raw prompt, API will wrap it
          enhancementType: enhancerType, // Pass valid type
          provider: "google",
          model: "gemini-3-flash-preview",
          maxTokens: 1000,
        }),
      });

      if (!response.ok) throw new Error("Failed to enhance prompt");

      const data = await response.json();
      if (data.success && data.text) {
        updateNodeData(id, { prompt: data.text.trim() });
      }
    } catch (error) {
      console.error("Enhance failed:", error);
      // Optional: Show error toast or visual indicator
    } finally {
      setIsEnhancing(false);
    }
  }, [id, nodeData.prompt, enhancerType, updateNodeData]);

  const handleOpenModal = useCallback(() => {
    setIsModalOpenLocal(true);
    incrementModalCount();
  }, [incrementModalCount]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpenLocal(false);
    decrementModalCount();
  }, [decrementModalCount]);

  const handleSubmitModal = useCallback(
    (prompt: string) => {
      updateNodeData(id, { prompt });
    },
    [id, updateNodeData]
  );

  return (
    <>
      <BaseNode
        id={id}
        title="Prompt"
        customTitle={nodeData.customTitle}
        comment={nodeData.comment}
        onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
        onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
        onExpand={handleOpenModal}
        selected={selected}
      >
        <div className="relative w-full h-full flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-2 px-1">
            <span className="text-[10px] text-neutral-400">Enhance for:</span>
            <select
              value={enhancerType}
              onChange={(e) => setEnhancerType(e.target.value as "image" | "video" | "branding" | "product" | "editing" | "logic" | "content")}
              className="text-[10px] bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none focus:border-neutral-500"
            >
              <option value="image">Image (Nano Banana)</option>
              <option value="video">Video (Veo)</option>
              <option value="branding">Branding Identity</option>
              <option value="product">Product Photography</option>
              <option value="editing">Photo Editing</option>
              <option value="logic">Logic Prompt</option>
              <option value="content">Content Creation</option>
            </select>
          </div>
          <textarea
            value={nodeData.prompt}
            onChange={handleChange}
            placeholder="Describe what to generate..."
            className="nodrag nopan nowheel w-full h-full min-h-[100px] p-2 text-xs leading-relaxed text-neutral-100 border border-neutral-700 rounded bg-neutral-900/50 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600 placeholder:text-neutral-500 pr-8"
          />
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || !nodeData.prompt}
            className={`absolute bottom-2 right-2 p-1.5 rounded-md transition-colors ${isEnhancing
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-neutral-800/80 hover:bg-neutral-700 text-yellow-500 hover:text-yellow-400"
              }`}
            title={`Enhance for ${enhancerType === 'video' ? 'Veo' : enhancerType === 'branding' ? 'Branding' : enhancerType === 'product' ? 'Product' : enhancerType === 'editing' ? 'Photo Editing' : enhancerType === 'logic' ? 'Logic' : enhancerType === 'content' ? 'Content' : 'Image'}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isEnhancing ? "animate-pulse" : ""}
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </button>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="text"
          data-handletype="text"
        />
      </BaseNode>

      {/* Modal - rendered via portal to escape React Flow stacking context */}
      {isModalOpenLocal && createPortal(
        <PromptEditorModal
          isOpen={isModalOpenLocal}
          initialPrompt={nodeData.prompt}
          onSubmit={handleSubmitModal}
          onClose={handleCloseModal}
        />,
        document.body
      )}
    </>
  );
}
