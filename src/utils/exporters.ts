import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { ExportFormatType, LoadedAnimationClip, LoadedModelData } from '../types';
import { sanitizeKeyframeTrack, sanitizeNodeName } from './fbxProcessor';

export interface MultiExportOptions {
  filename: string;
  format: ExportFormatType;
  selectedClipIds: string[];
  includeAnimations: boolean;
  includeTexture: boolean;
  binary: boolean;
}

/**
 * Prepares a clean clone of the model hierarchy with proper skeleton binding,
 * preserving the exact pose currently seen in the viewport.
 */
function prepareExportRoot(modelData: LoadedModelData, includeTexture: boolean): THREE.Object3D {
  // Use SkeletonUtils to clone hierarchy and properly re-bind SkinnedMeshes to cloned Bones
  const exportRoot = SkeletonUtils.clone(modelData.rootObject);

  // Sanitize node names and ensure visibility
  exportRoot.traverse((node) => {
    if (node.name) {
      node.name = sanitizeNodeName(node.name);
    }
    if (node instanceof THREE.Mesh || node instanceof THREE.SkinnedMesh) {
      node.visible = true;
    }
  });

  exportRoot.updateMatrixWorld(true);

  // Validate and sanitize SkinnedMeshes
  exportRoot.traverse((node) => {
    if (node instanceof THREE.SkinnedMesh && node.skeleton) {
      const boneCount = node.skeleton.bones.length;

      // We DO NOT modify skinIndex or skinWeight here.
      // The FBXLoader handles the geometry indices. Modifying them here causes precision loss 
      // or incorrect index assignment leading to mesh tearing during export.
      
      node.skeleton.update();
    }
  });

  // Material and texture cleanup for 100% glTF 2.0 validator compatibility
  exportRoot.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.SkinnedMesh) {
      const originalMaterials = Array.isArray(node.material) ? node.material : [node.material];
      const newMaterials = originalMaterials.map((mat) => {
        if (!mat) return mat;
        // Clone material so we don't accidentally strip textures from the live viewport model
        const clonedMat = mat.clone();
        
        if (!includeTexture) {
          // If user chose not to include texture, strip texture maps
          if ('map' in clonedMat) clonedMat.map = null;
          if ('normalMap' in clonedMat) clonedMat.normalMap = null;
          if ('roughnessMap' in clonedMat) clonedMat.roughnessMap = null;
          if ('metalnessMap' in clonedMat) clonedMat.metalnessMap = null;
          if ('aoMap' in clonedMat) clonedMat.aoMap = null;
        } else {
          // If including textures, ensure that the image is valid and fully loaded
          if ('map' in clonedMat && clonedMat.map) {
            const tex = clonedMat.map as THREE.Texture;
            if (!tex.image || (tex.image instanceof HTMLImageElement && !tex.image.complete)) {
              // Texture is invalid or empty, remove to prevent GLTFExporter failure
              clonedMat.map = null;
            }
          }
        }
        clonedMat.needsUpdate = true;
        return clonedMat;
      });
      
      node.material = Array.isArray(node.material) ? newMaterials : newMaterials[0];
    }
  });

  return exportRoot;
}

/**
 * Prunes and validates animation tracks so only tracks matching actual nodes in the export hierarchy are exported.
 */
function prepareExportAnimations(
  exportRoot: THREE.Object3D,
  allClips: LoadedAnimationClip[],
  selectedClipIds: string[]
): THREE.AnimationClip[] {
  const existingNodeNames = new Set<string>();
  exportRoot.traverse((node) => {
    if (node.name) {
      existingNodeNames.add(node.name);
    }
  });

  const validClips: THREE.AnimationClip[] = [];

  allClips
    .filter((c) => selectedClipIds.includes(c.id))
    .forEach((loadedClip) => {
      const validTracks: THREE.KeyframeTrack[] = [];

      loadedClip.clip.tracks.forEach((track) => {
        const sanitized = sanitizeKeyframeTrack(track);
        if (!sanitized) return;

        const lastDot = sanitized.name.lastIndexOf('.');
        if (lastDot === -1) return;

        const targetNodeName = sanitized.name.substring(0, lastDot);
        if (!existingNodeNames.has(targetNodeName)) {
          return;
        }

        validTracks.push(sanitized);
      });

      if (validTracks.length > 0) {
        const sanitizedClip = new THREE.AnimationClip(
          loadedClip.name || loadedClip.clip.name || 'Animation',
          loadedClip.duration,
          validTracks
        );
        validClips.push(sanitizedClip);
      }
    });

  return validClips;
}

interface GLTFDocument {
  asset?: { version?: string; generator?: string };
  skins?: Array<{ skeleton?: number; joints?: number[] }>;
  animations?: Array<{ channels?: unknown[]; samplers?: unknown[] }>;
  [key: string]: unknown;
}

/**
 * Post-processes glTF JSON to ensure maximum compatibility with tools.
 */
