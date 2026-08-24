import React, { useState, useRef } from 'react';
import type { GlobalTextureInfo, LoadedAnimationClip, LoadedModelData, ThemeMode } from '../types';
import {
  Box,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit2,
  FileText,
  Folder,
  Film,
  Image as ImageIcon,
  MoreVertical,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
  Layers,
  Check,
  PanelLeftClose,
  PanelLeft,
  FilePlus2,
  FolderPlus,
} from 'lucide-react';

interface LeftHierarchyTreeProps {
  modelData: LoadedModelData | null;
  animationClips: LoadedAnimationClip[];
  activeClipId: string | null;
  isPlaying: boolean;
  globalTexture: GlobalTextureInfo;
  showSkeleton: boolean;
  themeMode: ThemeMode;
  onTogglePlay: () => void;
  onSelectClip: (id: string) => void;
  onRenameClip: (id: string, newName: string) => void;
  onDeleteClip: (id: string) => void;
  onDuplicateClip: (id: string) => void;
  onAddAnimationFiles: (files: FileList | File[]) => void;
  onClearAllClips: () => void;
  onApplyTextureFile: (file: File) => void;
  onClearTexture: () => void;
  onToggleSkeleton: (show: boolean) => void;
  onOpenBaseModelPicker: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const LeftHierarchyTree: React.FC<LeftHierarchyTreeProps> = ({
  modelData,
  animationClips,
  activeClipId,
  isPlaying,
  globalTexture,
  showSkeleton,
  themeMode,
  onTogglePlay,
  onSelectClip,
  onRenameClip,
  onDeleteClip,
  onDuplicateClip,
  onAddAnimationFiles,
  onClearAllClips,
  onApplyTextureFile,
  onClearTexture,
  onToggleSkeleton,
  onOpenBaseModelPicker,
  isOpen,
  onToggleOpen,
}) => {
  const isDark = themeMode === 'dark';

  // Tree Node Expansion States
  const [isModelExpanded, setIsModelExpanded] = useState(true);
  const [isTextureExpanded, setIsTextureExpanded] = useState(true);
  const [isAnimationsExpanded, setIsAnimationsExpanded] = useState(true);
  const [isBonesExpanded, setIsBonesExpanded] = useState(false);

  // Inline editing state for clips
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Drag over animations node state
  const [isDraggingAnim, setIsDraggingAnim] = useState<boolean>(false);

  // Hidden file inputs
  const animFileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);

