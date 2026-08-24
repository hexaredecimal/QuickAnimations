import React from 'react';
import type { ThemeMode } from '../types';
import {
  Box,
  Download,
  FolderOpen,
  HelpCircle,
  Image as ImageIcon,
  Moon,
  Plus,
  RotateCcw,
  Sparkles,
  Sun,
  Layers,
  FilePlus2,
  Feather,
  Github,
} from 'lucide-react';

interface FloatingTopNavProps {
  onOpenBaseFilePicker: () => void;
  onOpenAnimFilePicker: () => void;
  onOpenTexturePicker: () => void;
  onOpenExportModal: () => void;
  onOpenHelpModal: () => void;
  onResetCamera: () => void;
  hasModel: boolean;
  clipsCount: number;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
}

export const FloatingTopNav: React.FC<FloatingTopNavProps> = ({
  onOpenBaseFilePicker,
  onOpenAnimFilePicker,
  onOpenTexturePicker,
  onOpenExportModal,
  onOpenHelpModal,
  onResetCamera,
  hasModel,
  clipsCount,
  themeMode,
  onToggleTheme,
}) => {
  const isDark = themeMode === 'dark';

  const containerBg = isDark
    ? 'bg-[#282828]/95 border-[#3d3d3d] text-[#e0e0e0] shadow-black/40'
    : 'bg-[#ededed]/95 border-[#cccccc] text-[#222222] shadow-black/10';

  const btnSecondary = isDark
    ? 'bg-[#353535] hover:bg-[#424242] text-[#d4d4d4] hover:text-white border-[#444444]'
    : 'bg-[#dfdfdf] hover:bg-[#d0d0d0] text-[#333333] hover:text-black border-[#c8c8c8]';

  return (
    <header className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
      {/* Brand & Left Actions */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Blender Style Brand Badge */}
        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border shadow-xl backdrop-blur-md transition-colors ${containerBg}`}>
          <div className="w-5 h-5 rounded-md bg-[#ea7600] flex items-center justify-center shadow-sm shadow-[#ea7600]/40">
            <Feather className="absolute w-3 h-3 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs tracking-wide">
              Quick <span className="text-[#ea7600]">Animations</span>
            </span>
            <span className={`hidden sm:inline-block text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded border ${
              isDark
                ? 'text-[#ea7600] bg-[#ea7600]/10 border-[#ea7600]/30'
                : 'text-[#d66800] bg-[#ea7600]/10 border-[#ea7600]/30'
            }`}>
              v0.01
            </span>
          </div>
        </div>

        {/* Quick File Action Pills */}
        <div className={`flex items-center gap-1 p-1 rounded-lg border shadow-xl backdrop-blur-md transition-colors ${containerBg}`}>
          <button
            id="nav-btn-open-fbx"
            type="button"
            onClick={onOpenBaseFilePicker}
            title="Open Base Character FBX (T-Pose with skeleton)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${btnSecondary}`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#ea7600]" />
            <span className="hidden md:inline">Open FBX</span>
          </button>

          <button
            id="nav-btn-add-anim"
            type="button"
            onClick={onOpenAnimFilePicker}
            disabled={!hasModel}
            title="Add Multiple Animation FBX files (Mixamo without skin, Blender keyframes)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              hasModel
                ? btnSecondary
                : 'opacity-40 cursor-not-allowed border-transparent text-neutral-500'
            }`}
          >
            <FilePlus2 className="w-3.5 h-3.5 text-[#ea7600]" />
            <span className="hidden md:inline">Add Anims (Multi)</span>
            <span className="text-[9px] bg-[#ea7600]/20 text-[#ea7600] px-1 py-0.2 rounded font-bold">
              +{clipsCount}
            </span>
          </button>

          <button
            id="nav-btn-texture"
            type="button"
            onClick={onOpenTexturePicker}
            disabled={!hasModel}
            title="Assign single texture image to entire model (.png, .jpg)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-all ${
              hasModel
                ? btnSecondary
                : 'opacity-40 cursor-not-allowed border-transparent text-neutral-500'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden md:inline">Texture</span>
          </button>
        </div>
      </div>

      {/* Right Actions: Theme Toggle, Reset Cam, Demo, Help, Export */}
      <div className={`flex items-center gap-1 p-1 rounded-lg border shadow-xl backdrop-blur-md pointer-events-auto transition-colors ${containerBg}`}>
        {/* Light / Dark Mode Toggle */}
        <button
          id="nav-btn-toggle-theme"
          type="button"
          onClick={onToggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium border transition-colors ${btnSecondary}`}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-[11px] hidden sm:inline">Dark</span>
            </>
          )}
        </button>



        <button
          id="nav-btn-reset-cam"
          type="button"
          onClick={onResetCamera}
          title="Reset Camera View (NumPad 1)"
          className={`p-1.5 rounded-md text-xs border transition-colors ${btnSecondary}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          id="nav-btn-help"
          type="button"
          onClick={onOpenHelpModal}
          title="Mixamo & Blender Workflow Guide"
          className={`p-1.5 rounded-md text-xs border transition-colors ${btnSecondary}`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>

        <button
          id="nav-btn-help"
          type="button"
          onClick={() => {}}
          title="Go to GitHub Repository"
          className={`p-1.5 rounded-md text-xs border transition-colors ${btnSecondary}`}
        >
          <Github className="w-3.5 h-3.5" />
        </button>


        <div className={`h-4 w-px mx-0.5 ${isDark ? 'bg-[#444444]' : 'bg-[#cccccc]'}`} />

        {/* Blender Orange Export Button */}
        <button
          id="nav-btn-export"
          type="button"
          onClick={onOpenExportModal}
          disabled={!hasModel}
          title="Export to GLB, GLTF, OBJ, USDZ, PLY, STL, JSON"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-md ${
            hasModel
              ? 'bg-[#ea7600] hover:bg-[#ff8500] text-white shadow-[#ea7600]/30 active:scale-95'
              : 'opacity-40 cursor-not-allowed bg-neutral-600 text-neutral-300'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
