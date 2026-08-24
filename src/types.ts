import type * as THREE from 'three';

export type ExportFormatType = 'glb' | 'gltf' | 'obj' | 'usdz' | 'ply' | 'stl' | 'json';

export interface LoadedAnimationClip {
  id: string;
  name: string;
  originalName: string;
  duration: number;
  tracksCount: number;
  sourceFile: string;
  clip: THREE.AnimationClip;
  matchedTracksCount?: number;
  unmatchedTracksCount?: number;
}

export interface GlobalTextureInfo {
  name: string;
  url: string | null;
  texture: THREE.Texture | null;
  repeat: number;
  color: string;
  roughness: number;
  metalness: number;
}

export interface ModelBoneInfo {
  name: string;
  index: number;
  parentName: string | null;
  childrenNames: string[];
  type: string;
}

export interface LoadedModelData {
  fileName: string;
  fileSize: number;
  rootObject: THREE.Group | THREE.Object3D;
  skinnedMeshes: THREE.SkinnedMesh[];
  bones: ModelBoneInfo[];
  hasSkeleton: boolean;
  vertexCount: number;
  triangleCount: number;
  originalAnimations: LoadedAnimationClip[];
}

export type ShadingMode = 'textured' | 'wireframe' | 'normal' | 'matcap';
export type LightingPreset = 'studio' | 'sunset' | 'cyber' | 'flat' | 'dramatic';
export type LoopModeType = 'repeat' | 'once' | 'pingpong';
export type ThemeMode = 'dark' | 'light';

export interface ViewportSettings {
  showGrid: boolean;
  showSkeleton: boolean;
  showShadows: boolean;
  shadingMode: ShadingMode;
  lightingPreset: LightingPreset;
  backgroundColor: string;
  lightIntensity: number;
  autoRotate: boolean;
  themeMode: ThemeMode;
}
