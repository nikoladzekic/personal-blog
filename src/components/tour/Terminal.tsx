import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface TerminalProps {
  id: string;
  position: [number, number, number];
  label: string;
  isNear: boolean;
}

export function Terminal({ position, label, isNear }: TerminalProps) {
  const glowRef = useRef<THREE.PointLight>(null!);
  const screenRef = useRef<THREE.MeshStandardMaterial>(null!);

  // Pulse the glow
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.8 + Math.sin(t * 1.5) * 0.2;
    if (glowRef.current) {
      glowRef.current.intensity = isNear ? pulse * 4 : pulse * 1.5;
    }
    if (screenRef.current) {
      (screenRef.current.emissiveIntensity as number) = isNear ? 1.2 : 0.6;
    }
  });

  return (
    <group position={position}>
      {/* Terminal body */}
      <mesh castShadow>
        <boxGeometry args={[0.8, 1.4, 0.15]} />
        <meshStandardMaterial color="#0a0a12" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* Screen */}
      <mesh position={[0, 0.2, 0.085]}>
        <planeGeometry args={[0.6, 0.7]} />
        <meshStandardMaterial
          ref={screenRef}
          color="#000a00"
          emissive="#39ff14"
          emissiveIntensity={0.6}
          roughness={1}
        />
      </mesh>

      {/* Label text on screen */}
      <Text
        position={[0, 0.25, 0.09]}
        fontSize={0.07}
        color="#39ff14"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>

      <Text
        position={[0, 0.1, 0.09]}
        fontSize={0.045}
        color="#1a7a08"
        anchorX="center"
        anchorY="middle"
      >
        {isNear ? '[E] ENTER' : ''}
      </Text>

      {/* Glow light */}
      <pointLight
        ref={glowRef}
        position={[0, 0.5, 0.5]}
        color="#39ff14"
        intensity={1.5}
        distance={4}
        decay={2}
      />

      {/* Base stand */}
      <mesh position={[0, -0.85, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#050508" roughness={0.9} />
      </mesh>
    </group>
  );
}
