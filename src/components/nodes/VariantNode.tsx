"use client";

import { Handle, Position, NodeProps, Node as FlowNode } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { VariantNodeData, AspectRatio } from "@/types";
import { useState, useCallback, useRef, useEffect } from "react";

type VariantNodeType = FlowNode<VariantNodeData, "variant">;

const ETHNICITIES = [
  "South Asian",
  "African",
  "Hispanic/Latino",
  "East Asian",
  "Caucasian",
  "Middle Eastern",
];

const GENDERS = [
  "Male",
  "Female",
  "Non-Binary",
  "Family Mix",
];

// Simple MultiSelect Component
function MultiSelect({
  options,
  selected,
  onChange,
  label
}: {
  options: string[],
  selected: string[],
  onChange: (s: string[]) => void,
  label: string
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <label className="text-[10px] text-neutral-400 mb-1 block">{label}</label>
      <div
        onClick={() => setOpen(!open)}
        className="w-full bg-neutral-900/50 border border-neutral-800 rounded p-1.5 min-h-[28px] flex flex-wrap gap-1 cursor-pointer text-[10px] text-neutral-300"
      >
        {selected.length === 0 && <span className="text-neutral-500">Select...</span>}
        {selected.map(s => (
          <span key={s} className="bg-neutral-700 px-1 rounded flex items-center gap-1">
            {s}
            <button
              onClick={(e) => { e.stopPropagation(); toggleOption(s); }}
              className="hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
        <div className="ml-auto text-neutral-500">▼</div>
      </div>

      {open && (
        <div className="absolute top-full left-0 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded shadow-xl z-50 max-h-40 overflow-y-auto">
          {options.map((opt) => (
            <div
              key={opt}
              onClick={() => toggleOption(opt)}
              className="px-2 py-1.5 hover:bg-neutral-700 cursor-pointer flex items-center gap-2 text-[10px] text-neutral-300"
            >
              <div className={`w-3 h-3 border border-neutral-500 rounded flex items-center justify-center ${selected.includes(opt) ? "bg-blue-600 border-blue-600" : ""}`}>
                {selected.includes(opt) && <span className="text-white text-[8px]">✓</span>}
              </div>
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const STYLES = [
  "Cyberpunk",
  "Watercolor",
  "Oil Painting",
  "Anime / Manga",
  "Pixar 3D",
  "Claymation",
  "Film Noir",
  "Vintage 1950s",
  "Line Art",
  "Pop Art",
  "Surrealism",
  "Photorealistic",
];

export function VariantNode({ id, data, selected }: NodeProps<VariantNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const regenerateNode = useWorkflowStore((state) => state.regenerateNode);

  const handleRun = useCallback(() => {
    regenerateNode(id);
  }, [id, regenerateNode]);

  // Grid Sizing CSS
  const getGridClass = () => {
    switch (nodeData.gridSize) {
      case "1x1": return "grid-cols-1";
      case "2x2": return "grid-cols-2";
      case "3x3": return "grid-cols-3";
      default: return "grid-cols-2";
    }
  };

  const isStyleMode = nodeData.variantMode === "style";

  return (
    <BaseNode
      id={id}
      title="Variations"
      customTitle={nodeData.customTitle}
      comment={nodeData.comment}
      onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
      onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
      onRun={handleRun}
      selected={selected}
      className="min-w-[300px]"
      isExecuting={nodeData.status === "loading"}
    >
      <div className="flex flex-col gap-3 p-1 relative">

        {/* Handles */}
        <div className="absolute -left-3 top-20 flex flex-col gap-8 z-10">
          <div className="relative">
            <Handle
              type="target"
              position={Position.Left}
              id="image"
              className="w-3 h-3 bg-green-500 hover:bg-green-400 transition-colors"
            />
            <span className="absolute right-4 top-0 text-[9px] text-neutral-400 pointer-events-none bg-neutral-900/80 px-1 rounded shadow-sm">Img</span>
          </div>
          <div className="relative">
            <Handle
              type="target"
              position={Position.Left}
              id="text"
              className="w-3 h-3 bg-purple-500 hover:bg-purple-400 transition-colors"
            />
            <span className="absolute right-4 top-0 text-[9px] text-neutral-400 pointer-events-none bg-neutral-900/80 px-1 rounded shadow-sm">Txt</span>
          </div>
        </div>

        {/* Output Handle */}
        <div className="absolute -right-3 top-20 z-10">
          <Handle
            type="source"
            position={Position.Right}
            id="image"
            className="w-3 h-3 bg-green-500 hover:bg-green-400 transition-colors"
          />
        </div>

        {/* Mode Selector */}
        <div>
          <label className="text-[10px] text-neutral-400 mb-1 block">Mode</label>
          <select
            value={nodeData.variantMode || "demographics"}
            onChange={(e) => updateNodeData(id, { variantMode: e.target.value as "demographics" | "style" })}
            className="w-full bg-neutral-900 border border-neutral-800 rounded p-1.5 text-[10px] text-neutral-300 focus:outline-none"
          >
            <option value="demographics">Demographics</option>
            <option value="style">Style</option>
          </select>
        </div>

        {/* Attribute Selectors */}
        {!isStyleMode && (
          <>
            <MultiSelect
              label="Ethnicity"
              options={ETHNICITIES}
              selected={nodeData.ethnicities || []}
              onChange={(s) => updateNodeData(id, { ethnicities: s })}
            />

            <MultiSelect
              label="Gender"
              options={GENDERS}
              selected={nodeData.genders || []}
              onChange={(s) => updateNodeData(id, { genders: s })}
            />
          </>
        )}

        {isStyleMode && (
          <MultiSelect
            label="Styles"
            options={STYLES}
            selected={nodeData.styles || []}
            onChange={(s) => updateNodeData(id, { styles: s })}
          />
        )}

        {/* Results Grid - if any */}
        {nodeData.results && nodeData.results.length > 0 && (
          <div className={`grid gap-1 mt-2 ${getGridClass()}`}>
            {nodeData.results.map((res) => (
              <div key={res.id} className="relative aspect-square bg-black rounded overflow-hidden group">
                <img src={res.image} alt={res.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-end p-1 transition-opacity">
                  <span className="text-[8px] text-white truncate w-full">{res.label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer Controls */}
        <div className="flex gap-2 mt-2 pt-2 border-t border-neutral-800">
          <div className="flex-1">
            <label className="text-[9px] text-neutral-500 block mb-1">Ratio</label>
            <div className="flex bg-neutral-900 rounded p-0.5 border border-neutral-800">
              {(["16:9", "9:16", "1:1"] as AspectRatio[]).map(r => (
                <button
                  key={r}
                  onClick={() => updateNodeData(id, { ratio: r })}
                  className={`flex-1 text-[9px] py-1 rounded ${nodeData.ratio === r ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1">
            <label className="text-[9px] text-neutral-500 block mb-1">Grid</label>
            <div className="flex bg-neutral-900 rounded p-0.5 border border-neutral-800">
              {(["1x1", "2x2", "3x3"] as const).map(g => (
                <button
                  key={g}
                  onClick={() => updateNodeData(id, { gridSize: g })}
                  className={`flex-1 text-[9px] py-1 rounded ${nodeData.gridSize === g ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-neutral-300"}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Variant Count Config */}
        <div className="mt-2 pt-2 border-t border-neutral-800">
          <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
            <span>Variant Count</span>
            <span className="text-neutral-300">{nodeData.variantCount || 1}</span>
          </div>
          <input
            type="range"
            min="1"
            max="4"
            step="1"
            value={nodeData.variantCount || 1}
            onChange={(e) => updateNodeData(id, { variantCount: parseInt(e.target.value) })}
            className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-neutral-500 nodrag"
          />
        </div>

      </div>
    </BaseNode>
  );
}
