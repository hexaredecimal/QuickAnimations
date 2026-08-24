import React, { useState } from 'react';
import type { ExportFormatType, LoadedAnimationClip, LoadedModelData, ThemeMode } from '../types';
import { export3DModel, triggerFileDownload } from '../utils/exporters';
import {
  AlertCircle,
  Box,
  Check,
  CheckCircle2,
  Download,
  FileCode,
  Layers,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';

interface MultiFormatExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelData: LoadedModelData | null;
  animationClips: LoadedAnimationClip[];
  themeMode: ThemeMode;
}

export const MultiFormatExportModal: React.FC<MultiFormatExportModalProps> = ({
  isOpen,
  onClose,
  modelData,
  animationClips,
  themeMode,
}) => {
  const isDark = themeMode === 'dark';
  const [filename, setFilename] = useState(
    modelData?.fileName ? modelData.fileName.replace(/\.[^/.]+$/, '') + '_merged' : 'character_merged'
  );
  const [format, setFormat] = useState<ExportFormatType>('glb');
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>(
    animationClips.map((c) => c.id)
  );
  const [includeTexture, setIncludeTexture] = useState(true);
  const [includeAnimations, setIncludeAnimations] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !modelData) return null;

  const formats: {
    id: ExportFormatType;
    label: string;
    ext: string;
    desc: string;
    supportsAnim: boolean;
    badge?: string;
  }[] = [
    {
      id: 'glb',
      label: 'GLB (Binary glTF 2.0)',
      ext: '.glb',
      desc: 'All-in-one standard 3D format with mesh, skeleton, animations & texture. Compatible with Unity, Unreal, Blender, Godot, Three.js.',
      supportsAnim: true,
      badge: 'Recommended',
    },
    {
      id: 'gltf',
      label: 'glTF (JSON format)',
      ext: '.gltf',
      desc: 'Standard JSON-based glTF 2.0 scene with embedded buffers and animation tracks.',
      supportsAnim: true,
    },
    {
      id: 'obj',
      label: 'OBJ (Wavefront)',
      ext: '.obj',
      desc: 'Universal 3D geometry mesh file format. Widely supported across all 3D modeling tools.',
      supportsAnim: false,
    },
    {
      id: 'usdz',
      label: 'USDZ (Apple AR / iOS)',
      ext: '.usdz',
      desc: 'Universal Scene Description zip format for iOS Augmented Reality, Quick Look, and Reality Composer.',
      supportsAnim: false,
    },
    {
      id: 'ply',
      label: 'PLY (Polygon File)',
      ext: '.ply',
      desc: 'Polygon file format for point clouds, 3D scanning, and mesh processing.',
      supportsAnim: false,
    },
    {
      id: 'stl',
      label: 'STL (Stereolithography)',
      ext: '.stl',
      desc: 'Standard format for 3D Printing, CAD, and rapid prototyping.',
      supportsAnim: false,
    },
    {
      id: 'json',
      label: 'JSON (Animation Manifest)',
      ext: '.json',
      desc: 'Exports clean JSON metadata of all animation clips, keyframe tracks, and bone names.',
      supportsAnim: true,
    },
  ];

  const handleToggleClip = (id: string) => {
    setSelectedClipIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllClips = () => {
    setSelectedClipIds(animationClips.map((c) => c.id));
  };

  const handleDeselectAllClips = () => {
    setSelectedClipIds([]);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);
    setExportSuccess(null);

    try {
      const result = await export3DModel(modelData, animationClips, {
        filename: filename.trim() || 'character_merged',
        format,
        selectedClipIds,
        includeAnimations,
        includeTexture,
        binary: format === 'glb',
      });

      triggerFileDownload(result.blob, result.filename);

      setExportSuccess(`Successfully generated and downloaded ${result.filename}!`);
      setTimeout(() => {
        setIsExporting(false);
      }, 800);
    } catch (err) {
      console.error('Export failed:', err);
      setErrorMessage(`Export failed: ${(err as Error).message || 'Unknown error'}`);
      setIsExporting(false);
    }
  };

  const activeFormatObj = formats.find((f) => f.id === format);

  const modalBg = isDark
    ? 'bg-[#222222] border-[#383838] text-[#dedede]'
    : 'bg-[#f4f4f4] border-[#cccccc] text-[#222222]';

  const cardBg = isDark
    ? 'bg-[#1b1b1b] border-[#303030]'
    : 'bg-white border-[#dcdcdc]';

  const headerBg = isDark
    ? 'bg-[#2a2a2a] border-[#383838]'
    : 'bg-[#e8e8e8] border-[#d0d0d0]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        id="export-modal-container"
        className={`w-full max-w-2xl border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b ${headerBg}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#ea7600] flex items-center justify-center text-white shadow-sm shadow-[#ea7600]/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Export 3D Model & Merged Animations
              </h3>
              <p className="text-[11px] text-neutral-400">
                Generate glTF/GLB, OBJ, USDZ, STL with unified animation tracks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* File Name & Format Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* File Name Input */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Export File Name
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="export-filename-input"
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="character_merged"
                  className={`w-full px-3 py-1.5 rounded-md border text-xs font-semibold focus:outline-none focus:border-[#ea7600] ${
                    isDark ? 'bg-[#181818] border-[#383838] text-white' : 'bg-white border-[#cccccc] text-black'
                  }`}
                />
                <span className="font-mono text-neutral-400 font-bold shrink-0">
                  {activeFormatObj?.ext}
                </span>
              </div>
            </div>

            {/* Target Platform / Engine Tag */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Compatibility Target
              </label>
              <div className={`px-3 py-1.5 rounded-md border text-xs font-medium ${cardBg}`}>
                {format === 'glb' || format === 'gltf'
                  ? 'Unity, Unreal, Blender, Godot, Web (Full Skeleton & Anims)'
                  : format === 'usdz'
                  ? 'Apple iOS QuickLook, ARKit, VisionOS'
                  : format === 'stl'
                  ? '3D Slicers, 3D Printers, CAD Tools'
                  : 'Universal Mesh Geometries'}
              </div>
            </div>
          </div>

          {/* Format Picker Grid */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Select Output Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {formats.map((fmt) => {
                const isSelected = format === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setFormat(fmt.id)}
                    className={`p-2.5 rounded-lg border text-left transition-all relative ${
                      isSelected
                        ? 'bg-[#ea7600]/15 border-[#ea7600] ring-1 ring-[#ea7600]'
                        : isDark
                        ? 'bg-[#1a1a1a] border-[#303030] hover:bg-[#252525]'
                        : 'bg-white border-[#cccccc] hover:bg-[#efefef]'
                    }`}
                  >
                    {fmt.badge && (
                      <span className="absolute top-1.5 right-1.5 text-[8px] bg-[#ea7600] text-white px-1 py-0.2 rounded font-bold uppercase">
                        {fmt.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-xs">{fmt.ext}</span>
                      {fmt.supportsAnim && (
                        <span className="text-[9px] text-emerald-500 font-bold">● Anim</span>
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                      {fmt.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Format Description Banner */}
          {activeFormatObj && (
            <div className={`p-2.5 rounded-lg border text-xs space-y-1 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#ea7600]">
                  {activeFormatObj.label}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {activeFormatObj.supportsAnim ? 'Supports Multi-Track Animations' : 'Static Mesh Geometry'}
                </span>
              </div>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                {activeFormatObj.desc}
              </p>
            </div>
          )}

          {/* Animations Included Selection (if format supports anim) */}
          {activeFormatObj?.supportsAnim && animationClips.length > 0 && (
            <div className={`p-3 rounded-lg border space-y-2.5 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="export-toggle-include-anim"
                    type="checkbox"
                    checked={includeAnimations}
                    onChange={(e) => setIncludeAnimations(e.target.checked)}
                    className="w-3.5 h-3.5 accent-[#ea7600] rounded cursor-pointer"
                  />
                  <label
                    htmlFor="export-toggle-include-anim"
                    className="font-bold text-xs cursor-pointer select-none"
                  >
                    Include Merged Animations ({selectedClipIds.length} / {animationClips.length})
                  </label>
                </div>

                {includeAnimations && (
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={handleSelectAllClips}
                      className="text-[#ea7600] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-500">|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllClips}
                      className="text-neutral-400 hover:text-neutral-200"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>

              {includeAnimations && (
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {animationClips.map((clip) => {
                    const isChecked = selectedClipIds.includes(clip.id);
                    return (
                      <div
                        key={clip.id}
                        onClick={() => handleToggleClip(clip.id)}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer border transition-colors ${
                          isChecked
                            ? isDark
                              ? 'bg-[#ea7600]/15 border-[#ea7600]/40 text-white'
                              : 'bg-[#ea7600]/10 border-[#ea7600]/40 text-black'
                            : isDark
                            ? 'bg-[#181818] border-[#2b2b2b] text-neutral-400 hover:bg-[#252525]'
                            : 'bg-[#f4f4f4] border-[#e0e0e0] text-neutral-600 hover:bg-[#eaeaea]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-3 h-3 accent-[#ea7600] rounded pointer-events-none"
                          />
                          <span className="font-semibold truncate text-[11px]">
                            {clip.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono shrink-0 ml-2">
                          {clip.duration.toFixed(1)}s ({clip.clip.tracks.length} tracks)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Success / Error Banners */}
          {exportSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{exportSuccess}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t flex items-center justify-between shrink-0 ${headerBg}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
              isDark
                ? 'bg-[#333333] hover:bg-[#3f3f3f] border-[#444444] text-neutral-300'
                : 'bg-[#dddddd] hover:bg-[#d0d0d0] border-[#c0c0c0] text-neutral-800'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#ea7600] hover:bg-[#ff8500] text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download {activeFormatObj?.ext.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