  // Start editing a clip
  const handleStartRename = (clip: LoadedAnimationClip, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingClipId(clip.id);
    setEditingName(clip.name);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 50);
  };

  // Save clip rename
  const handleSaveRename = (id: string) => {
    const trimmed = editingName.trim();
    if (trimmed && trimmed !== '') {
      onRenameClip(id, trimmed);
    }
    setEditingClipId(null);
  };

  // Cancel edit on escape
  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleSaveRename(id);
    } else if (e.key === 'Escape') {
      setEditingClipId(null);
    }
  };

  // Drag and drop for animations
  const handleAnimDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAnim(true);
  };

  const handleAnimDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAnim(false);
  };

  const handleAnimDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingAnim(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddAnimationFiles(e.dataTransfer.files);
    }
  };

  // Blender color themes
  const panelBg = isDark
    ? 'bg-[#232323]/95 border-[#3d3d3d] text-[#dedede] shadow-black/40'
    : 'bg-[#f0f0f0]/95 border-[#cccccc] text-[#222222] shadow-black/10';

  const sectionHeaderBg = isDark
    ? 'bg-[#2d2d2d] border-[#383838] text-[#cccccc]'
    : 'bg-[#e2e2e2] border-[#d0d0d0] text-[#333333]';

  const itemCardBg = isDark
    ? 'bg-[#1e1e1e] border-[#333333]'
    : 'bg-[#ffffff] border-[#dcdcdc]';

  const subItemHover = isDark
    ? 'hover:bg-[#2e2e2e]'
    : 'hover:bg-[#e8e8e8]';

  if (!isOpen) {
    return (
      <button
        id="btn-open-hierarchy-tree"
        type="button"
        onClick={onToggleOpen}
        title="Open Blender Outliner / Tree View"
        className={`absolute top-16 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-xl backdrop-blur-md text-xs font-semibold transition-all group ${panelBg}`}
      >
        <PanelLeft className="w-4 h-4 text-[#ea7600] group-hover:scale-110 transition-transform" />
        <span>Outliner ({animationClips.length} anims)</span>
      </button>
    );
  }

  return (
    <aside
      id="hierarchy-tree-panel"
      className={`absolute top-16 left-4 bottom-24 z-20 w-80 max-w-[calc(100vw-2rem)] flex flex-col backdrop-blur-xl border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-left-4 duration-200 transition-colors ${panelBg}`}
    >
      {/* Hidden File Pickers */}
      <input
        ref={animFileInputRef}
        type="file"
        multiple
        accept=".fbx"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddAnimationFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
        id="tree-anim-file-input"
      />
      <input
        ref={textureFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onApplyTextureFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
        id="tree-texture-file-input"
      />

      {/* Header - Blender Outliner Style */}
      <div className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${sectionHeaderBg}`}>
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#ea7600]" />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Outliner / Scene Tree
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleOpen}
          title="Collapse Outliner"
          className={`p-1 rounded text-neutral-400 hover:text-neutral-100 transition-colors ${subItemHover}`}
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 text-xs select-none scrollbar-thin">
        {/* ROOT NODE: Model */}
        {modelData ? (
          <div className={`rounded-lg border overflow-hidden transition-colors ${itemCardBg}`}>
            {/* Model Root Item */}
            <div
              className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors group ${subItemHover}`}
              onClick={() => setIsModelExpanded(!isModelExpanded)}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  type="button"
                  className="p-0.5 text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  {isModelExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#ea7600]" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
                  )}
                </button>
                <Box className="w-4 h-4 text-[#ea7600] shrink-0" />
                <span
                  className="font-bold truncate text-[11px]"
                  title={modelData.fileName}
                >
                  {modelData.fileName}
                </span>
              </div>

              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${
                isDark
                  ? 'bg-[#181818] border-[#333333] text-neutral-400'
                  : 'bg-[#ebebeb] border-[#d5d5d5] text-neutral-600'
              }`}>
                {(modelData.vertexCount / 1000).toFixed(1)}k v
              </span>
            </div>

            {/* Model Children */}
            {isModelExpanded && (
              <div className={`pl-3 pr-1.5 pb-2 pt-1 space-y-2 border-t ${isDark ? 'border-[#2d2d2d]' : 'border-[#e8e8e8]'}`}>
                
                {/* 1. Global Texture Node */}
                <div className={`rounded-md border overflow-hidden ${isDark ? 'bg-[#1a1a1a] border-[#2d2d2d]' : 'bg-[#fafafa] border-[#e0e0e0]'}`}>
                  <div
                    className={`flex items-center justify-between px-2 py-1.5 cursor-pointer ${subItemHover}`}
                    onClick={() => setIsTextureExpanded(!isTextureExpanded)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isTextureExpanded ? (
                        <ChevronDown className="w-3 h-3 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-neutral-400" />
                      )}
                      <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-[11px] truncate">Global Texture</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        textureFileInputRef.current?.click();
                      }}
                      title="Upload Single Texture Image"
                      className="px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 text-[10px] font-bold transition-colors"
                    >
                      {globalTexture.url ? 'Change' : '+ Apply'}
                    </button>
                  </div>

                  {isTextureExpanded && (
                    <div className={`px-2 py-1.5 border-t space-y-1.5 ${isDark ? 'border-[#2a2a2a]' : 'border-[#eaeaea]'}`}>
                      {globalTexture.url ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded border overflow-hidden shrink-0 ${isDark ? 'bg-[#111111] border-[#333333]' : 'bg-white border-[#cccccc]'}`}>
                            <img
                              src={globalTexture.url}
                              alt="Global Texture"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-[10px]">
                              {globalTexture.name}
                            </p>
                            <p className="text-[9px] text-emerald-500">Uniform across all meshes</p>
                          </div>
                          <button
                            type="button"
                            onClick={onClearTexture}
                            title="Remove texture"
                            className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => textureFileInputRef.current?.click()}
                          className={`flex flex-col items-center justify-center p-2 border border-dashed rounded cursor-pointer text-center transition-all ${
                            isDark
                              ? 'border-[#383838] hover:border-emerald-500/60 bg-[#161616]'
                              : 'border-[#cccccc] hover:border-emerald-500/60 bg-white'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5 text-neutral-400 mb-0.5" />
                          <span className="text-[10px] font-medium">
                            Select Texture (.png, .jpg)
                          </span>
                          <span className="text-[8px] text-neutral-500">
                            Applies to entire model
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Animations Node with Batch Multi-Loading */}
                <div
                  onDragOver={handleAnimDragOver}
                  onDragLeave={handleAnimDragLeave}
                  onDrop={handleAnimDrop}
                  className={`rounded-md border overflow-hidden transition-all ${
                    isDraggingAnim
                      ? 'border-[#ea7600] ring-2 ring-[#ea7600]/40 bg-[#ea7600]/10'
                      : isDark
                      ? 'bg-[#1a1a1a] border-[#2d2d2d]'
                      : 'bg-[#fafafa] border-[#e0e0e0]'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between px-2 py-1.5 cursor-pointer ${subItemHover}`}
                    onClick={() => setIsAnimationsExpanded(!isAnimationsExpanded)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isAnimationsExpanded ? (
                        <ChevronDown className="w-3 h-3 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-neutral-400" />
                      )}
                      <Film className="w-3.5 h-3.5 text-[#ea7600] shrink-0" />
                      <span className="font-semibold text-[11px] truncate">
                        Animations ({animationClips.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          animFileInputRef.current?.click();
                        }}
                        title="Add Multiple Animation FBX Files (Batch Select or Drag & Drop)"
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ea7600] hover:bg-[#ff8500] text-white text-[10px] font-bold transition-colors shadow-sm"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Batch Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Drag & Drop Hint Banner */}
                  {isDraggingAnim && (
                    <div className="p-2 text-center bg-[#ea7600]/20 border-t border-[#ea7600]/40 text-[#ea7600] font-bold text-[10px] animate-pulse">
                      Drop FBX animations here to merge!
                    </div>
                  )}

                  {/* Animations List (Tree items) */}
                  {isAnimationsExpanded && (
                    <div className={`px-1.5 py-1.5 border-t space-y-1 ${isDark ? 'border-[#2a2a2a]' : 'border-[#eaeaea]'}`}>
                      {animationClips.length === 0 ? (
                        <div className="p-3 text-center text-neutral-500">
                          <p className="text-[10px]">No animation clips loaded</p>
                          <div className="mt-2 flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => animFileInputRef.current?.click()}
                              className="px-2 py-1 rounded bg-[#ea7600] hover:bg-[#ff8500] text-white text-[10px] font-bold shadow-sm"
                            >
                              + Add FBX (Multi)
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {animationClips.map((clip, idx) => {
                            const isActive = activeClipId === clip.id;
                            const isEditing = editingClipId === clip.id;

                            return (
                              <div
                                key={clip.id}
                                id={`tree-anim-clip-${clip.id}`}
                                onClick={() => onSelectClip(clip.id)}
                                onDoubleClick={(e) => handleStartRename(clip, e)}
                                className={`group relative flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all border ${
                                  isActive
                                    ? isDark
                                      ? 'bg-[#ea7600]/25 border-[#ea7600]/60 text-white font-medium shadow-sm'
                                      : 'bg-[#ea7600]/15 border-[#ea7600]/60 text-neutral-900 font-medium shadow-sm'
                                    : isDark
                                    ? 'bg-[#222222]/80 border-transparent hover:bg-[#2b2b2b] text-[#cccccc]'
                                    : 'bg-[#f4f4f4] border-transparent hover:bg-[#ebebeb] text-[#333333]'
                                }`}
                              >
                                {/* Left side: Play icon & Editable Name */}
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isActive) {
                                        onTogglePlay();
                                      } else {
                                        onSelectClip(clip.id);
                                      }
                                    }}
                                    className={`p-0.5 rounded transition-transform ${
                                      isActive && isPlaying
                                        ? 'text-[#ea7600]'
                                        : 'text-neutral-400 group-hover:text-neutral-200'
                                    }`}
                                  >
                                    {isActive && isPlaying ? (
                                      <Pause className="w-3 h-3 fill-current" />
                                    ) : (
                                      <Play className="w-3 h-3 fill-current" />
                                    )}
                                  </button>

                                  {isEditing ? (
                                    <input
                                      ref={editInputRef}
                                      type="text"
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      onBlur={() => handleSaveRename(clip.id)}
                                      onKeyDown={(e) => handleKeyDown(e, clip.id)}
                                      onClick={(e) => e.stopPropagation()}
                                      className={`border rounded px-1.5 py-0.5 text-[10px] w-full outline-none ${
                                        isDark
                                          ? 'bg-[#111111] border-[#ea7600] text-white'
                                          : 'bg-white border-[#ea7600] text-black'
                                      }`}
                                    />
                                  ) : (
                                    <span
                                      className="truncate text-[10px] font-medium"
                                      title={`${clip.name} (Double-click to rename)`}
                                    >
                                      {clip.name}
                                    </span>
                                  )}
                                </div>

                                {/* Right side: Duration badge & quick actions */}
                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                  {!isEditing && (
                                    <span className={`text-[9px] font-mono px-1 py-0.2 rounded border group-hover:hidden ${
                                      isDark
                                        ? 'bg-[#181818] border-[#303030] text-neutral-400'
                                        : 'bg-[#e5e5e5] border-[#cccccc] text-neutral-600'
                                    }`}>
                                      {clip.duration.toFixed(1)}s
                                    </span>
                                  )}

                                  {/* Hover actions */}
                                  <div className="hidden group-hover:flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={(e) => handleStartRename(clip, e)}
                                      title="Rename clip"
                                      className={`p-1 rounded text-neutral-400 hover:text-[#ea7600] transition-colors ${subItemHover}`}
                                    >
                                      <Edit2 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicateClip(clip.id);
                                      }}
                                      title="Duplicate clip"
                                      className={`p-1 rounded text-neutral-400 hover:text-neutral-100 transition-colors ${subItemHover}`}
                                    >
                                      <Copy className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteClip(clip.id);
                                      }}
                                      title="Delete clip"
                                      className="p-1 rounded text-neutral-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* Quick Batch Controls in list */}
                          <div className={`flex items-center justify-between pt-1 border-t ${isDark ? 'border-[#2d2d2d]' : 'border-[#e0e0e0]'}`}>
                            <button
                              type="button"
                              onClick={() => animFileInputRef.current?.click()}
                              className="text-[9px] font-semibold text-[#ea7600] hover:underline"
                            >
                              + Add more FBX clips (Multi-select)
                            </button>
                            <button
                              type="button"
                              onClick={onClearAllClips}
                              className="text-[9px] text-neutral-500 hover:text-rose-400"
                            >
                              Clear all
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Skeleton / Bones Node */}
                <div className={`rounded-md border overflow-hidden ${isDark ? 'bg-[#1a1a1a] border-[#2d2d2d]' : 'bg-[#fafafa] border-[#e0e0e0]'}`}>
                  <div
                    className={`flex items-center justify-between px-2 py-1.5 cursor-pointer ${subItemHover}`}
                    onClick={() => setIsBonesExpanded(!isBonesExpanded)}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isBonesExpanded ? (
                        <ChevronDown className="w-3 h-3 text-neutral-400" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-neutral-400" />
                      )}
                      <span className="text-[11px] font-semibold">
                        Armature Bones ({modelData.bones.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSkeleton(!showSkeleton);
                      }}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                        showSkeleton
                          ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                          : isDark
                          ? 'bg-[#262626] border-[#383838] text-neutral-400'
                          : 'bg-[#e5e5e5] border-[#cccccc] text-neutral-600'
                      }`}
                    >
                      {showSkeleton ? 'Visible' : 'Hidden'}
                    </button>
                  </div>

                  {isBonesExpanded && (
                    <div className={`px-2 py-1.5 border-t max-h-36 overflow-y-auto space-y-0.5 text-[9px] font-mono ${
                      isDark ? 'border-[#2a2a2a] text-neutral-400' : 'border-[#eaeaea] text-neutral-600'
                    }`}>
                      {modelData.bones.map((bone, i) => (
                        <div key={i} className="flex items-center justify-between py-0.5">
                          <span className="truncate">{bone.name}</span>
                          <span className="text-neutral-500 text-[8px]">bone</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        ) : (
          /* Empty Model State */
          <div className={`p-4 rounded-lg border text-center space-y-2.5 ${itemCardBg}`}>
            <Box className="w-8 h-8 text-neutral-500 mx-auto" />
            <div>
              <p className="text-xs font-bold">No Base Model Loaded</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">
                Load a character FBX in T-Pose with armature skeleton
              </p>
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                onClick={onOpenBaseModelPicker}
                className="w-full py-1.5 rounded bg-[#ea7600] hover:bg-[#ff8500] text-white text-xs font-bold shadow-md transition-colors"
              >
                Open Character FBX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Pill */}
      <div className={`px-3 py-2 border-t text-[10px] flex items-center justify-between shrink-0 ${sectionHeaderBg}`}>
        <span className="text-neutral-500 font-mono">Quick Animations | Tree</span>
        <span className="font-semibold text-[#ea7600]">
          {animationClips.length} {animationClips.length === 1 ? 'Track' : 'Tracks'}
        </span>
      </div>
    </aside>
  );
};
