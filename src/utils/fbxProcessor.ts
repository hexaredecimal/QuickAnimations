import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { LoadedAnimationClip, LoadedModelData, ModelBoneInfo } from '../types';

/**
 * Normalizes bone or track names for matching (e.g. mixamorig:Hips -> hips, Armature_Hips -> hips)
 */
export function normalizeBoneName(name: string): string {
  return name
    .replace(/^.*[:|/\\]/, '') // remove prefix namespace like "mixamorig:" or "Armature|"
    .replace(/[^a-zA-Z0-9]/g, '') // remove special characters
    .toLowerCase();
}

/**
 * Sanitizes node and bone names for 100% glTF 2.0 and Three.js PropertyBinding compatibility.
 * Replaces colons, pipes, and slashes that break Three.js property binding and Blender armatures.
 */
export function sanitizeNodeName(name: string): string {
  if (!name) return 'Node';
  return name.replace(/[:|/\\]/g, '_').trim();
}

/**
 * Sanitizes keyframe track times and values to guarantee glTF 2.0 and Blender compatibility:
 * - Timestamps strictly monotonic (times[i] < times[i+1])
 * - Normalized quaternions (4-element vectors)
 * - 3-element positions / scales
 * - No NaN or Infinite values
 */
export function sanitizeKeyframeTrack(track: THREE.KeyframeTrack): THREE.KeyframeTrack | null {
  const lastDot = track.name.lastIndexOf('.');
  if (lastDot === -1) return null;

  const rawNodeName = track.name.substring(0, lastDot);
  const prop = track.name.substring(lastDot + 1);

  // Only allow valid glTF target properties
  if (prop !== 'quaternion' && prop !== 'position' && prop !== 'scale') {
    return null;
  }

  const times = track.times;
  const values = track.values;
  if (!times || times.length === 0 || !values || values.length === 0) {
    return null;
  }

  const itemSize = prop === 'quaternion' ? 4 : 3;
  if (values.length !== times.length * itemSize) {
    return null;
  }

  const cleanTimes: number[] = [];
  const cleanValues: number[] = [];

  let lastTime = -Infinity;
  for (let i = 0; i < times.length; i++) {
    const t = Number(times[i]);
    if (isNaN(t) || !isFinite(t)) continue;

    let adjustedT = t;
    if (adjustedT <= lastTime) {
      if (adjustedT === lastTime && cleanTimes.length > 0) {
        const valOffset = (cleanTimes.length - 1) * itemSize;
        const srcOffset = i * itemSize;
        for (let k = 0; k < itemSize; k++) {
          cleanValues[valOffset + k] = Number(values[srcOffset + k]);
        }
        continue;
      }
      adjustedT = lastTime + 0.0001;
    }

    const valOffset = i * itemSize;
    let hasNaN = false;
    const v: number[] = [];
    for (let k = 0; k < itemSize; k++) {
      const val = Number(values[valOffset + k]);
      if (isNaN(val) || !isFinite(val)) {
        hasNaN = true;
        break;
      }
      v.push(val);
    }
    if (hasNaN) continue;

    if (prop === 'quaternion') {
      const lenSq = v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3];
      if (lenSq > 0.000001) {
        const len = Math.sqrt(lenSq);
        v[0] /= len;
        v[1] /= len;
        v[2] /= len;
        v[3] /= len;
      } else {
        v[0] = 0;
        v[1] = 0;
        v[2] = 0;
        v[3] = 1;
      }
    }

    cleanTimes.push(adjustedT);
    for (let k = 0; k < itemSize; k++) {
      cleanValues.push(v[k]);
    }
    lastTime = adjustedT;
  }

  if (cleanTimes.length === 0) return null;

  const sanitizedNodeName = sanitizeNodeName(rawNodeName);
  const sanitizedTrackName = `${sanitizedNodeName}.${prop}`;

  if (prop === 'quaternion') {
    return new THREE.QuaternionKeyframeTrack(sanitizedTrackName, cleanTimes, cleanValues);
  } else {
    return new THREE.VectorKeyframeTrack(sanitizedTrackName, cleanTimes, cleanValues);
  }
}

/**
 * Cleanly formats a filename into a default display name without extension
 */
export function formatNameFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, '')
    .trim();
}

/**
 * Parses an FBX ArrayBuffer representing the base model (T-Pose)
 */
