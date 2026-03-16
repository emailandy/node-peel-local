"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Handle, Position, NodeProps, Node } from "@xyflow/react";
import { BaseNode } from "./BaseNode";
import { useWorkflowStore } from "@/store/workflowStore";
import { AudioNodeData } from "@/types";
import { toast } from "sonner";

type AudioNodeType = Node<AudioNodeData, "audio">;

export function AudioNode({ id, data, selected }: NodeProps<AudioNodeType>) {
  const nodeData = data;
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const analyserRef = useRef<AnalyserNode>(null);
  const audioContextRef = useRef<AudioContext>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode>(null);

  // Initialize Audio Context and Analyser
  const initVisualizer = () => {
    if (!audioRef.current || !canvasRef.current) return;

    if (!audioContextRef.current) {
      // @ts-ignore - Handle webkit prefix if needed, though modern browsers mimic typical standard
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (!analyserRef.current) {
      analyserRef.current = ctx.createAnalyser();
      analyserRef.current.fftSize = 256;
    }

    if (!sourceRef.current && audioRef.current) {
      try {
        sourceRef.current = ctx.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
      } catch (e) {
        // Already connected or error
        console.warn("Audio source connection error:", e);
      }
    }
  };

  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current) return;
      animationRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      canvasCtx.fillStyle = "rgb(23, 23, 23)"; // Neutral-900 match
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2; // Scale down

        // Gradient purple
        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 200)`;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const handlePlay = () => {
    initVisualizer();
    drawVisualizer();
  };

  const handlePause = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.match(/^audio\/(mp3|wav|ogg|mpeg|webm)$/)) {
        toast.error("Unsupported format. Use MP3, WAV, OGG, or WebM.");
        return;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error("Audio too large. Maximum size is 50MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        // Create an audio element to get duration
        const audio = new Audio(base64);
        audio.onloadedmetadata = () => {
          updateNodeData(id, {
            audio: base64,
            filename: file.name,
            duration: audio.duration,
            status: "complete",
            error: null
          });
        };
      };
      reader.readAsDataURL(file);
    },
    [id, updateNodeData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      const dt = new DataTransfer();
      dt.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dt.files;
        fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleRemove = useCallback(() => {
    updateNodeData(id, {
      audio: null,
      filename: null,
      duration: undefined,
      status: "idle",
      error: null
    });
  }, [id, updateNodeData]);

  return (
    <BaseNode
      id={id}
      title="Audio"
      customTitle={nodeData.customTitle}
      comment={nodeData.comment}
      onCustomTitleChange={(title) => updateNodeData(id, { customTitle: title || undefined })}
      onCommentChange={(comment) => updateNodeData(id, { comment: comment || undefined })}
      selected={selected}
    >
      {/* Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/webm"
        onChange={handleFileChange}
        className="hidden"
      />

      {nodeData.audio ? (
        <div className="relative flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="truncate max-w-[180px]">{nodeData.filename || "Uploaded Audio"}</span>
            <button
              onClick={handleRemove}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Remove
            </button>
          </div>

          <div className="relative w-full h-16 bg-neutral-900 rounded overflow-hidden border border-neutral-800">
            <canvas
              ref={canvasRef}
              width={300}
              height={64}
              className="w-full h-full absolute top-0 left-0"
            />
          </div>

          <audio
            ref={audioRef}
            controls
            src={nodeData.audio}
            className="w-full h-8"
            onPlay={handlePlay}
            onPause={handlePause}
            onEnded={handlePause}
            crossOrigin="anonymous" // Helpful if audio is from external URL, though data URL works fine
          />

          {nodeData.duration && (
            <div className="text-[10px] text-neutral-500 text-right">
              {Math.round(nodeData.duration)}s
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="w-full py-8 border border-dashed border-neutral-600 rounded flex flex-col items-center justify-center cursor-pointer hover:border-neutral-500 hover:bg-neutral-700/50 transition-colors"
          >
            <svg className="w-6 h-6 text-neutral-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            <span className="text-[10px] text-neutral-400">
              Upload MP3/Audio
            </span>
          </div>
        </div>
      )}

      {/* Output Audio Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="audio"
        data-handletype="audio"
        className="!w-3 !h-3 !-mr-1.5 hover:!w-4 hover:!h-4 transition-all !bg-purple-500"
      />
    </BaseNode>
  );
}
