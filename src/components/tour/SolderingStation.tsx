import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/soldering.glb');

interface SolderingStationProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  targetHeight?: number;
}

export function SolderingStation({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  targetHeight = 1,
}: SolderingStationProps) {
  const { scene } = useGLTF('/soldering.glb');

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    clone.position.y -= scaledBox.min.y;

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene, targetHeight]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} />
    </group>
  );
}