export async function parseBaseModelFBX(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number
): Promise<LoadedModelData> {
  const loader = new FBXLoader();
  const rootObject = loader.parse(buffer, '');

  let vertexCount = 0;
  let triangleCount = 0;
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const bones: ModelBoneInfo[] = [];
  const boneMap = new Map<string, THREE.Bone>();

  // Sanitize node and bone names, cache rest transforms
  rootObject.traverse((child) => {
    if (child.name) {
      child.userData.originalName = child.name;
      child.name = sanitizeNodeName(child.name);
    }
    if (child instanceof THREE.Bone) {
      boneMap.set(child.name, child);
    }
    // Store pristine rest transforms for accurate exporter rest pose and bind recovery
    child.userData.restPosition = child.position.clone();
    child.userData.restQuaternion = child.quaternion.clone();
    child.userData.restScale = child.scale.clone();
  });

  // Convert materials to standard MeshStandardMaterial
  rootObject.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh || child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child instanceof THREE.SkinnedMesh) {
        skinnedMeshes.push(child);
      }

      if (child.geometry) {
        const geom = child.geometry;
        if (geom.attributes.position) {
          vertexCount += geom.attributes.position.count;
        }
        if (geom.index) {
          triangleCount += geom.index.count / 3;
        } else if (geom.attributes.position) {
          triangleCount += geom.attributes.position.count / 3;
        }
      }

      // Convert material(s)
      const rawMaterials = Array.isArray(child.material) ? child.material : [child.material];
      const convertedMaterials: THREE.MeshStandardMaterial[] = [];

      rawMaterials.forEach((origMat, idx) => {
        if (!origMat) return;
        const matName = origMat.name || `${child.name}_Mat_${idx + 1}`;
        
        let baseColor = '#e2e8f0';
        let origMap: THREE.Texture | null = null;
        let origNormal: THREE.Texture | null = null;

        if ('color' in origMat && origMat.color instanceof THREE.Color) {
          baseColor = '#' + origMat.color.getHexString();
        }
        if ('map' in origMat && origMat.map) {
          origMap = origMat.map as THREE.Texture;
        }
        if ('normalMap' in origMat && origMat.normalMap) {
          origNormal = origMat.normalMap as THREE.Texture;
        }

        const standardMat = new THREE.MeshStandardMaterial({
          name: matName,
          color: new THREE.Color(baseColor),
          roughness: 0.65,
          metalness: 0.1,
          map: origMap,
          normalMap: origNormal,
          side: THREE.FrontSide,
        });

        convertedMaterials.push(standardMat);
      });

      child.material = Array.isArray(child.material) ? convertedMaterials : convertedMaterials[0];
    }
  });

  // Extract bone hierarchy
  let bIdx = 0;
  boneMap.forEach((bone) => {
    const parent = bone.parent instanceof THREE.Bone ? bone.parent.name : null;
    const childrenNames = bone.children
      .filter((c): c is THREE.Bone => c instanceof THREE.Bone)
      .map((c) => c.name);

    bones.push({
      name: bone.name,
      index: bIdx++,
      parentName: parent,
      childrenNames,
      type: 'Bone',
    });
  });

  // Extract initial embedded animations if any, defaulting their names to the filename
  const cleanBaseName = formatNameFromFilename(fileName);
  const originalAnimations: LoadedAnimationClip[] = (rootObject.animations || []).map((clip, index) => {
    const animName = originalAnimationsName(clip.name, cleanBaseName, index, (rootObject.animations || []).length);
    
    // Sanitize tracks so they point to sanitized node names and have valid keyframes
    const cleanTracks: THREE.KeyframeTrack[] = [];
    clip.tracks.forEach((track) => {
      const sanitized = sanitizeKeyframeTrack(track);
      if (sanitized) cleanTracks.push(sanitized);
    });

    const sanitizedClip = new THREE.AnimationClip(animName, clip.duration, cleanTracks);

    return {
      id: `orig_anim_${Date.now()}_${index}`,
      name: animName,
      originalName: clip.name || animName,
      duration: Number(clip.duration.toFixed(3)),
      tracksCount: cleanTracks.length,
      sourceFile: fileName,
      clip: sanitizedClip,
    };
  });

  return {
    fileName,
    fileSize,
    rootObject,
    skinnedMeshes,
    bones,
    hasSkeleton: bones.length > 0 || skinnedMeshes.length > 0,
    vertexCount,
    triangleCount: Math.round(triangleCount),
    originalAnimations,
  };
}

function originalAnimationsName(clipName: string, baseFileName: string, index: number, totalClips: number): string {
  if (totalClips === 1) {
    return baseFileName || 'Default Animation';
  }
  if (clipName && clipName !== 'take 001' && clipName !== 'default' && clipName.trim() !== '') {
    return `${baseFileName} - ${clipName}`;
  }
  return `${baseFileName} (${index + 1})`;
}

/**
 * Parses an animation FBX file (with or without skin) and retargets/adapts tracks to match target model bones.
 * Default name is strictly taken from the file name.
 */
