
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useWorkflowStore } from "@/store/workflowStore";
import { useReactFlow } from "@xyflow/react";
import { STATIC_AVATARS, Avatar } from "@/lib/staticAvatars";
import { toast } from "sonner"; // Assuming sonner is used, or use window.alert if not available
import { v4 as uuidv4 } from 'uuid'; // We might need this, or just rely on server side ID. Client side ID is good for optimistic UI.

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

interface AvatarBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarBrowserDialog({ isOpen, onClose }: AvatarBrowserDialogProps) {
  const { addNode, incrementModalCount, decrementModalCount, userAvatars, addUserAvatar, removeUserAvatar } = useWorkflowStore();
  const { screenToFlowPosition } = useReactFlow();

  // State
  const [mode, setMode] = useState<"browse" | "create">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<Avatar["gender"] | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<Avatar["category"] | "all">("all");

  // Create Mode State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAvatar, setNewAvatar] = useState<Partial<Avatar>>({
    name: "",
    gender: "male",
    category: "professional",
    description: "",
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Register modal with store
  useEffect(() => {
    if (isOpen) {
      incrementModalCount();
      useWorkflowStore.getState().syncUserAvatars(); // Sync from server
      return () => decrementModalCount();
    }
  }, [isOpen, incrementModalCount, decrementModalCount]);

  // Focus search input when dialog opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Filter avatars
  const allAvatars = [...userAvatars, ...STATIC_AVATARS];
  const filteredAvatars = allAvatars.filter((avatar) => {
    const matchesSearch =
      avatar.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      avatar.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGender = genderFilter === "all" || avatar.gender === genderFilter;
    const matchesCategory = categoryFilter === "all" || avatar.category === categoryFilter;

    return matchesSearch && matchesGender && matchesCategory;
  });

  // Handle selection
  const handleSelectAvatar = (avatar: Avatar) => {
    const center = getPaneCenter();
    const position = screenToFlowPosition({
      x: center.x + Math.random() * 100 - 50,
      y: center.y + Math.random() * 100 - 50,
    });

    // Create an Image Input Node with the avatar image
    addNode("imageInput", position, {
      image: avatar.previewUrl,
      filename: `${avatar.name}.png`,
    });

    onClose();
  };

