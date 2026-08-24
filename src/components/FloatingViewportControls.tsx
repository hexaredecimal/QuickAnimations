import React, { useState } from 'react';
import type { LightingPreset, ShadingMode, ThemeMode, ViewportSettings } from '../types';
import {
  Camera,
  Compass,
  Eye,
  Grid,
  Maximize2,
  Minimize2,
  Moon,
  RotateCw,
  Sun,
  Layers,
  Settings2,
} from 'lucide-react';

interface FloatingViewportControlsProps {
  settings: ViewportSettings;
  onUpdateSettings: (newSettings: Partial<ViewportSettings>) => void;
  onSetCameraView: (view: 'front' | 'side' | 'top' | 'isometric' | 'reset') => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const FloatingViewportControls: React.FC<FloatingViewportControlsProps> = ({
  settings,
  onUpdateSettings,
  onSetCameraView,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [isOpenMenu, setIsOpenMenu] = useState(false);
  const isDark = settings.themeMode === 'dark';

  const lightingPresets: { id: LightingPreset; label: string }[] = [
    { id: 'studio', label: 'Studio' },
    { id: 'sunset', label: 'Warm Sunset' },
    { id: 'cyber', label: 'Cyber Blue' },
    { id: 'dramatic', label: 'Dramatic' },
    { id: 'flat', label: 'Flat Ambient' },
  ];

  const shadingModes: { id: ShadingMode; label: string }[] = [
    { id: 'textured', label: 'Textured PBR' },
    { id: 'wireframe', label: 'Wireframe' },
    { id: 'normal', label: 'Normals' },
    { id: 'matcap', label: 'MatCap Clay' },
  ];

  const containerBg = isDark
    ? 'bg-[#282828]/95 border-[#3d3d3d] text-[#e0e0e0] shadow-black/40'
    : 'bg-[#eeeeee]/95 border-[#cccccc] text-[#222222] shadow-black/10';

  const btnSecondary = isDark
    ? 'bg-[#353535] hover:bg-[#444444] text-[#d4d4d4] hover:text-white border-[#444444]'
    : 'bg-[#e0e0e0] hover:bg-[#d0d0d0] text-[#333333] hover:text-black border-[#c8c8c8]';

  return (
    <div className="absolute top-16 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
      {/* Floating Toolbar Pill */}
      <div className={`flex items-center gap-1 p-1 rounded-lg border shadow-xl backdrop-blur-md pointer-events-auto transition-colors ${containerBg}`}>
        {/* Grid Toggle */}
        <button
          id="vp-btn-grid"
          type="button"
          onClick={() => onUpdateSettings({ showGrid: !settings.showGrid })}
          title={settings.showGrid ? 'Hide Floor Grid' : 'Show Floor Grid'}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            settings.showGrid
              ? 'bg-[#ea7600]/20 text-[#ea7600] border-[#ea7600]/50 font-bold'
              : btnSecondary
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        {/* Skeleton Toggle */}
        <button
          id="vp-btn-skeleton"
          type="button"
          onClick={() => onUpdateSettings({ showSkeleton: !settings.showSkeleton })}
          title={settings.showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            settings.showSkeleton
              ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 font-bold'
              : btnSecondary
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
        </button>

        {/* Shadows Toggle */}
        <button
          id="vp-btn-shadows"
          type="button"
          onClick={() => onUpdateSettings({ showShadows: !settings.showShadows })}
          title={settings.showShadows ? 'Disable Floor Shadows' : 'Enable Floor Shadows'}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            settings.showShadows
              ? 'bg-[#ea7600]/20 text-[#ea7600] border-[#ea7600]/50 font-bold'
              : btnSecondary
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
        </button>

        {/* Auto Rotate Toggle */}
        <button
          id="vp-btn-autorotate"
          type="button"
          onClick={() => onUpdateSettings({ autoRotate: !settings.autoRotate })}
          title={settings.autoRotate ? 'Stop Turntable' : 'Auto Turntable Spin'}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            settings.autoRotate
              ? 'bg-[#ea7600]/20 text-[#ea7600] border-[#ea7600]/50 font-bold'
              : btnSecondary
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Shading & Lighting Menu Toggle */}
        <button
          id="vp-btn-settings-dropdown"
          type="button"
          onClick={() => setIsOpenMenu(!isOpenMenu)}
          title="Viewport Shading & Lighting Presets"
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            isOpenMenu
              ? 'bg-[#ea7600] text-white border-[#ea7600]'
              : btnSecondary
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          id="vp-btn-fullscreen"
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className={`p-1.5 rounded-md border text-xs transition-colors ${btnSecondary}`}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Camera View Fast Angles Capsule */}
      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border shadow-lg backdrop-blur-md text-[10px] font-semibold pointer-events-auto transition-colors ${containerBg}`}>
        <span className="text-[9px] uppercase tracking-wider text-neutral-400 mr-0.5">Cam:</span>
        <button
          type="button"
          onClick={() => onSetCameraView('front')}
          className={`px-1.5 py-0.5 rounded border transition-colors ${btnSecondary}`}
        >
          Front (1)
        </button>
        <button
          type="button"
          onClick={() => onSetCameraView('side')}
          className={`px-1.5 py-0.5 rounded border transition-colors ${btnSecondary}`}
        >
          Side (3)
        </button>
        <button
          type="button"
          onClick={() => onSetCameraView('top')}
          className={`px-1.5 py-0.5 rounded border transition-colors ${btnSecondary}`}
        >
          Top (7)
        </button>
        <button
          type="button"
          onClick={() => onSetCameraView('reset')}
          className="px-1.5 py-0.5 rounded text-[#ea7600] hover:underline font-bold transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Expanded Shading & Lighting Menu Popup */}
      {isOpenMenu && (
        <div className={`w-60 p-3 rounded-xl border shadow-2xl space-y-3 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150 text-xs backdrop-blur-2xl transition-colors ${
          isDark
            ? 'bg-[#232323]/98 border-[#3d3d3d] text-[#dedede]'
            : 'bg-[#f5f5f5]/98 border-[#cccccc] text-[#222222]'
        }`}>
          {/* Shading Mode */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1.5">
              Shading Mode
            </label>
            <div className="grid grid-cols-2 gap-1">
              {shadingModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onUpdateSettings({ shadingMode: mode.id })}
                  className={`px-2 py-1 rounded text-left text-[10px] font-bold border transition-all ${
                    settings.shadingMode === mode.id
                      ? 'bg-[#ea7600] text-white border-[#ea7600] shadow-sm'
                      : isDark
                      ? 'bg-[#2d2d2d] border-[#383838] text-neutral-300 hover:bg-[#383838]'
                      : 'bg-white border-[#dcdcdc] text-neutral-800 hover:bg-[#eaeaea]'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lighting Presets */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1.5">
              Environment Light
            </label>
            <div className="grid grid-cols-3 gap-1">
              {lightingPresets.map((lp) => (
                <button
                  key={lp.id}
                  type="button"
                  onClick={() => onUpdateSettings({ lightingPreset: lp.id })}
                  className={`px-1.5 py-1 rounded text-center text-[10px] font-medium border transition-all ${
                    settings.lightingPreset === lp.id
                      ? 'bg-[#ea7600] text-white border-[#ea7600] shadow-sm'
                      : isDark
                      ? 'bg-[#2d2d2d] border-[#383838] text-neutral-300 hover:bg-[#383838]'
                      : 'bg-white border-[#dcdcdc] text-neutral-800 hover:bg-[#eaeaea]'
                  }`}
                >
                  {lp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Background Color */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-1.5">
              Viewport Canvas Background
            </label>
            <div className="flex items-center gap-1.5">
              {[
                { color: '#242424', name: 'Blender Studio Dark' },
                { color: '#181818', name: 'Charcoal' },
                { color: '#0a0a0a', name: 'Pitch Black' },
                { color: '#d8d8d8', name: 'Blender Studio Light' },
                { color: '#f0f0f0', name: 'Pure Bright' },
              ].map((bg) => (
                <button
                  key={bg.color}
                  type="button"
                  title={bg.name}
                  onClick={() => onUpdateSettings({ backgroundColor: bg.color })}
                  className={`w-6 h-6 rounded-md border-2 transition-transform ${
                    settings.backgroundColor === bg.color
                      ? 'border-[#ea7600] scale-110'
                      : 'border-neutral-500 hover:scale-105'
                  }`}
                  style={{ backgroundColor: bg.color }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