export async function parseAnimationFBX(
  buffer: ArrayBuffer,
  fileName: string,
  targetModel: LoadedModelData | null
): Promise<LoadedAnimationClip[]> {
  const loader = new FBXLoader();
  const animObject = loader.parse(buffer, '');
  const rawClips = animObject.animations || [];

  if (rawClips.length === 0) {
    throw new Error(`No animation tracks found in "${fileName}". Please ensure the FBX contains animation keyframes.`);
  }

  // Target bone names for retargeting
  const targetBoneNames = new Set<string>();
  const normalizedTargetBoneMap = new Map<string, string>();

  if (targetModel) {
    targetModel.bones.forEach((b) => {
      targetBoneNames.add(b.name);
      normalizedTargetBoneMap.set(normalizeBoneName(b.name), b.name);
    });

    targetModel.skinnedMeshes.forEach((mesh) => {
      if (mesh.skeleton) {
        mesh.skeleton.bones.forEach((bone) => {
          targetBoneNames.add(bone.name);
          normalizedTargetBoneMap.set(normalizeBoneName(bone.name), bone.name);
        });
      }
    });
  }

  const cleanFileName = formatNameFromFilename(fileName);
  const processedClips: LoadedAnimationClip[] = [];

  rawClips.forEach((rawClip, clipIdx) => {
    // Default name is derived directly from the filename
    const defaultName =
      rawClips.length === 1
        ? cleanFileName
        : `${cleanFileName}_${clipIdx + 1}`;

    let matchedCount = 0;
    let unmatchedCount = 0;
    const retargetedTracks: THREE.KeyframeTrack[] = [];

    rawClip.tracks.forEach((track) => {
      const lastDotIndex = track.name.lastIndexOf('.');
      if (lastDotIndex === -1) {
        return;
      }

      const rawNodeName = track.name.substring(0, lastDotIndex);
      const property = track.name.substring(lastDotIndex + 1);

      let targetBoneName = rawNodeName;

      if (targetModel && targetBoneNames.size > 0) {
        // 1. Direct exact match
        if (targetBoneNames.has(rawNodeName)) {
          targetBoneName = rawNodeName;
          matchedCount++;
        }
        // 2. Sanitized match
        else if (targetBoneNames.has(sanitizeNodeName(rawNodeName))) {
          targetBoneName = sanitizeNodeName(rawNodeName);
          matchedCount++;
        }
        // 3. Strip namespace match
        else {
          const strippedName = rawNodeName.replace(/^.*[:|/\\]/, '');
          if (targetBoneNames.has(strippedName)) {
            targetBoneName = strippedName;
            matchedCount++;
          }
          // 4. Normalized fuzzy match
          else {
            const normalizedRaw = normalizeBoneName(rawNodeName);
            if (normalizedTargetBoneMap.has(normalizedRaw)) {
              targetBoneName = normalizedTargetBoneMap.get(normalizedRaw)!;
              matchedCount++;
            } else {
              targetBoneName = sanitizeNodeName(rawNodeName);
              unmatchedCount++;
            }
          }
        }
      } else {
        targetBoneName = sanitizeNodeName(rawNodeName);
        matchedCount++;
      }

      const trackCandidate = track.clone();
      trackCandidate.name = `${targetBoneName}.${property}`;

      const sanitizedTrack = sanitizeKeyframeTrack(trackCandidate);
      if (sanitizedTrack) {
        retargetedTracks.push(sanitizedTrack);
      }
    });

    const newClip = new THREE.AnimationClip(
      defaultName,
      rawClip.duration,
      retargetedTracks
    );

    processedClips.push({
      id: `anim_${Date.now()}_${clipIdx}_${Math.random().toString(36).substring(2, 7)}`,
      name: defaultName,
      originalName: rawClip.name || defaultName,
      duration: Number(rawClip.duration.toFixed(3)),
      tracksCount: retargetedTracks.length,
      sourceFile: fileName,
      clip: newClip,
      matchedTracksCount: matchedCount,
      unmatchedTracksCount: unmatchedCount,
    });
  });

  return processedClips;
}

/**
 * Applies a single texture (diffuse map) to all meshes in the model
 */
export function applySingleTextureToModel(
  rootObject: THREE.Object3D,
  texture: THREE.Texture | null,
  options?: { repeat?: number; color?: string; roughness?: number; metalness?: number }
) {
  rootObject.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.map = texture;
          if (texture) {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            if (options?.repeat) {
              texture.repeat.set(options.repeat, options.repeat);
            }
          }
          if (options?.color) {
            mat.color.set(options.color);
          }
          if (options?.roughness !== undefined) {
            mat.roughness = options.roughness;
          }
          if (options?.metalness !== undefined) {
            mat.metalness = options.metalness;
          }
          mat.needsUpdate = true;
        }
      });
    }
  });
}
