import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { getBookTexture, usePixelTextures, type BookTextureVariant } from './usePixelTexture';

useGLTF.preload('/low_poly_sci-fi_tablet.glb');

interface BookProps {
  id: string;
  position: [number, number, number];
  label: string;
  variant: BookTextureVariant;
  isNear: boolean;
  isDark?: boolean;
}


function ResearchTablet({
  isNear,
  isDark,
}: {
  isNear: boolean;
  isDark: boolean;
}) {
  const { scene } = useGLTF('/low_poly_sci-fi_tablet.glb');
  const glowMats = useRef<THREE.MeshStandardMaterial[]>([]);

  const model = useMemo(() => {
    const clone = scene.clone(true);
    glowMats.current = [];
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = maxDim > 0 ? 0.22 / maxDim : 1;
    clone.scale.setScalar(scale);
    clone.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(clone);
    clone.position.y -= scaledBox.min.y;

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        if (child.material instanceof THREE.MeshStandardMaterial) {
          const mat = child.material.clone();
          mat.emissive = new THREE.Color('#2244aa');
          mat.emissiveIntensity = isDark ? 0.7 : 0.35;
          child.material = mat;
          glowMats.current.push(mat);
        } else if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => {
            if (m instanceof THREE.MeshStandardMaterial) {
              const mat = m.clone();
              mat.emissive = new THREE.Color('#2244aa');
              mat.emissiveIntensity = isDark ? 0.7 : 0.35;
              glowMats.current.push(mat);
              return mat;
            }
            return m;
          });
        }
      }
    });
    return clone;
  }, [scene, isDark]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.55 + Math.sin(t * 2.5) * 0.2;
    const base = isDark ? 0.85 : 0.4;
    const near = isDark ? 2.2 : 1.0;
    const intensity = (isNear ? near : base) * pulse;

    glowMats.current.forEach((mat) => {
      mat.emissive.setHSL(0.58, 0.85, 0.45);
      mat.emissiveIntensity = intensity;
    });
  });

  return <primitive object={model} rotation={[0, 0.12, 0.08]} />;
}

/* Floating interactable label with a soft dark outline for readability,
   colored to match the site palette (crimson primary / gold accent). */
function InteractLabel({ label, isNear }: { label: string; isNear: boolean }) {
  const ref = useRef<THREE.Group>(null!);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.position.y = 0.28 + Math.sin(t * 1.8) * 0.01;
    }
  });

  return (
    <group ref={ref} position={[0, 0.28, 0.08]}>
      <Text
        fontSize={0.055}
        color={isNear ? '#f2a33c' : '#cbbfc2'}
        anchorX="center"
        anchorY="bottom"
        maxWidth={1.2}
        outlineWidth={0.007}
        outlineBlur={0.01}
        outlineColor="#0a0708"
        outlineOpacity={0.95}
      >
        {label}
      </Text>
      {isNear && (
        <Text
          position={[0, -0.075, 0]}
          fontSize={0.04}
          color="#e63950"
          anchorX="center"
          anchorY="top"
          outlineWidth={0.004}
          outlineBlur={0.006}
          outlineColor="#0a0708"
          outlineOpacity={0.95}
        >
          [E] OPEN
        </Text>
      )}
    </group>
  );
}

export function Book({ position, label, variant, isNear, isDark = false }: BookProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const coverMatRef = useRef<THREE.MeshStandardMaterial>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  const textures = usePixelTextures();
  const coverMap = getBookTexture(textures, variant);

  const spineColor = variant === 'diary' ? '#0a2828' : '#2a0c0c';
  const emissiveColor = variant === 'diary' ? '#2a8a8a' : '#2a4a9e';
  const accentColor = variant === 'diary' ? '#7ad0d0' : '#6ab4ff';
  const coverColor = variant === 'diary' ? '#1d5a5a' : '#7a2222';
  const glowColor = variant === 'diary' ? '#39ffcc' : '#4488ff';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = position[1];
    }

    if (variant === 'diary' && coverMatRef.current) {
      const pulse = 0.5 + Math.sin(t * 2.5) * 0.15;
      const baseGlow = isDark ? 0.9 : 0.4;
      const nearGlow = isDark ? 3.5 : 1.2;
      coverMatRef.current.emissiveIntensity = isNear ? pulse * nearGlow : pulse * baseGlow;
    }

    if (glowRef.current) {
      if (variant === 'research') {
        glowRef.current.intensity = isNear ? (isDark ? 3.5 : 2) : isDark ? 1.6 : 0.9;
      } else {
        glowRef.current.intensity = isNear ? (isDark ? 4 : 2.5) : isDark ? 1.4 : 0.8;
      }
    }
  });

  if (variant === 'research') {
    return (
      <group ref={groupRef} position={[position[0], position[1], position[2]]}>
        <ResearchTablet isNear={isNear} isDark={isDark} />
        <pointLight
          ref={glowRef}
          position={[0, 0.08, 0.12]}
          color={glowColor}
          intensity={isDark ? 1.4 : 0.7}
          distance={1.8}
          decay={2}
        />
        <InteractLabel label={label} isNear={isNear} />
      </group>
    );
  }

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0.01, 0, -0.01]}>
        <boxGeometry args={[0.3, 0.42, 0.04]} />
        <meshStandardMaterial color="#f0ead8" roughness={0.9} />
      </mesh>
      {[-0.14, -0.07, 0, 0.07, 0.14].map((y, i) => (
        <mesh key={i} position={[0.17, y, 0.02]}>
          <boxGeometry args={[0.015, 0.015, 0.05]} />
          <meshStandardMaterial color="#c8bfa6" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0, -0.04]}>
        <boxGeometry args={[0.34, 0.46, 0.04]} />
        <meshStandardMaterial color={coverColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.025]} castShadow>
        <boxGeometry args={[0.34, 0.46, 0.045]} />
        <meshStandardMaterial
          ref={coverMatRef}
          map={coverMap}
          emissive={emissiveColor}
          emissiveIntensity={0.4}
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      <mesh position={[-0.165, 0, 0]}>
        <boxGeometry args={[0.055, 0.46, 0.09]} />
        <meshStandardMaterial color={spineColor} roughness={0.85} />
      </mesh>
      <mesh position={[0.04, 0.1, 0.055]}>
        <boxGeometry args={[0.16, 0.055, 0.008]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={isNear ? 0.4 : 0.08} />
      </mesh>
      <mesh position={[0.04, -0.06, 0.055]}>
        <boxGeometry args={[0.18, 0.015, 0.008]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>
      <mesh position={[0.04, -0.12, 0.055]}>
        <boxGeometry args={[0.14, 0.015, 0.008]} />
        <meshStandardMaterial color={accentColor} roughness={0.8} />
      </mesh>
      <pointLight
        ref={glowRef}
        position={[0, 0.1, 0.15]}
        color={glowColor}
        intensity={isDark ? 1.2 : 0.45}
        distance={1.8}
        decay={2}
      />
      </group>
      <InteractLabel label={label} isNear={isNear} />
    </group>
  );
}