function sanitizeGLTFJson(gltf: GLTFDocument): void {
  // 1. Set standard asset metadata
  if (!gltf.asset) gltf.asset = { version: '2.0' };
  gltf.asset.generator = 'FBX Animator Studio - glTF 2.0 Exporter';

  // 2. Clean animations: glTF 2.0 schema forbids animations with empty channels or samplers
  if (Array.isArray(gltf.animations)) {
    gltf.animations = gltf.animations.filter(
      (anim) => Array.isArray(anim.channels) && anim.channels.length > 0 && Array.isArray(anim.samplers) && anim.samplers.length > 0
    );
    if (gltf.animations.length === 0) {
      delete gltf.animations;
    }
  }
}

/**
 * Exports the 3D model into various formats (GLB, GLTF, OBJ, USDZ, PLY, STL, JSON)
 */
export async function export3DModel(
  modelData: LoadedModelData,
  allClips: LoadedAnimationClip[],
  options: MultiExportOptions
): Promise<{ blob: Blob; filename: string; size: number }> {
  const cleanBaseName = options.filename.replace(/\.[^/.]+$/, '').trim() || 'exported_model';

  // Prepare a fully self-contained, properly skinned export hierarchy
  const exportRoot = prepareExportRoot(modelData, options.includeTexture);

  // Prepare valid animation tracks matching exportRoot
  const selectedClips = options.includeAnimations
    ? prepareExportAnimations(exportRoot, allClips, options.selectedClipIds)
    : [];

  switch (options.format) {
    case 'glb':
    case 'gltf': {
      const exporter = new GLTFExporter();
      const isBinary = options.format === 'glb';

      return new Promise((resolve, reject) => {
        exporter.parse(
          exportRoot,
          (result) => {
            let blob: Blob;
            const ext = isBinary ? 'glb' : 'gltf';
            const finalFilename = `${cleanBaseName}.${ext}`;

            if (result instanceof ArrayBuffer) {
              blob = new Blob([result], { type: 'model/gltf-binary' });
            } else {
              const gltfDoc = result as GLTFDocument;
              sanitizeGLTFJson(gltfDoc);
              const str = JSON.stringify(gltfDoc, null, 2);
              blob = new Blob([str], { type: 'model/gltf+json' });
            }

            resolve({ blob, filename: finalFilename, size: blob.size });
          },
          (err) => {
            const errorMsg =
              err instanceof Error
                ? err.message
                : typeof err === 'object' && err !== null && 'message' in err
                ? String((err as { message: unknown }).message)
                : 'GLTF Export failed';
            reject(new Error(errorMsg));
          },
          {
            binary: isBinary,
            animations: selectedClips,
            embedImages: options.includeTexture,
            onlyVisible: false,
            truncateDrawRange: true,
          }
        );
      });
    }

    case 'obj': {
      const exporter = new OBJExporter();
      const result = exporter.parse(exportRoot);
      const blob = new Blob([result], { type: 'text/plain' });
      return {
        blob,
        filename: `${cleanBaseName}.obj`,
        size: blob.size,
      };
    }

    case 'usdz': {
      const exporter = new USDZExporter();
      const uint8Array = await exporter.parseAsync(exportRoot, {
        animations: selectedClips,
        quickLookCompatible: true,
      });
      const blob = new Blob([uint8Array], { type: 'model/vnd.usdz+zip' });
      return {
        blob,
        filename: `${cleanBaseName}.usdz`,
        size: blob.size,
      };
    }

    case 'ply': {
      const exporter = new PLYExporter();
      return new Promise((resolve) => {
        exporter.parse(
          exportRoot,
          (result) => {
            let blob: Blob;
            if (result instanceof ArrayBuffer) {
              blob = new Blob([result], { type: 'application/octet-stream' });
            } else {
              blob = new Blob([result], { type: 'text/plain' });
            }
            resolve({
              blob,
              filename: `${cleanBaseName}.ply`,
              size: blob.size,
            });
          },
          { binary: true }
        );
      });
    }

    case 'stl': {
      const exporter = new STLExporter();
      const result = exporter.parse(exportRoot, { binary: true });
      const blob = new Blob([result.buffer], { type: 'application/octet-stream' });
      return {
        blob,
        filename: `${cleanBaseName}.stl`,
        size: blob.size,
      };
    }

    case 'json': {
      const data = allClips.map((c) => ({
        name: c.name,
        duration: c.duration,
        tracksCount: c.tracksCount,
        sourceFile: c.sourceFile,
        tracks: c.clip.tracks.map((t) => ({
          name: t.name,
          type: t.ValueTypeName,
          timesCount: t.times.length,
          valuesCount: t.values.length,
        })),
      }));

      const str = JSON.stringify(
        {
          model: modelData.fileName,
          exportedAt: new Date().toISOString(),
          animationsCount: data.length,
          animations: data,
        },
        null,
        2
      );
      const blob = new Blob([str], { type: 'application/json' });
      return {
        blob,
        filename: `${cleanBaseName}_animations.json`,
        size: blob.size,
      };
    }

    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

/**
 * Downloads a Blob directly to disk
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
