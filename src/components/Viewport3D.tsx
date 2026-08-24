import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type {
  GlobalTextureInfo,
  LoadedAnimationClip,
  LoadedModelData,
  LoopModeType,
  ViewportSettings,
} from '../types';

export interface Viewport3DHandle {
  setCameraView: (view: 'front' | 'side' | 'top' | 'isometric' | 'reset') => void;
}

interface Viewport3DProps {
  modelData: LoadedModelData | null;
  animationClips: LoadedAnimationClip[];
  activeClipId: string | null;
  isPlaying: boolean;
  playbackSpeed: number;
  loopMode: LoopModeType;
  currentTime: number;
  globalTexture: GlobalTextureInfo;
  onTimeUpdate: (time: number, duration: number) => void;
  onSeek: (time: number) => void;
  viewportSettings: ViewportSettings;
  onUpdateViewportSettings: (settings: Partial<ViewportSettings>) => void;
}

export const Viewport3D = forwardRef<Viewport3DHandle, Viewport3DProps>(
  (
    {
      modelData,
      animationClips,
      activeClipId,
      isPlaying,
      playbackSpeed,
      loopMode,
      currentTime,
      globalTexture,
      onTimeUpdate,
      viewportSettings,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Three.js instances refs
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const activeActionRef = useRef<THREE.AnimationAction | null>(null);
    const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
    const gridHelperRef = useRef<THREE.GridHelper | null>(null);
    const floorMeshRef = useRef<THREE.Mesh | null>(null);
    const lightsGroupRef = useRef<THREE.Group | null>(null);
    const currentModelGroupRef = useRef<THREE.Object3D | null>(null);

    const animationFrameIdRef = useRef<number | null>(null);

    // Camera preset helper
    const setCameraView = (view: 'front' | 'side' | 'top' | 'isometric' | 'reset') => {
      if (!cameraRef.current || !controlsRef.current) return;
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const target = controls.target;
      const currentDist = Math.max(1.5, camera.position.distanceTo(target));

      switch (view) {
        case 'front':
          camera.position.set(target.x, target.y + currentDist * 0.05, target.z + currentDist);
          break;
        case 'side':
          camera.position.set(target.x + currentDist, target.y + currentDist * 0.05, target.z);
          break;
        case 'top':
          camera.position.set(target.x, target.y + currentDist * 1.2, target.z + 0.001);
          break;
        case 'isometric':
          camera.position.set(
            target.x + currentDist * 0.7,
            target.y + currentDist * 0.6,
            target.z + currentDist * 0.7
          );
          break;
        case 'reset':
        default:
          camera.position.set(target.x, target.y + currentDist * 0.2, target.z + currentDist);
          break;
      }
      controls.update();
    };

    useImperativeHandle(ref, () => ({
      setCameraView,
    }));

    // 1. Initialize Scene, Camera, Renderer, Controls
    useEffect(() => {
      if (!containerRef.current || !canvasRef.current) return;

      const width = containerRef.current.clientWidth || window.innerWidth;
      const height = containerRef.current.clientHeight || window.innerHeight;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(viewportSettings.backgroundColor);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.05, 1000);
      camera.position.set(0, 1.4, 3.2);
      cameraRef.current = camera;

      // Renderer
      const renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.current,
        antialias: true,
        powerPreference: 'high-performance',
        alpha: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.shadowMap.enabled = viewportSettings.showShadows;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
      rendererRef.current = renderer;

      // OrbitControls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.target.set(0, 0.9, 0);
      controls.maxDistance = 30;
      controls.minDistance = 0.2;
      controlsRef.current = controls;

      // Grid - Blender Style colors
      const isDarkTheme = viewportSettings.themeMode === 'dark';
      const gridHelper = new THREE.GridHelper(
        10,
        20,
        isDarkTheme ? 0x666666 : 0x777777,
        isDarkTheme ? 0x3a3a3a : 0xcccccc
      );
      gridHelper.position.y = 0;
      gridHelper.visible = viewportSettings.showGrid;
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;

      // Shadow Floor
      const floorGeo = new THREE.PlaneGeometry(20, 20);
      const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.y = -0.001;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);
      floorMeshRef.current = floorMesh;

      // Lights group
      const lightsGroup = new THREE.Group();
      scene.add(lightsGroup);
      lightsGroupRef.current = lightsGroup;
      updateLightingPreset(viewportSettings.lightingPreset, viewportSettings.lightIntensity, lightsGroup);

      // Resize Observer
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width: newW, height: newH } = entry.contentRect;
          if (newW > 0 && newH > 0 && rendererRef.current && cameraRef.current) {
            cameraRef.current.aspect = newW / newH;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(newW, newH);
          }
        }
      });
      resizeObserver.observe(containerRef.current);

      // Animation Loop
      const clock = new THREE.Clock();
      const animate = () => {
        animationFrameIdRef.current = requestAnimationFrame(animate);

        const delta = clock.getDelta();

        // Controls update
        if (controlsRef.current) {
          if (viewportSettings.autoRotate) {
            controlsRef.current.autoRotate = true;
            controlsRef.current.autoRotateSpeed = 2.0;
          } else {
            controlsRef.current.autoRotate = false;
          }
          controlsRef.current.update();
        }

        // Animation Mixer update
        if (mixerRef.current && isPlaying) {
          mixerRef.current.update(delta * playbackSpeed);

          if (activeActionRef.current) {
            const clipDuration = activeActionRef.current.getClip().duration;
            const animTime = activeActionRef.current.time % clipDuration;
            onTimeUpdate(animTime, clipDuration);
          }
        }

        // Skeleton Helper update
        if (skeletonHelperRef.current && skeletonHelperRef.current.visible) {
          skeletonHelperRef.current.update();
        }

        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };

      animate();

      return () => {
        if (animationFrameIdRef.current) {
          cancelAnimationFrame(animationFrameIdRef.current);
        }
        resizeObserver.disconnect();
        renderer.dispose();
      };
    }, []);

    // 2. Update Model in 3D Scene
    useEffect(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      // Remove previous model and skeleton
      if (currentModelGroupRef.current) {
        scene.remove(currentModelGroupRef.current);
        currentModelGroupRef.current = null;
      }
      if (skeletonHelperRef.current) {
        scene.remove(skeletonHelperRef.current);
        skeletonHelperRef.current = null;
      }
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      if (!modelData) return;

      const modelObject = modelData.rootObject;
      scene.add(modelObject);
      currentModelGroupRef.current = modelObject;

      // Setup Animation Mixer
      const mixer = new THREE.AnimationMixer(modelObject);
      mixerRef.current = mixer;

      // Setup Skeleton Helper
      const skeletonHelper = new THREE.SkeletonHelper(modelObject);
      skeletonHelper.visible = viewportSettings.showSkeleton;
      (skeletonHelper.material as THREE.LineBasicMaterial).linewidth = 2;
      (skeletonHelper.material as THREE.LineBasicMaterial).color = new THREE.Color(0xf59e0b);
      scene.add(skeletonHelper);
      skeletonHelperRef.current = skeletonHelper;

      // Center and frame model in camera view
      const box = new THREE.Box3().setFromObject(modelObject);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.5);

      if (controlsRef.current && cameraRef.current) {
        const fov = cameraRef.current.fov * (Math.PI / 180);
        const cameraDist = Math.max(1.5, (maxDim / 2) / Math.tan(fov / 2) * 1.5);

        cameraRef.current.near = Math.max(0.01, cameraDist / 100);
        cameraRef.current.far = Math.max(2000, cameraDist * 50);
        cameraRef.current.updateProjectionMatrix();

        cameraRef.current.position.set(center.x, center.y + size.y * 0.15, center.z + cameraDist);
        controlsRef.current.target.copy(center);
        controlsRef.current.maxDistance = cameraDist * 10;
        controlsRef.current.minDistance = Math.max(0.1, cameraDist * 0.05);
        controlsRef.current.update();
      }

      // Adjust grid & floor to fit the model's footprint
      if (gridHelperRef.current) {
        const gridScale = Math.max(1, Math.ceil(maxDim / 2));
        gridHelperRef.current.scale.set(gridScale, 1, gridScale);
        gridHelperRef.current.position.set(center.x, box.min.y, center.z);
      }
      if (floorMeshRef.current) {
        const floorScale = Math.max(1, Math.ceil(maxDim / 2));
        floorMeshRef.current.scale.set(floorScale, floorScale, 1);
        floorMeshRef.current.position.set(center.x, box.min.y - 0.001, center.z);
      }

      // Apply initial global texture if available
      applyTextureToScene(modelObject, globalTexture.texture);
    }, [modelData]);

    // 3. Update Global Texture when changed
    useEffect(() => {
      if (currentModelGroupRef.current) {
        applyTextureToScene(currentModelGroupRef.current, globalTexture.texture);
      }
    }, [globalTexture.texture]);

    // 4. Handle Animation Playback & Clip Switching
    useEffect(() => {
      const mixer = mixerRef.current;
      if (!mixer || !modelData) return;

      if (!activeClipId) {
        mixer.stopAllAction();
        activeActionRef.current = null;
        return;
      }

      const selectedClip = animationClips.find((c) => c.id === activeClipId);
      if (!selectedClip) return;

      const previousAction = activeActionRef.current;
      const newAction = mixer.clipAction(selectedClip.clip);

      // Loop mode config
      if (loopMode === 'once') {
        newAction.setLoop(THREE.LoopOnce, 1);
        newAction.clampWhenFinished = true;
      } else if (loopMode === 'pingpong') {
        newAction.setLoop(THREE.LoopPingPong, Infinity);
      } else {
        newAction.setLoop(THREE.LoopRepeat, Infinity);
      }

      if (previousAction && previousAction !== newAction) {
        newAction.reset();
        newAction.play();
        previousAction.crossFadeTo(newAction, 0.25, true);
      } else {
        newAction.reset();
        newAction.play();
      }

      activeActionRef.current = newAction;
    }, [activeClipId, animationClips, modelData, loopMode]);

    // 5. Handle Play/Pause & Scrubbing
    useEffect(() => {
      const action = activeActionRef.current;
      if (!action) return;

      action.paused = !isPlaying;

      if (!isPlaying) {
        action.time = currentTime;
        if (mixerRef.current) {
          mixerRef.current.update(0);
        }
      }
    }, [isPlaying, currentTime]);

    // 6. Viewport Settings Updates (Grid, Skeleton, Shading, Background, Lights)
    useEffect(() => {
      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(viewportSettings.backgroundColor);
      }
      if (gridHelperRef.current) {
        gridHelperRef.current.visible = viewportSettings.showGrid;
      }
      if (floorMeshRef.current) {
        floorMeshRef.current.visible = viewportSettings.showShadows;
      }
      if (skeletonHelperRef.current) {
        skeletonHelperRef.current.visible = viewportSettings.showSkeleton;
      }
      if (rendererRef.current) {
        rendererRef.current.shadowMap.enabled = viewportSettings.showShadows;
      }
      if (lightsGroupRef.current) {
        updateLightingPreset(
          viewportSettings.lightingPreset,
          viewportSettings.lightIntensity,
          lightsGroupRef.current
        );
      }

      // Shading Mode Update
      if (currentModelGroupRef.current) {
        applyShadingMode(currentModelGroupRef.current, viewportSettings.shadingMode, globalTexture.texture);
      }
    }, [viewportSettings]);

    return (
      <div
        ref={containerRef}
        id="three-viewport-fullscreen-container"
        className="w-full h-full absolute inset-0 overflow-hidden select-none bg-slate-950"
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing outline-none" />
      </div>
    );
  }
);

