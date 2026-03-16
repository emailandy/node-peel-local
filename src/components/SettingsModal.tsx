import { useState, useEffect } from "react";
import { useWorkflowStore } from "@/store/workflowStore";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { providerSettings, updateProviderApiKey } = useWorkflowStore();
  const [localKey, setLocalKey] = useState("");

  useEffect(() => {
    if (isOpen) {
      setLocalKey(providerSettings.providers.gemini?.apiKey || "");
    }
  }, [isOpen, providerSettings.providers.gemini?.apiKey]);

  const handleSave = () => {
    updateProviderApiKey("gemini", localKey || null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[400px] bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-neutral-200">Settings</h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="block text-xs font-medium text-neutral-400">
              Gemini API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full h-9 px-3 bg-neutral-950 border border-neutral-800 rounded text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-700 transition-colors font-mono"
            />
            <p className="text-[10px] text-neutral-500 leading-relaxed">
              Your API key is stored locally in your browser and sent directly to the server with each request.
              It is never stored on our servers.
            </p>
          </div>
        </div>

        <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs bg-neutral-100 text-neutral-900 rounded hover:bg-white transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
