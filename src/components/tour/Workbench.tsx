import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SolderingStation } from './SolderingStation';

useGLTF.preload('/motherboard.glb');

export const WORKBENCH_TOP_Y = 0.62;
export const WORKBENCH_X = -3.4;
export const WORKBENCH_Z = -1.2;

function MotherboardModel({ position }: { position: [number, number, number] }) {
  const { scene } = useGLTF('/motherboard.glb');

  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 0.3 / maxDim : 1;
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
  }, [scene]);

  return (
    <group position={position}>
      <primitive object={model} rotation={[0, -0.35 + Math.PI / 2, 0]} />
    </group>
  );
}

interface WorkbenchProps {
  isDark?: boolean;
}

export function Workbench({ isDark = false }: WorkbenchProps) {
  const topY = WORKBENCH_TOP_Y;

  const W = 2.32;
  const D = 1.28;

  return (
    <group position={[WORKBENCH_X, 0, WORKBENCH_Z]}>
      {/* Tabletop */}
      <RoundedBox
        args={[W, 0.07, D]}
        radius={0.014}
        smoothness={3}
        position={[0, topY, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial color="#5a4030" roughness={0.55} clearcoat={0.15} clearcoatRoughness={0.5} />
      </RoundedBox>

      {(
        [
          [-(W / 2 - 0.08), -(D / 2 - 0.08)],
          [ (W / 2 - 0.08), -(D / 2 - 0.08)],
          [-(W / 2 - 0.08),  (D / 2 - 0.08)],
          [ (W / 2 - 0.08),  (D / 2 - 0.08)],
        ] as [number, number][]
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, topY / 2 - 0.02, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.044, topY - 0.04, 10]} />
          <meshStandardMaterial color="#4a3424" roughness={0.7} />
        </mesh>
      ))}

      <SolderingStation position={[-0.52, topY + 0.01, 0.05]} rotation={[0, 0.15, 0]} targetHeight={0.65} />
      <MotherboardModel position={[0.58, topY + 0.01, -0.05]} />

      {!isDark && (
        <pointLight position={[0, topY + 0.45, 0.2]} intensity={0.7} color="#ffe8cc" distance={2.2} decay={2} />
      )}
    </group>
  );
}
