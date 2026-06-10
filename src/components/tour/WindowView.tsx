import { Suspense } from 'react';
import { useTexture } from '@react-three/drei';
import type * as THREE from 'three';

interface WindowViewProps {
  fallbackMap: THREE.Texture;
  isDark?: boolean;
}

function CyberpunkWindow() {
  const texture = useTexture('/cyberpunk-city.jpg');
  return (
    <meshStandardMaterial
      map={texture}
      emissive="#0a0414"
      emissiveIntensity={0.2}
      roughness={0.85}
    />
  );
}

export function WindowView({ fallbackMap }: WindowViewProps) {
  return (
    <Suspense
      fallback={
        <meshStandardMaterial
          map={fallbackMap}
          emissive="#1a0828"
          emissiveIntensity={0.6}
          roughness={0.9}
        />
      }
    >
      <CyberpunkWindow />
    </Suspense>
  );
}
