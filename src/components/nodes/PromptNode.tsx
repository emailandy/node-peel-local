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
  const [enhancerType, setEnhancerType] = useState<"image" | "video" | "branding" | "product" | "editing" | "logic" | "content" | "character" | "hair" | "portrait" | "storyboard" | "image_to_storyboard" | "storyboard_2x2">("image");
  const [isEnhancing, setIsEnhancing] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateNodeData(id, { prompt: e.target.value });
    },
    [id, updateNodeData]
  );

  const handleEnhance = useCallback(async () => {
    // specific modes allow empty prompt if image is present
    const isImageMode = enhancerType === "image_to_storyboard" || enhancerType === "character";
    const hasImage = !!nodeData.referenceImage;

    if (!nodeData.prompt && !(isImageMode && hasImage)) return;

    setIsEnhancing(true);
    try {
      const response = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: nodeData.prompt || "Analyze this image", // Fallback prompt for API validation
          enhancementType: enhancerType, 
          provider: "google",
          model: "gemini-3-flash-preview",
          maxTokens: 8192,
          images: (isImageMode && nodeData.referenceImage) ? [nodeData.referenceImage] : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Enhancement processing error:", response.status, response.statusText, errorData);
        throw new Error(errorData.error || `Enhancement failed: ${response.status} ${response.statusText}`);
      }

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
              onChange={(e) => setEnhancerType(e.target.value as "image" | "video" | "branding" | "product" | "editing" | "logic" | "content" | "character" | "hair" | "portrait" | "storyboard")}
              className="text-[10px] bg-neutral-800 border border-neutral-700 rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none focus:border-neutral-500"
            >
              <option value="image">Image (Nano Banana)</option>
              <option value="video">Video (Veo)</option>
              <option value="branding">Branding Identity</option>
              <option value="product">Product Photography</option>
              <option value="editing">Photo Editing</option>
              <option value="content">Content Creation</option>
              <option value="logic">Logic & Composition</option>
              <option value="character">Character Consistency</option>
              <option value="hair">Hair Style</option>
              <option value="portrait">Self Portrait</option>
              <option value="storyboard">Storyboard 3x3</option>
              <option value="storyboard_2x2">Storyboard 2x2</option>
              <option value="image_to_storyboard">Image to Storyboard</option>
            </select>
          </div>

          {/* Reference Image Upload (Only for Character Consistency or Image to Storyboard) */}
          {(enhancerType === "character" || enhancerType === "image_to_storyboard") && (
            <div className="px-1 mb-2">
              <label className="flex items-center gap-2 text-[10px] text-neutral-400 cursor-pointer hover:text-neutral-300 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center border border-dashed border-neutral-600 rounded bg-neutral-800/50">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span>{nodeData.referenceImage ? "Change Reference" : "Add Reference Face"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        updateNodeData(id, { referenceImage: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
              {nodeData.referenceImage && (
                <div className="relative mt-1 w-12 h-12 rounded overflow-hidden group">
                  <img src={nodeData.referenceImage} alt="Reference" className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      updateNodeData(id, { referenceImage: null });
                    }}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              )}
            </div>
          )}

          <textarea
            value={nodeData.prompt}
            onChange={handleChange}
            placeholder="Describe what to generate..."
            className="nodrag nopan nowheel w-full h-full min-h-[100px] p-2 text-xs leading-relaxed text-neutral-100 border border-neutral-700 rounded bg-neutral-900/50 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-600 focus:border-neutral-600 placeholder:text-neutral-500 pr-8"
          />
          <button
            onClick={handleEnhance}
            disabled={isEnhancing || (!nodeData.prompt && !((enhancerType === "image_to_storyboard" || enhancerType === "character") && nodeData.referenceImage))}
            className={`absolute bottom-2 right-2 p-1.5 rounded-md transition-colors ${isEnhancing
              ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              : "bg-neutral-800/80 hover:bg-neutral-700 text-yellow-500 hover:text-yellow-400"
              }`}
            title={`Enhance for ${enhancerType === 'video' ? 'Veo' : enhancerType === 'branding' ? 'Branding' : enhancerType === 'product' ? 'Product' : enhancerType === 'editing' ? 'Photo Editing' : enhancerType === 'logic' ? 'Logic' : enhancerType === 'content' ? 'Content' : enhancerType === 'character' ? 'Character' : enhancerType === 'hair' ? 'Hair' : enhancerType === 'portrait' ? 'Portrait' : 'Image'}`}
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
