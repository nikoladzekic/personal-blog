import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MonitorScreen } from './MonitorScreen';

useGLTF.preload('/scene.gltf');

/** Measured from scene.gltf — tabletop surface height in world units, at 1.5× group scale */
export const DESK_TOP_Y = 1.23;

interface DeskProps {
  position?: [number, number, number];
}

export function Desk({ position = [0, 0, 0] }: DeskProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const rgbLightRef = useRef<THREE.PointLight>(null!);
  const fanRefs = useRef<THREE.Object3D[]>([]);
  const keyboardLedMats = useRef<THREE.MeshStandardMaterial[]>([]);
  const pcLedMats = useRef<THREE.MeshStandardMaterial[]>([]);

  const { scene } = useGLTF('/scene.gltf');

  const { model, screenMesh, pcPosition } = useMemo(() => {
    const clone = scene.clone(true);
    const fans: THREE.Object3D[] = [];
    const keyboardLeds: THREE.MeshStandardMaterial[] = [];
    const pcLeds: THREE.MeshStandardMaterial[] = [];
    let screen: THREE.Mesh | null = null;

    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.name === 'sm_monitor_mt_monitor_screen_0') {
          screen = child;
        }

        if (child.name === 'sm_keyboard_mt_keyboard_led_0' && child.material instanceof THREE.MeshStandardMaterial) {
          keyboardLeds.push(child.material);
        }

        if (child.name === 'sm_pc_mt_pc_led_0' && child.material instanceof THREE.MeshStandardMaterial) {
          pcLeds.push(child.material);
        }
      }

      // Rotor objects nested inside the main fan assemblies
      if (/^fan(001|004|006|008|010|012|014)$/.test(child.name)) {
        fans.push(child);
      }
    });

    fanRefs.current = fans;
    keyboardLedMats.current = keyboardLeds;
    pcLedMats.current = pcLeds;

    const pcNode = clone.getObjectByName('sm_pc');
    const pcPos = new THREE.Vector3(0.86, DESK_TOP_Y + 0.15, 0);
    if (pcNode) {
      pcNode.getWorldPosition(pcPos);
    }

    return {
      model: clone,
      screenMesh: screen as THREE.Mesh | null,
      pcPosition: [pcPos.x, pcPos.y + 0.12, pcPos.z] as [number, number, number],
    };
  }, [scene]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Enhanced fan rotation with different speeds for more realism
    fanRefs.current.forEach((fan, i) => {
      const baseSpeed = 0.15; // Fan rotation speed
      const speedVariation = i * 0.02; // Different speeds per fan
      const rotationSpeed = baseSpeed + speedVariation;
      
      // Y-axis rotation works perfectly for these PC fans
      fan.rotation.y += rotationSpeed;
    });

    // RGB point light animation
    if (rgbLightRef.current) {
      rgbLightRef.current.color.setHSL((t * 0.15) % 1, 0.9, 0.6);
      rgbLightRef.current.intensity = 1.4 + Math.sin(t * 2.2) * 0.4;
    }

    // Keyboard LED cycling through rainbow colors
    const keyboardHue = (t * 0.2 + 0.6) % 1;
    keyboardLedMats.current.forEach((mat) => {
      mat.emissive.setHSL(keyboardHue, 1, 0.5);
      mat.emissiveIntensity = 0.7 + Math.sin(t * 3.2) * 0.3;
    });

    // PC case LEDs with faster color cycling
    pcLedMats.current.forEach((mat) => {
      mat.emissive.setHSL((t * 0.25) % 1, 1, 0.6);
      mat.emissiveIntensity = 0.9 + Math.sin(t * 2.8) * 0.4;
    });
  });

  return (
    <group ref={groupRef} position={position} scale={1.5}>
      <primitive object={model} />
      {screenMesh && <MonitorScreen mesh={screenMesh} />}
      <pointLight
        ref={rgbLightRef}
        position={pcPosition}
        intensity={1.2}
        color="#ff00aa"
        distance={1.2}
        decay={2}
      />
    </group>
  );
}
