import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ArcadeScreen } from './ArcadeScreen';

/**
 * "Arcade Machine" by J-Toastie (CC-BY 3.0), via poly.pizza
 * https://poly.pizza/m/GLDkMhiynM — served from /public/arcade.glb.
 * The model faces +X and ships with a dedicated GameScreen_Plane quad
 * (full 0–1 UVs) that ArcadeScreen re-materials with the attract loop.
 */

useGLTF.preload('/arcade.glb');

interface ArcadeCabinetProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  isDark?: boolean;
}

export function ArcadeCabinet({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 0.72,
  isDark = false,
}: ArcadeCabinetProps) {
  const { scene } = useGLTF('/arcade.glb');

  const { model, screenMesh } = useMemo(() => {
    const clone = scene.clone(true);
    let screen: THREE.Mesh | null = null;
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.name.startsWith('GameScreen_Plane')) {
          screen = child;
        }
      }
    });
    return { model: clone, screenMesh: screen as THREE.Mesh | null };
  }, [scene]);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={model} />
      {screenMesh && <ArcadeScreen mesh={screenMesh} />}
      {/* screen glow spilling onto the floor/wall at night */}
      {isDark && (
        <pointLight position={[0.9, 1.9, 0]} intensity={2.2} color="#4a6aff" distance={3.2} decay={1.8} />
      )}
    </group>
  );
}
