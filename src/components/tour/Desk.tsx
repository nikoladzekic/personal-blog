import { useRef, useMemo, Suspense } from 'react';
import { useFrame, createPortal } from '@react-three/fiber';
import { useGLTF, useTexture, useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/scene.gltf');

const TERM_LINES = [
  { w: 0.72, y: 0.02, color: '#39ff14' },
  { w: 0.55, y: -0.06, color: '#7ab4ff' },
  { w: 0.65, y: -0.14, color: '#ffb800' },
  { w: 0.42, y: -0.22, color: '#ff6b6b' },
  { w: 0.58, y: -0.3, color: '#39ff14' },
  { w: 0.48, y: -0.38, color: '#7ab4ff' },
] as const;

const SCROLL_MIN = -0.48;
const SCROLL_MAX = 0.12;
const SCROLL_SPAN = SCROLL_MAX - SCROLL_MIN;

function TerminalScene() {
  const lineRefs = useRef<THREE.Mesh[]>([]);
  const cursorRef = useRef<THREE.Mesh>(null!);
  const lines = useMemo(() => TERM_LINES, []);

  useFrame(({ clock }) => {
    const scroll = (clock.getElapsedTime() * 0.05) % SCROLL_SPAN;
    lineRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      let y = lines[i].y - scroll;
      while (y < SCROLL_MIN) y += SCROLL_SPAN;
      while (y > SCROLL_MAX) y -= SCROLL_SPAN;
      mesh.position.y = y;
    });
    if (cursorRef.current) {
      cursorRef.current.visible = Math.floor(clock.getElapsedTime() * 2.5) % 2 === 0;
      cursorRef.current.position.y = 0.02 - scroll;
    }
  });

  return (
    <>
      <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={220} near={0.1} far={20} />
      <color attach="background" args={['#08111e']} />
      <ambientLight intensity={0.6} />
      <mesh position={[-0.52, 0.38, 0]}>
        <planeGeometry args={[0.22, 0.07]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>
      <mesh position={[-0.22, 0.38, 0]}>
        <planeGeometry args={[0.18, 0.07]} />
        <meshBasicMaterial color="#7ab4ff" />
      </mesh>
      <mesh position={[0.08, 0.38, 0]}>
        <planeGeometry args={[0.2, 0.07]} />
        <meshBasicMaterial color="#ffb800" />
      </mesh>
      <mesh position={[0.38, 0.38, 0]}>
        <planeGeometry args={[0.16, 0.07]} />
        <meshBasicMaterial color="#ff6b6b" />
      </mesh>
      <mesh position={[-0.52, 0.28, 0]}>
        <planeGeometry args={[0.5, 0.025]} />
        <meshBasicMaterial color="#2a4a6a" />
      </mesh>
      <mesh position={[-0.52, 0.24, 0]}>
        <planeGeometry args={[0.42, 0.025]} />
        <meshBasicMaterial color="#3a5a7a" />
      </mesh>
      <mesh position={[-0.52, 0.2, 0]}>
        <planeGeometry args={[0.35, 0.025]} />
        <meshBasicMaterial color="#4a6a8a" />
      </mesh>
      {lines.map((line, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            if (el) lineRefs.current[idx] = el;
          }}
          position={[-0.35, line.y, 0]}
        >
          <planeGeometry args={[line.w, 0.028]} />
          <meshBasicMaterial color={line.color} />
        </mesh>
      ))}
      <mesh ref={cursorRef} position={[0.38, 0.02, 0.001]}>
        <planeGeometry args={[0.04, 0.032]} />
        <meshBasicMaterial color="#39ff14" />
      </mesh>
    </>
  );
}


function MonitorImageContent() {
  const imageTexture = useTexture('/monitor-wallpaper.jpg');
  console.log('Monitor image texture loaded:', imageTexture);
  return (
    <meshBasicMaterial 
      map={imageTexture}
      toneMapped={false}
    />
  );
}

function MonitorVideoContent() {
  const videoTexture = useVideoTexture('/monitor-video.mp4', {
    loop: true,
    muted: true,
    playsInline: true,
  });
  return (
    <meshStandardMaterial 
      map={videoTexture} 
      emissive="#0a1a2a" 
      emissiveIntensity={0.3} 
      roughness={0.1}
      metalness={0.1}
    />
  );
}

function MonitorTerminalOverlay({ monitor }: { monitor: THREE.Object3D }) {
  const screenMesh = monitor.getObjectByName('sm_monitor_mt_monitor_screen_0');
  const { width, height, position } = useMemo(() => {
    if (!screenMesh) {
      return {
        width: 0.76,
        height: 0.32,
        position: [0, 0.11, 0.012] as [number, number, number],
      };
    }
    const box = new THREE.Box3().setFromObject(screenMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    monitor.worldToLocal(center);
    return {
      width: Math.max(size.x * 0.97, 0.55),
      height: Math.max(size.y * 0.97, 0.25),
      position: [center.x, center.y, center.z + 0.001] as [number, number, number],
    };
  }, [monitor, screenMesh]);

  return createPortal(
    <group position={position}>
      <mesh rotation={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <Suspense fallback={
          <meshStandardMaterial emissive="#1a4a9e" emissiveIntensity={0.45} roughness={1} />
        }>
          <MonitorImageContent />
        </Suspense>
      </mesh>
    </group>,
    monitor
  );
}

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

  const { model, monitor, pcPosition } = useMemo(() => {
    const clone = scene.clone(true);
    const fans: THREE.Object3D[] = [];
    const keyboardLeds: THREE.MeshStandardMaterial[] = [];
    const pcLeds: THREE.MeshStandardMaterial[] = [];

    // Debug: List all object names to understand the model structure
    const allNames: string[] = [];
    clone.traverse((child) => {
      if (child.name && !allNames.includes(child.name)) {
        allNames.push(child.name);
      }
      
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        if (child.name === 'sm_monitor_mt_monitor_screen_0') {
          child.visible = false;
        }

        if (child.name === 'sm_keyboard_mt_keyboard_led_0' && child.material instanceof THREE.MeshStandardMaterial) {
          keyboardLeds.push(child.material);
        }

        if (child.name === 'sm_pc_mt_pc_led_0' && child.material instanceof THREE.MeshStandardMaterial) {
          pcLeds.push(child.material);
        }
      }

      // Target only the rotor objects (odd-numbered fans: fan001, fan004, fan006, etc.)
      // These appear to be the spinning parts nested inside the main fan assemblies
      if (/^fan(001|004|006|008|010|012|014)$/.test(child.name)) {
        fans.push(child);
        console.log(`Added fan rotor to rotation: ${child.name}`);
      }
    });
    
    console.log('All object names in scene:', allNames.filter(name => name.length > 0));

    // Manually target specific rotor objects once we identify them from console output
    // For now, clear fans array until we know the correct object names
    console.log(`Total fan objects found: ${fans.length}`);
    
    fanRefs.current = fans;
    keyboardLedMats.current = keyboardLeds;
    pcLedMats.current = pcLeds;

    const monitorNode = clone.getObjectByName('sm_monitor');
    const pcNode = clone.getObjectByName('sm_pc');
    const pcPos = new THREE.Vector3(0.86, DESK_TOP_Y + 0.15, 0);
    if (pcNode) {
      pcNode.getWorldPosition(pcPos);
    }

    return {
      model: clone,
      monitor: monitorNode,
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
      {monitor && <MonitorTerminalOverlay monitor={monitor} />}
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