Viewport3D.displayName = 'Viewport3D';

/**
 * Applies single texture uniformly to all model meshes
 */
function applyTextureToScene(rootObject: THREE.Object3D, texture: THREE.Texture | null) {
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
          }
          mat.needsUpdate = true;
        }
      });
    }
  });
}

/**
 * Applies shading mode (textured, wireframe, normal, matcap)
 */
function applyShadingMode(
  rootObject: THREE.Object3D,
  mode: string,
  appliedTexture: THREE.Texture | null
) {
  rootObject.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (mode === 'wireframe') {
            mat.wireframe = true;
          } else {
            mat.wireframe = false;
          }

          if (mode === 'normal') {
            mat.roughness = 0.5;
            mat.metalness = 0.0;
            mat.map = null;
          } else {
            mat.map = appliedTexture;
          }
          mat.needsUpdate = true;
        }
      });
    }
  });
}

/**
 * Configures lighting presets in the Three.js scene
 */
function updateLightingPreset(preset: string, intensity: number, group: THREE.Group) {
  while (group.children.length > 0) {
    group.remove(group.children[0]);
  }

  switch (preset) {
    case 'sunset': {
      const hemi = new THREE.HemisphereLight(0xff7700, 0x080820, 0.8 * intensity);
      const sun = new THREE.DirectionalLight(0xffaa44, 2.0 * intensity);
      sun.position.set(5, 8, 5);
      sun.castShadow = true;
      sun.shadow.mapSize.width = 2048;
      sun.shadow.mapSize.height = 2048;
      group.add(hemi, sun);
      break;
    }

    case 'cyber': {
      const hemi = new THREE.HemisphereLight(0x00f0ff, 0xff0055, 0.9 * intensity);
      const key = new THREE.DirectionalLight(0x00ffff, 1.8 * intensity);
      key.position.set(4, 6, 4);
      key.castShadow = true;
      const rim = new THREE.PointLight(0xff0088, 3.0 * intensity, 10);
      rim.position.set(-4, 3, -4);
      group.add(hemi, key, rim);
      break;
    }

    case 'dramatic': {
      const hemi = new THREE.HemisphereLight(0x111122, 0x000000, 0.4 * intensity);
      const spot = new THREE.SpotLight(0xffffff, 4.0 * intensity);
      spot.position.set(0, 10, 3);
      spot.angle = Math.PI / 6;
      spot.penumbra = 0.8;
      spot.castShadow = true;
      group.add(hemi, spot);
      break;
    }

    case 'flat': {
      const hemi = new THREE.HemisphereLight(0xffffff, 0xaaaaaa, 1.5 * intensity);
      const ambient = new THREE.AmbientLight(0xffffff, 1.0 * intensity);
      group.add(hemi, ambient);
      break;
    }

    case 'studio':
    default: {
      const hemi = new THREE.HemisphereLight(0xffffff, 0x334155, 0.9 * intensity);
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.6 * intensity);
      keyLight.position.set(4, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 2048;
      keyLight.shadow.mapSize.height = 2048;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 25;
      keyLight.shadow.bias = -0.0001;

      const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.8 * intensity);
      fillLight.position.set(-5, 4, -4);

      group.add(hemi, keyLight, fillLight);
      break;
    }
  }
}
