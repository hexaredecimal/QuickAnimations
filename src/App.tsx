import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type {
  GlobalTextureInfo,
  LoadedAnimationClip,
  LoadedModelData,
  LoopModeType,
  ThemeMode,
  ViewportSettings,
} from './types';
import { parseBaseModelFBX, parseAnimationFBX } from './utils/fbxProcessor';
import { Viewport3D, type Viewport3DHandle } from './components/Viewport3D';
import { FloatingTopNav } from './components/FloatingTopNav';
import { LeftHierarchyTree } from './components/LeftHierarchyTree';
import { FloatingPlaybackBar } from './components/FloatingPlaybackBar';
import { FloatingViewportControls } from './components/FloatingViewportControls';
import { MultiFormatExportModal } from './components/MultiFormatExportModal';
import { HelpModal } from './components/HelpModal';
import { AlertCircle, CheckCircle2, Sparkles, UploadCloud, Film } from 'lucide-react';

export default function App() {
  // Theme Mode ('dark' default Blender 2.0 theme, or 'light')
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  // 3D Model & Animations State
  const [modelData, setModelData] = useState<LoadedModelData | null>(null);
  const [animationClips, setAnimationClips] = useState<LoadedAnimationClip[]>([]);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);

  // Global Single Texture State (applied to all meshes uniformly)
  const [globalTexture, setGlobalTexture] = useState<GlobalTextureInfo>({
    name: 'No Texture',
    url: null,
    texture: null,
    repeat: 1,
    color: '#ffffff',
    roughness: 0.65,
    metalness: 0.1,
  });

  // Playback State
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [loopMode, setLoopMode] = useState<LoopModeType>('repeat');

  // UI Panels & Modals State
  const [isTreeOpen, setIsTreeOpen] = useState<boolean>(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Full-screen Drag & Drop state
  const [isWindowDragging, setIsWindowDragging] = useState<boolean>(false);

  // Viewport Settings
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    showGrid: true,
    showSkeleton: false,
    showShadows: true,
    shadingMode: 'textured',
    lightingPreset: 'studio',
    backgroundColor: '#242424',
    lightIntensity: 1.0,
    autoRotate: false,
    themeMode: 'dark',
  });

  // Notification Toast
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // DOM & Canvas Refs
  const baseFileInputRef = useRef<HTMLInputElement>(null);
  const animFileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<Viewport3DHandle>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Toggle Dark / Light Theme
  const handleToggleTheme = () => {
    const newTheme: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    setViewportSettings((prev) => ({
      ...prev,
      themeMode: newTheme,
      backgroundColor: newTheme === 'dark' ? '#242424' : '#d8d8d8',
    }));
    showToast(`Switched to Blender ${newTheme === 'dark' ? 'Dark' : 'Light'} Mode`, 'info');
  };

  // Startup without any sample models

  // Keyboard Shortcuts (Space for play/pause, ESC to close modals, 1/3/7 for camera angles)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'Escape') {
        setIsExportModalOpen(false);
        setIsHelpModalOpen(false);
      } else if (e.key === '1') {
        viewportRef.current?.setCameraView('front');
      } else if (e.key === '3') {
        viewportRef.current?.setCameraView('side');
      } else if (e.key === '7') {
        viewportRef.current?.setCameraView('top');
      } else if (e.key === '0') {
        viewportRef.current?.setCameraView('reset');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load Base FBX Model
  const handleLoadBaseModel = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const loaded = await parseBaseModelFBX(buffer, file.name, file.size);

      setModelData(loaded);
      setAnimationClips(loaded.originalAnimations);

      if (loaded.originalAnimations.length > 0) {
        setActiveClipId(loaded.originalAnimations[0].id);
        setDuration(loaded.originalAnimations[0].duration);
      } else {
        setActiveClipId(null);
        setDuration(1.0);
      }

      setCurrentTime(0);
      setIsPlaying(true);
      showToast(`Base FBX model "${file.name}" loaded (${loaded.bones.length} bones)`, 'success');
    } catch (err) {
      console.error('Failed to parse base model FBX:', err);
      showToast(`Failed to parse FBX model: ${(err as Error).message}`, 'error');
    }
  };

  // Add Multiple Animation FBX files in batch
  const handleLoadAnimationFiles = async (files: FileList | File[]) => {
    if (!modelData) {
      showToast('Please open a base FBX model first before merging animations.', 'error');
      return;
    }

    const fileList = Array.from(files).filter((f) => f.name.toLowerCase().endsWith('.fbx'));
    if (fileList.length === 0) {
      showToast('Please select valid .fbx files.', 'error');
      return;
    }

    showToast(`Processing ${fileList.length} animation file(s)...`, 'info');

    let addedCount = 0;
    const newClips: LoadedAnimationClip[] = [...animationClips];
    const errors: string[] = [];
    const addedNames: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      try {
        const buffer = await file.arrayBuffer();
        const extractedClips = await parseAnimationFBX(buffer, file.name, modelData);

        extractedClips.forEach((clip) => {
          newClips.push(clip);
          addedCount++;
          addedNames.push(clip.name);
        });
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`);
      }
    }

    setAnimationClips(newClips);

    if (addedCount > 0) {
      const lastAdded = newClips[newClips.length - 1];
      setActiveClipId(lastAdded.id);
      setDuration(lastAdded.duration);
      setCurrentTime(0);
      setIsPlaying(true);
      showToast(
        `Batch merged ${addedCount} animation(s): ${addedNames.slice(0, 3).join(', ')}${
          addedNames.length > 3 ? ` and ${addedNames.length - 3} more` : ''
        }`,
        'success'
      );
    }

    if (errors.length > 0) {
      showToast(`Some animations failed: ${errors.join(', ')}`, 'error');
    }
  };

  // Handle Full Window Drag & Drop
  const handleWindowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWindowDragging(true);
  };

  const handleWindowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving window
    if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
      setIsWindowDragging(false);
    }
  };

  const handleWindowDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWindowDragging(false);

    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const files: File[] = Array.from(e.dataTransfer.files);
    const fbxFiles = files.filter((f) => f.name.toLowerCase().endsWith('.fbx'));
    const imageFiles = files.filter((f) =>
      /\.(png|jpe?g|webp)$/i.test(f.name.toLowerCase())
    );

    // If texture image dropped
    if (imageFiles.length > 0) {
      handleApplyTextureFile(imageFiles[0]);
    }

    // If FBX files dropped
    if (fbxFiles.length > 0) {
      if (!modelData) {
        // First file is base model, remaining are animations
        await handleLoadBaseModel(fbxFiles[0]);
        if (fbxFiles.length > 1) {
          setTimeout(() => {
            handleLoadAnimationFiles(fbxFiles.slice(1));
          }, 300);
        }
      } else {
        // Model already loaded: batch load all as animations
        handleLoadAnimationFiles(fbxFiles);
      }
    }
  };

  // Apply Single Global Texture to entire model
  const handleApplyTextureFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      objectUrl,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.wrapS = THREE.RepeatWrapping;
        loadedTex.wrapT = THREE.RepeatWrapping;
        loadedTex.needsUpdate = true;

        setGlobalTexture({
          name: file.name,
          url: objectUrl,
          texture: loadedTex,
          repeat: 1,
          color: '#ffffff',
          roughness: 0.65,
          metalness: 0.1,
        });

        showToast(`Applied texture "${file.name}" to model`, 'success');
      },
      undefined,
      (err) => {
        console.error('Texture load error:', err);
        showToast('Failed to load image as texture', 'error');
      }
    );
  };

  // Clear single texture
  const handleClearTexture = () => {
    if (globalTexture.url) {
      URL.revokeObjectURL(globalTexture.url);
    }
    setGlobalTexture({
      name: 'No Texture',
      url: null,
      texture: null,
      repeat: 1,
      color: '#ffffff',
      roughness: 0.65,
      metalness: 0.1,
    });
    showToast('Removed global texture', 'info');
  };

  // Animation Management
  const handleSelectClip = (id: string) => {
    setActiveClipId(id);
    const clip = animationClips.find((c) => c.id === id);
    if (clip) {
      setDuration(clip.duration);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  };

  const handleRenameClip = (id: string, newName: string) => {
    setAnimationClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
    showToast(`Renamed clip to "${newName}"`, 'info');
  };

  const handleDeleteClip = (id: string) => {
    const remaining = animationClips.filter((c) => c.id !== id);
    setAnimationClips(remaining);
    if (activeClipId === id) {
      if (remaining.length > 0) {
        setActiveClipId(remaining[0].id);
        setDuration(remaining[0].duration);
      } else {
        setActiveClipId(null);
        setDuration(1.0);
      }
    }
    showToast('Animation removed', 'info');
  };

  const handleDuplicateClip = (id: string) => {
    const clip = animationClips.find((c) => c.id === id);
    if (!clip) return;

    const dup: LoadedAnimationClip = {
      ...clip,
      id: `anim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${clip.name} (Copy)`,
      clip: clip.clip.clone(),
    };

    setAnimationClips((prev) => [...prev, dup]);
    setActiveClipId(dup.id);
    showToast(`Duplicated clip as "${dup.name}"`, 'info');
  };

  const handleClearAllClips = () => {
    setAnimationClips([]);
    setActiveClipId(null);
    setDuration(1.0);
    setCurrentTime(0);
    showToast('Cleared all animations', 'info');
  };

  const handleResetToTPose = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleTimeUpdate = (time: number, newDuration: number) => {
    setCurrentTime(time);
    if (newDuration > 0 && Math.abs(duration - newDuration) > 0.05) {
      setDuration(newDuration);
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.error(err));
      setIsFullscreen(false);
    }
  };

  const isDark = themeMode === 'dark';

  return (
    <div
      onDragOver={handleWindowDragOver}
      onDragLeave={handleWindowDragLeave}
      onDrop={handleWindowDrop}
      className={`relative w-screen h-screen font-sans overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#1e1e1e] text-[#dedede]' : 'bg-[#e0e0e0] text-[#1f1f1f]'
      }`}
    >
      {/* Hidden File Pickers */}
      <input
        ref={baseFileInputRef}
        type="file"
        accept=".fbx"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleLoadBaseModel(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
        id="app-base-file-input"
      />
      <input
        ref={animFileInputRef}
        type="file"
        multiple
        accept=".fbx"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleLoadAnimationFiles(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
        id="app-anim-file-input"
      />
      <input
        ref={textureFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleApplyTextureFile(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
        id="app-texture-file-input"
      />

      {/* 1. Full-Screen 3D Viewport */}
      <Viewport3D
        ref={viewportRef}
        modelData={modelData}
        animationClips={animationClips}
        activeClipId={activeClipId}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        loopMode={loopMode}
        currentTime={currentTime}
        globalTexture={globalTexture}
        onTimeUpdate={handleTimeUpdate}
        onSeek={(t) => setCurrentTime(t)}
        viewportSettings={viewportSettings}
        onUpdateViewportSettings={(newSet) =>
          setViewportSettings((prev) => ({ ...prev, ...newSet }))
        }
      />

      {/* 2. Floating Top Navigation Bar (Blender Theme) */}
      <FloatingTopNav
        onOpenBaseFilePicker={() => baseFileInputRef.current?.click()}
        onOpenAnimFilePicker={() => animFileInputRef.current?.click()}
        onOpenTexturePicker={() => textureFileInputRef.current?.click()}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onResetCamera={() => viewportRef.current?.setCameraView('reset')}
        hasModel={!!modelData}
        clipsCount={animationClips.length}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
      />

      {/* 3. Left Hierarchy Tree / Blender Outliner */}
      <LeftHierarchyTree
        modelData={modelData}
        animationClips={animationClips}
        activeClipId={activeClipId}
        isPlaying={isPlaying}
        globalTexture={globalTexture}
        showSkeleton={viewportSettings.showSkeleton}
        themeMode={themeMode}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onSelectClip={handleSelectClip}
        onRenameClip={handleRenameClip}
        onDeleteClip={handleDeleteClip}
        onDuplicateClip={handleDuplicateClip}
        onAddAnimationFiles={handleLoadAnimationFiles}
        onClearAllClips={handleClearAllClips}
        onApplyTextureFile={handleApplyTextureFile}
        onClearTexture={handleClearTexture}
        onToggleSkeleton={(show) => setViewportSettings((s) => ({ ...s, showSkeleton: show }))}
        onOpenBaseModelPicker={() => baseFileInputRef.current?.click()}
        isOpen={isTreeOpen}
        onToggleOpen={() => setIsTreeOpen(!isTreeOpen)}
      />

      {/* 4. Floating Viewport Right Controls */}
      <FloatingViewportControls
        settings={viewportSettings}
        onUpdateSettings={(newSet) =>
          setViewportSettings((prev) => ({ ...prev, ...newSet }))
        }
        onSetCameraView={(view) => viewportRef.current?.setCameraView(view)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* 5. Floating Bottom Timeline & Playback Bar */}
      <FloatingPlaybackBar
        clips={animationClips}
        activeClipId={activeClipId}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playbackSpeed={playbackSpeed}
        loopMode={loopMode}
        themeMode={themeMode}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onSeek={(t) => setCurrentTime(t)}
        onSelectClip={handleSelectClip}
        onChangeSpeed={(s) => setPlaybackSpeed(s)}
        onChangeLoopMode={(m) => setLoopMode(m)}
        onResetToTPose={handleResetToTPose}
      />

      {/* Full-Window Drag & Drop Overlay */}
      {isWindowDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md pointer-events-none animate-in fade-in duration-150">
          <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-[#282828] border-2 border-dashed border-[#ea7600] text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#ea7600]/20 flex items-center justify-center text-[#ea7600] animate-bounce">
              <Film className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Drop FBX Animations or Model</h3>
              <p className="text-xs text-neutral-300 mt-1 max-w-sm">
                Drop multiple skinless FBX files to batch merge them, or drop texture images to apply globally
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#ea7600] bg-[#ea7600]/10 px-2.5 py-1 rounded border border-[#ea7600]/30">
              Batch Multi-File Import Active
            </span>
          </div>
        </div>
      )}

      {/* Multi-Format Export Modal */}
      <MultiFormatExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        modelData={modelData}
        animationClips={animationClips}
        themeMode={themeMode}
      />

      {/* Help / Guide Modal */}
      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        themeMode={themeMode}
      />

      {/* Notification Toast */}
      {notification && (
        <div
          id="app-notification-toast"
          className={`fixed bottom-20 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-2xl backdrop-blur-xl text-xs font-semibold animate-in slide-in-from-bottom-5 duration-200 ${
            notification.type === 'success'
              ? 'bg-[#1c2c1c] text-emerald-300 border-emerald-500/50'
              : notification.type === 'error'
              ? 'bg-[#2c1c1c] text-rose-300 border-rose-500/50'
              : isDark
              ? 'bg-[#282828] text-neutral-200 border-[#444444]'
              : 'bg-[#eeeeee] text-neutral-800 border-[#cccccc]'
          }`}
        >
          {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {notification.type === 'info' && <Sparkles className="w-4 h-4 text-[#ea7600] shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
}
