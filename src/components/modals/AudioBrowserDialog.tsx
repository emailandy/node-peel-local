
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import { useReactFlow } from "@xyflow/react";

interface AudioFile {
  name: string;
  url: string;
  displayName: string;
}

// Get the center of the React Flow pane in screen coordinates
function getPaneCenter() {
  const pane = document.querySelector(".react-flow");
  if (pane) {
    const rect = pane.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

interface AudioBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AudioBrowserDialog({ isOpen, onClose }: AudioBrowserDialogProps) {
  const { addNode, incrementModalCount, decrementModalCount } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Register modal with store to block interactions if needed (optional)
  useEffect(() => {
    if (isOpen) {
      incrementModalCount();
      fetchAudioFiles();
      return () => decrementModalCount();
    }
  }, [isOpen, incrementModalCount, decrementModalCount]);

  const fetchAudioFiles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/audio/list");
      if (res.ok) {
        const data = await res.json();
        setAudioFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to fetch audio files", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPreview = (url: string) => {
    if (playingUrl === url) {
      // Toggle pause
      if (audioRef.current) {
        if (!audioRef.current.paused) {
          audioRef.current.pause();
          setPlayingUrl(null);
        } else {
          audioRef.current.play();
        }
      }
    } else {
      setPlayingUrl(url);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    }
  };

  const handleSelectAudio = async (file: AudioFile) => {
    const center = getPaneCenter();
    const position = screenToFlowPosition({
      x: center.x + Math.random() * 100 - 50,
      y: center.y + Math.random() * 100 - 50,
    });

    // We need to fetch the file blob to convert to base64 for the node
    // OR we could just pass the URL if the node supports it. 
    // The AudioNode currently expects a base64 string or data URL.
    // Let's fetch it and convert to base64 to be consistent with existing node behavior.

    try {
      const res = await fetch(file.url);
      const blob = await res.blob();

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Create an Audio Node
        addNode("audio", position, {
          audio: base64,
          filename: file.name,
          status: "complete"
        });
        onClose();
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Failed to load audio for node", e);
      alert("Failed to load audio file.");
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.mp3') && !file.name.toLowerCase().endsWith('.wav')) {
      alert("Only MP3 and WAV files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsLoading(true);
    try {
      const res = await fetch("/api/audio/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchAudioFiles(); // Refresh list
      } else {
        const err = await res.json();
        alert(err.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed");
    } finally {
      setIsLoading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="relative bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".mp3,.wav,audio/mpeg,audio/wav"
        />
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-100">Audio Browser</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUploadClick}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>
            <button onClick={onClose} className="p-1.5 text-neutral-400 hover:text-white rounded">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center text-neutral-500 py-8">Loading...</div>
          ) : audioFiles.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">No audio files found in public/audio</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {audioFiles.map((file) => (
                <div key={file.name} className="flex items-center gap-3 p-3 bg-neutral-700/30 border border-neutral-600/30 rounded-lg hover:bg-neutral-700/50 transition-colors">
                  <button
                    onClick={() => handlePlayPreview(file.url)}
                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-neutral-800 rounded-full hover:bg-blue-600 hover:text-white transition-colors text-neutral-300"
                  >
                    {playingUrl === file.url ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-200 truncate" title={file.name}>{file.displayName}</div>
                    <div className="text-xs text-neutral-500 truncate">{file.name}</div>
                  </div>

                  <button
                    onClick={() => handleSelectAudio(file)}
                    className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-600 text-neutral-300 rounded border border-neutral-700 transition-colors"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hidden Audio Element for Preview */}
        <audio ref={audioRef} onEnded={() => setPlayingUrl(null)} className="hidden" />
      </div>
    </div>,
    document.body
  );
}
