import React from 'react';
import type { LoadedAnimationClip, LoopModeType, ThemeMode } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  FastForward,
  Film,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  SkipBack,
  SkipForward,
  User,
} from 'lucide-react';

interface FloatingPlaybackBarProps {
  clips: LoadedAnimationClip[];
  activeClipId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  loopMode: LoopModeType;
  themeMode: ThemeMode;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSelectClip: (id: string) => void;
  onChangeSpeed: (speed: number) => void;
  onChangeLoopMode: (mode: LoopModeType) => void;
  onResetToTPose: () => void;
}

export const FloatingPlaybackBar: React.FC<FloatingPlaybackBarProps> = ({
  clips,
  activeClipId,
  isPlaying,
  currentTime,
  duration,
  playbackSpeed,
  loopMode,
  themeMode,
  onTogglePlay,
  onSeek,
  onSelectClip,
  onChangeSpeed,
  onChangeLoopMode,
  onResetToTPose,
}) => {
  const isDark = themeMode === 'dark';
  const activeIndex = clips.findIndex((c) => c.id === activeClipId);
  const safeDuration = duration > 0 ? duration : 1.0;
  const progressPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));

  // Current frame at 30 FPS standard
  const currentFrame = Math.round(currentTime * 30);
  const totalFrames = Math.round(safeDuration * 30);

  // Format seconds to mm:ss.f
  const formatTime = (seconds: number): string => {
    const s = Math.max(0, seconds);
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    const tenths = Math.floor((s % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const handlePrevClip = () => {
    if (clips.length === 0) return;
    const prevIdx = activeIndex > 0 ? activeIndex - 1 : clips.length - 1;
    onSelectClip(clips[prevIdx].id);
  };

  const handleNextClip = () => {
    if (clips.length === 0) return;
    const nextIdx = activeIndex < clips.length - 1 ? activeIndex + 1 : 0;
    onSelectClip(clips[nextIdx].id);
  };

  const speeds = [0.25, 0.5, 1.0, 1.5, 2.0];

  const containerBg = isDark
    ? 'bg-[#242424]/95 border-[#3d3d3d] text-[#e0e0e0] shadow-black/50'
    : 'bg-[#eeeeee]/95 border-[#cccccc] text-[#222222] shadow-black/15';

  const subBtnBg = isDark
    ? 'bg-[#333333] hover:bg-[#404040] text-[#d4d4d4] hover:text-white border-[#444444]'
    : 'bg-[#e0e0e0] hover:bg-[#d0d0d0] text-[#333333] hover:text-black border-[#c8c8c8]';

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl pointer-events-none">
      <div
        id="playback-bar-container"
        className={`flex flex-col gap-2 p-3 rounded-xl border shadow-2xl backdrop-blur-xl pointer-events-auto transition-colors ${containerBg}`}
      >
        {/* ROW 1: DEDICATED FULL-WIDTH TIMELINE & FRAME SCRUBBER SLIDER */}
        <div className="flex flex-col gap-1 w-full px-0.5">
          {/* Scrubber Header Info (Frame Numbers & Time) */}
          <div className="flex items-center justify-between text-[11px] font-mono select-none px-1 text-neutral-400">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-[#ea7600]">Frame {currentFrame}</span>
              <span className="text-neutral-500">/</span>
              <span>{totalFrames}</span>
            </div>

            <div className="flex items-center gap-1.5 tabular-nums">
              <span className="font-semibold text-neutral-300">{formatTime(currentTime)}</span>
              <span className="text-neutral-500">/</span>
              <span>{formatTime(safeDuration)}</span>
            </div>
          </div>

          {/* Scrubber Range Slider Track */}
          <div className="relative flex items-center w-full group py-1">
            {/* Custom Track Background */}
            <div className="absolute left-0 right-0 h-2 rounded-full bg-neutral-700/60 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-[#ea7600] transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Native Slider Input */}
            <input
              id="playback-scrubber-slider"
              type="range"
              min={0}
              max={safeDuration}
              step={0.01}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              aria-label="Animation Frame Slider"
              className="relative w-full h-4 opacity-0 cursor-pointer z-10"
            />

            {/* Custom Thumb Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-[#ea7600] shadow-md pointer-events-none transition-transform group-hover:scale-110"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ROW 2: CONTROLS & ANIMATION PICKER (SEPARATE DEDICATED ROW) */}
        <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${
          isDark ? 'border-[#383838]' : 'border-[#d6d6d6]'
        }`}>
          {/* Left: Animation Clip Picker Dropdown + Step Buttons */}
          <div className="flex items-center gap-1.5 min-w-[220px] max-w-[280px]">
            <div className="flex items-center gap-1 shrink-0 text-[#ea7600]">
              <Film className="w-3.5 h-3.5" />
            </div>

            {clips.length > 0 ? (
              <div className="relative flex-1 min-w-0">
                <select
                  id="playback-clip-select"
                  value={activeClipId || ''}
                  onChange={(e) => onSelectClip(e.target.value)}
                  className={`w-full text-xs font-semibold rounded-md pl-2 pr-7 py-1 border focus:outline-none focus:border-[#ea7600] truncate cursor-pointer transition-colors appearance-none ${
                    isDark
                      ? 'bg-[#1c1c1c] text-[#dedede] border-[#383838] hover:border-[#555555]'
                      : 'bg-white text-[#222222] border-[#cccccc] hover:border-[#999999]'
                  }`}
                >
                  {clips.map((clip, idx) => (
                    <option key={clip.id} value={clip.id}>
                      {idx + 1}. {clip.name} ({clip.duration.toFixed(1)}s)
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400 text-[10px]">
                  ▼
                </div>
              </div>
            ) : (
              <span className="text-xs text-neutral-500 italic">No animations</span>
            )}

            {/* Prev / Next Clip Quick Arrows */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={handlePrevClip}
                disabled={clips.length <= 1}
                title="Previous Clip"
                className={`p-1 rounded border text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${subBtnBg}`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextClip}
                disabled={clips.length <= 1}
                title="Next Clip"
                className={`p-1 rounded border text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${subBtnBg}`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Center: Primary Playback & Transport Controls */}
          <div className="flex items-center gap-2">
            {/* T-Pose Reset Button */}
            <button
              id="playback-btn-tpose"
              type="button"
              onClick={onResetToTPose}
              title="Reset to T-Pose Rest Pose"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${subBtnBg}`}
            >
              <User className="w-3.5 h-3.5" />
              <span>T-Pose</span>
            </button>

            {/* Step to Start */}
            <button
              type="button"
              onClick={() => onSeek(0)}
              title="Go to Start (Frame 0)"
              className={`p-1.5 rounded-md border text-xs transition-colors ${subBtnBg}`}
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Play / Pause Toggle Button */}
            <button
              id="playback-btn-play-pause"
              type="button"
              onClick={onTogglePlay}
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              className="w-9 h-9 rounded-lg bg-[#ea7600] hover:bg-[#ff8500] text-white flex items-center justify-center shadow-md shadow-[#ea7600]/30 transition-all transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Loop Mode Toggle */}
            <button
              id="playback-btn-loop"
              type="button"
              onClick={() => {
                const nextMode: LoopModeType =
                  loopMode === 'repeat' ? 'once' : loopMode === 'once' ? 'pingpong' : 'repeat';
                onChangeLoopMode(nextMode);
              }}
              title={`Loop Mode: ${loopMode}`}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                loopMode === 'repeat'
                  ? 'text-[#ea7600] bg-[#ea7600]/15 border-[#ea7600]/40'
                  : loopMode === 'pingpong'
                  ? 'text-amber-500 bg-amber-500/15 border-amber-500/40'
                  : subBtnBg
              }`}
            >
              {loopMode === 'repeat' ? (
                <Repeat className="w-3.5 h-3.5" />
              ) : loopMode === 'once' ? (
                <Repeat1 className="w-3.5 h-3.5" />
              ) : (
                <FastForward className="w-3.5 h-3.5" />
              )}
              <span className="capitalize hidden sm:inline">{loopMode}</span>
            </button>
          </div>

          {/* Right: Playback Speed Presets */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] text-neutral-400 font-medium hidden md:inline">Speed:</span>
            <div className={`flex items-center rounded-md p-0.5 border ${
              isDark ? 'bg-[#1a1a1a] border-[#383838]' : 'bg-[#e0e0e0] border-[#cccccc]'
            }`}>
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeSpeed(s)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    playbackSpeed === s
                      ? 'bg-[#ea7600] text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-100'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