  const handleGeneratePreview = async () => {
    if (!newAvatar.description) return;
    setIsGenerating(true);
    try {
      const AVATAR_SYSTEM_PROMPT = `
Identity and fidelity anchor
Keep the original person’s face unchanged and realistic. Preserve skin texture and pores. 
Maintain natural proportions and face geometry. Do not alter the background or camera angle.

Eyes refinement
Sharpen the eyes with natural catchlights. Keep iris color hazel. 
Avoid over-whitening the sclera. Do not add makeup or change eyelid shape.

Glasses Scenario (Conditional)
Analyze the reference image. IF the subject wears glasses, ensure they are rendered as thin, semi-matte rectangular eyeglasses with subtle, realistic reflections (avoid glare covering pupils). IF NO glasses are present in the reference, DO NOT add them.

Hands correction
Show relaxed hands with five fingers per hand, natural joint bends, and no overlaps hiding fingers. 
Avoid extra or fused fingers.

Anti-softness detail
Increase micro-contrast and fine detail on skin, hair, and fabric while avoiding plastic smoothing and sharpening halos.
`;

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${referenceImage ? AVATAR_SYSTEM_PROMPT + "\n\n" : ""}Profile picture of ${newAvatar.description}, ${newAvatar.gender}, ${newAvatar.category} style, high quality, 8k, centered, professional lighting, photorealistic, highly detailed`,
          images: referenceImage ? [referenceImage] : [],
          model: "nano-banana", // Use fast model for preview
          numberOfImages: 1,
          aspectRatio: "1:1",
        }),
      });
      const data = await response.json();
      if (data.success && data.image) {
        setPreviewImage(data.image);
      } else {
        alert("Failed to generate preview: " + (data.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Error generating preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!previewImage || !newAvatar.name || !newAvatar.description || !newAvatar.gender || !newAvatar.category) return;
    setIsSaving(true);
    try {
      // Save image to server
      const saveResponse = await fetch("/api/avatar/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: previewImage,
          name: newAvatar.name,
          description: newAvatar.description,
          gender: newAvatar.gender,
          category: newAvatar.category
        }),
      });
      const saveData = await saveResponse.json();

      if (!saveData.success) {
        throw new Error(saveData.error);
      }

      // Use the server-returned avatar object if available, otherwise fallback (with potential ID mismatch risk)
      const avatar: Avatar = saveData.avatar || {
        id: `user-${Date.now()}`,
        name: newAvatar.name,
        description: newAvatar.description,
        gender: newAvatar.gender,
        category: newAvatar.category,
        previewUrl: saveData.url,
      };

      addUserAvatar(avatar);
      setMode("browse");
      setNewAvatar({ name: "", gender: "male", category: "professional", description: "" });
      setPreviewImage(null);
    } catch (e: any) {
      console.error(e);
      alert("Error saving avatar: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUserAvatar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this avatar?")) {
      removeUserAvatar(id);
    }
  };

  if (!isOpen) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-neutral-800 border border-neutral-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-700">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-neutral-100">
              Avatar Browser
            </h2>
            <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-700/50">
              <button
                onClick={() => setMode("browse")}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === "browse" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                  }`}
              >
                Browse
              </button>
              <button
                onClick={() => setMode("create")}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${mode === "create" ? "bg-neutral-700 text-white shadow-sm" : "text-neutral-400 hover:text-white"
                  }`}
              >
                Create
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-700 rounded transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {mode === "browse" ? (
          <>
            {/* Filter Bar */}
            <div className="px-6 py-4 border-b border-neutral-700 space-y-3">
              {/* ... existing filter UI ... */}
              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search personas..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-neutral-700 border border-neutral-600 rounded text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Gender Filter */}
                <div className="flex bg-neutral-700/50 rounded p-1 gap-1">
                  {(["all", "male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors capitalize ${genderFilter === g
                        ? "bg-neutral-600 text-neutral-100 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
                        }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>

                {/* Category Filter */}
                <div className="flex bg-neutral-700/50 rounded p-1 gap-1">
                  {(["all", "professional", "creative", "family", "solo"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategoryFilter(c)}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors capitalize ${categoryFilter === c
                        ? "bg-neutral-600 text-neutral-100 shadow-sm"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700"
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Avatars Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredAvatars.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <p className="text-sm text-neutral-400">No avatars found</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredAvatars.map((avatar) => (
                    <div
                      key={avatar.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectAvatar(avatar)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleSelectAvatar(avatar); }}
                      className="group relative flex flex-col bg-neutral-700/30 hover:bg-neutral-700/50 border border-neutral-600/30 hover:border-neutral-500 rounded-lg overflow-hidden transition-all text-left cursor-pointer"
                    >
                      <div className="aspect-square bg-neutral-800 relative overflow-hidden">
                        {/* Using a placeholder image if previewUrl is likely broken or generic, but we put URLs, so let's try to use them or fallback */}
                        {/* Since I put real (but potentially 404ing or random) URLs, I'll add an onError fallback */}
                        {avatar.previewUrl ? (
                          <img
                            src={avatar.previewUrl}
                            alt={avatar.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatar.name)}&background=random`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-500">
                            No Preview
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="text-xs font-medium text-white shadow-sm block truncate">{avatar.name}</span>
                          <span className="text-[10px] text-neutral-300 capitalize">{avatar.category} • {avatar.gender}</span>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-neutral-400 line-clamp-3 leading-relaxed">
                          {avatar.description}
                        </p>
                      </div>
                      {avatar.id.startsWith("user-") && (
                        <button
                          onClick={(e) => handleDeleteUserAvatar(e, avatar.id)}
                          className="absolute top-2 right-2 p-1 bg-red-600/80 hover:bg-red-700 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete custom avatar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          // Create Mode UI
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 p-6 border-r border-neutral-700 overflow-y-auto space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1">Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newAvatar.name}
                    onChange={e => setNewAvatar(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full bg-neutral-900 border rounded-lg px-3 py-2 text-sm text-white focus:ring-1 outline-none ${!newAvatar.name && previewImage ? "border-red-500 ring-1 ring-red-500/50" : "border-neutral-700 focus:ring-blue-500"
                      }`}
                    placeholder="e.g. Cyberpunk Hacker"
                  />
                  {!newAvatar.name && previewImage && (
                    <p className="text-[10px] text-red-400 mt-1">Name is required to save</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Gender</label>
                    <select
                      value={newAvatar.gender}
                      onChange={e => setNewAvatar(prev => ({ ...prev, gender: e.target.value as any }))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1">Category</label>
                    <select
                      value={newAvatar.category}
                      onChange={e => setNewAvatar(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="professional">Professional</option>
                      <option value="creative">Creative</option>
                      <option value="family">Family</option>
                      <option value="solo">Solo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-neutral-400">Description (Prompt)</label>
                    <button
                      onClick={async () => {
                        if (!newAvatar.description) return;
                        setIsEnhancing(true);
                        try {
                          const response = await fetch("/api/llm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              prompt: newAvatar.description,
                              images: referenceImage ? [referenceImage] : [],
                              enhancementType: "avatar",
                              provider: "google",
                              model: "gemini-3-flash-preview",
                              maxTokens: 8192,
                            }),
                          });
                          const data = await response.json();
                          if (data.success && data.text) {
                            setNewAvatar(prev => ({ ...prev, description: data.text.trim() }));
                          } else {
                            alert("Failed to enhance prompt: " + (data.error || "Unknown error"));
                          }
                        } catch (e) {
                          console.error(e);
                          alert("Error enhancing prompt");
                        } finally {
                          setIsEnhancing(false);
                        }
                      }}
                      disabled={isEnhancing || !newAvatar.description}
                      className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded transition-colors ${isEnhancing || !newAvatar.description
                        ? "text-neutral-600 cursor-not-allowed"
                        : "text-blue-400 hover:text-blue-300 hover:bg-neutral-800"
                        }`}
                      title="Enhance prompt with AI"
                    >
                      <svg className={`w-3 h-3 ${isEnhancing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {isEnhancing ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        )}
                      </svg>
                      {isEnhancing ? "Enhancing..." : "Enhance"}
                    </button>
                  </div>
                  <textarea
                    value={newAvatar.description}
                    onChange={e => setNewAvatar(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full h-32 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Describe the avatar's appearance..."
                  />
                </div>

                <button
                  onClick={handleGeneratePreview}
                  disabled={isGenerating || !newAvatar.description}
                  className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${isGenerating || !newAvatar.description
                    ? "bg-neutral-700 text-neutral-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                >
                  {isGenerating ? "Generating..." : "Generate Preview"}
                </button>
              </div>
            </div>

            <div className="w-1/2 p-6 flex flex-col items-center justify-center bg-neutral-900/50 space-y-6">
              {/* Reference Image Upload Section */}
              <div className="w-full max-w-sm space-y-2">
                <label className="block text-xs font-medium text-neutral-400">Reference Image (Optional)</label>
                {!referenceImage ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-neutral-500 hover:bg-neutral-800/50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-2 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-xs text-neutral-500">Click to upload reference</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setReferenceImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <div className="relative w-full h-32 bg-neutral-800 rounded-lg overflow-hidden group border border-neutral-700">
                    <img src={referenceImage} alt="Reference" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={() => setReferenceImage(null)}
                      className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-red-500/80 text-white rounded-full transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                    <div className="absolute bottom-1 left-2 text-[10px] text-white font-medium drop-shadow-md">Reference Image</div>
                  </div>
                )}
              </div>

              {previewImage ? (
                <div className="flex flex-col items-center space-y-4 w-full max-w-sm">
                  <div className="aspect-square w-full bg-neutral-800 rounded-lg overflow-hidden border border-neutral-700 shadow-lg relative group">
                    <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white text-sm font-medium">Preview</p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => setPreviewImage(null)}
                      className="flex-1 py-2 rounded-lg border border-neutral-600 text-neutral-300 hover:bg-neutral-800 transition-colors text-sm font-medium"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveAvatar}
                      disabled={isSaving || !newAvatar.name}
                      className={`flex-1 py-2 rounded-lg text-white transition-colors text-sm font-medium ${isSaving || !newAvatar.name
                        ? "bg-neutral-700 text-neutral-500"
                        : "bg-green-600 hover:bg-green-500"
                        }`}
                    >
                      {isSaving ? "Saving..." : "Save Avatar"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-neutral-500 space-y-2 py-8">
                  <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-neutral-700">
                    <svg className="w-10 h-10 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xs">Generate a preview to continue</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
