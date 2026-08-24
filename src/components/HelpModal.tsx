import React from 'react';
import type { ThemeMode } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  Sparkles,
  UploadCloud,
  X,
  FilePlus2,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeMode: ThemeMode;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose, themeMode }) => {
  const isDark = themeMode === 'dark';
  if (!isOpen) return null;

  const modalBg = isDark
    ? 'bg-[#222222] border-[#383838] text-[#dedede]'
    : 'bg-[#f4f4f4] border-[#cccccc] text-[#222222]';

  const headerBg = isDark
    ? 'bg-[#2a2a2a] border-[#383838]'
    : 'bg-[#e8e8e8] border-[#d0d0d0]';

  const codeBg = isDark
    ? 'bg-[#181818] border-[#333333] text-[#ea7600]'
    : 'bg-white border-[#dcdcdc] text-[#d66800]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="help-modal-container"
        className={`w-full max-w-xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] transition-colors ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#ea7600] flex items-center justify-center text-white shadow-sm shadow-[#ea7600]/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Mixamo & Blender Workflow Guide
              </h3>
              <p className="text-[11px] text-neutral-400">
                Load T-pose FBX, batch merge animations from disk & export unified 3D models
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          {/* Step 1: Base Character T-Pose */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-[#ea7600] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
              1
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold">
                Step 1: Open Base FBX Model (T-Pose with Skeleton)
              </h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                Click <strong>Open FBX</strong> or drop your base character file. In Mixamo or Blender, export your base character with skin in <strong>T-Pose</strong>.
              </p>
            </div>
          </div>

          {/* Step 2: Batch Skinless Animations */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-[#ea7600] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
              2
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold">
                Step 2: Add Multiple Animation FBX Files (Mixamo "Without Skin")
              </h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                In Mixamo, download animations (e.g. <em>Walking</em>, <em>Running</em>, <em>Dancing</em>) with <strong>Skin: Without Skin</strong>. Click <strong>Add Anims (Multi)</strong> or drag & drop multiple files at once. Animations are automatically named after their filenames and retargeted!
              </p>
            </div>
          </div>

          {/* Step 3: Editable Tree View */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-[#ea7600] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
              3
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold">
                Step 3: Edit Animation Names in the Blender Outliner
              </h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                Double-click or click the edit icon on any animation in the left hierarchy tree to customize its name. Custom names are preserved upon export.
              </p>
            </div>
          </div>

          {/* Step 4: Single Texture */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
              4
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold">
                Step 4: Apply Single Texture Image
              </h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                Click <strong>Texture</strong> or drop a <code className={`px-1 py-0.5 rounded font-mono border ${codeBg}`}>.png / .jpg</code> file into the Global Texture node. It is applied uniformly across the entire model.
              </p>
            </div>
          </div>

          {/* Step 5: Multi-Format Export */}
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-[#ea7600] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-sm">
              5
            </div>
            <div className="flex flex-col gap-0.5">
              <h4 className="text-xs font-bold">
                Step 5: Export to GLB, GLTF, OBJ, USDZ, PLY, STL, JSON
              </h4>
              <p className="text-neutral-400 leading-relaxed text-[11px]">
                Click <strong>Export</strong> in the top-right. Choose <strong>GLB</strong> (binary container with model + skeleton + all merged animations + textures) or any other format for Unity, Unreal Engine, Blender, Godot, Apple AR, or 3D printing.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex justify-end shrink-0 ${headerBg}`}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-[#ea7600] hover:bg-[#ff8500] text-white text-xs font-bold transition-colors shadow-sm"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};
