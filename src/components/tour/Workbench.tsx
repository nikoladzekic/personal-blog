import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SolderingStation } from './SolderingStation';

/* ------------------------- bench clutter pieces -------------------------
 * Procedural hardware-lab props. Positions are bench-local; y arguments are
 * the tabletop's actual top surface (topY + half the RoundedBox height). */

function Oscilloscope({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  const screenTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#04180c';
    ctx.fillRect(0, 0, 64, 48);
    ctx.strokeStyle = '#0a3a1c';
    ctx.lineWidth = 1;
    for (let x = 0.5; x <= 64; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 48);
      ctx.stroke();
    }
    for (let y = 0.5; y <= 48; y += 8) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= 64; x++) {
      const y = 24 - Math.sin((x / 64) * Math.PI * 4) * 14;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  }, []);

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.42, 0.26, 0.24]} />
        <meshStandardMaterial color="#c8c4b8" roughness={0.6} />
      </mesh>
      {/* phosphor screen — meshBasic so the trace glows day and night */}
      <mesh position={[-0.08, 0.14, 0.121]}>
        <planeGeometry args={[0.2, 0.16]} />
        <meshBasicMaterial map={screenTex} toneMapped={false} />
      </mesh>
      {/* knobs */}
      {([[0.13, 0.2], [0.17, 0.2], [0.13, 0.13], [0.17, 0.13]] as [number, number][]).map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.122]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.014, 10]} />
          <meshStandardMaterial color="#3a3a42" roughness={0.5} />
        </mesh>
      ))}
      {/* bnc inputs */}
      {[0.12, 0.17].map((x, i) => (
        <mesh key={i} position={[x, 0.05, 0.122]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 0.012, 8]} />
          <meshStandardMaterial color="#c8a038" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function HelpingHands({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.012, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.055, 0.024, 12]} />
        <meshStandardMaterial color="#2a2a30" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
        <meshStandardMaterial color="#8a8a94" metalness={0.7} roughness={0.35} />
      </mesh>
      {/* two articulated arms with brass croc clips */}
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0.115, 0]} rotation={[0, 0, s * 0.95]}>
          <mesh position={[0, 0.05, 0.01 * s]}>
            <cylinderGeometry args={[0.005, 0.005, 0.1, 6]} />
            <meshStandardMaterial color="#8a8a94" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.105, 0.01 * s]}>
            <boxGeometry args={[0.012, 0.022, 0.01]} />
            <meshStandardMaterial color="#c8a038" metalness={0.6} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* magnifier */}
      <group position={[0, 0.145, 0.03]} rotation={[0.5, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.03, 0.005, 8, 20]} />
          <meshStandardMaterial color="#2a2a30" roughness={0.5} />
        </mesh>
        <mesh>
          <circleGeometry args={[0.028, 20]} />
          <meshStandardMaterial color="#a8c8d8" transparent opacity={0.3} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}

function WireSpool({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <group position={position}>
      {[0.004, 0.056].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.008, 14]} />
          <meshStandardMaterial color="#d8d4c8" roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.045, 14]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
    </group>
  );
}

function Multimeter({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.0125, 0]} castShadow>
        <boxGeometry args={[0.11, 0.025, 0.18]} />
        <meshStandardMaterial color="#c8a018" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.026, -0.05]}>
        <boxGeometry args={[0.08, 0.002, 0.045]} />
        <meshStandardMaterial color="#1a2418" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.026, 0.03]}>
        <cylinderGeometry args={[0.022, 0.022, 0.006, 12]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.5} />
      </mesh>
    </group>
  );
}

function Screwdriver({
  position,
  rotation,
  handle,
}: {
  position: [number, number, number];
  rotation: number;
  handle: string;
}) {
  return (
    <group position={position} rotation={[0, rotation, Math.PI / 2]}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.004, 0.003, 0.14, 6]} />
        <meshStandardMaterial color="#b8bcc4" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.045, 0]}>
        <cylinderGeometry args={[0.012, 0.011, 0.055, 8]} />
        <meshStandardMaterial color={handle} roughness={0.5} />
      </mesh>
    </group>
  );
}

function LoosePcb({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh>
        <boxGeometry args={[0.16, 0.006, 0.1]} />
        <meshStandardMaterial color="#0d5c2a" roughness={0.5} />
      </mesh>
      <mesh position={[-0.03, 0.006, 0.01]}>
        <boxGeometry args={[0.035, 0.006, 0.035]} />
        <meshStandardMaterial color="#181820" roughness={0.4} />
      </mesh>
      <mesh position={[0.05, 0.005, -0.02]}>
        <cylinderGeometry args={[0.008, 0.008, 0.008, 8]} />
        <meshStandardMaterial color="#3a3a44" roughness={0.5} />
      </mesh>
    </group>
  );
}

function PartsOrganizer({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.3, 0.14, 0.12]} />
        <meshStandardMaterial color="#2a2a30" roughness={0.7} />
      </mesh>
      {/* translucent drawer fronts, 3 x 2 */}
      {[-0.1, 0, 0.1].map((x) =>
        [-0.034, 0.034].map((y) => (
          <mesh key={`${x}${y}`} position={[x, y, 0.0625]}>
            <boxGeometry args={[0.088, 0.058, 0.004]} />
            <meshStandardMaterial color="#4a4a52" roughness={0.4} />
          </mesh>
        ))
      )}
    </group>
  );
}

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
  // the RoundedBox tabletop is 0.07 thick and centered at topY
  const ySurf = topY + 0.035;

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

      {/* ESD mat under the motherboard */}
      <mesh position={[0.45, ySurf + 0.005, -0.02]} receiveShadow>
        <boxGeometry args={[0.85, 0.01, 0.6]} />
        <meshStandardMaterial color="#1d4038" roughness={0.9} />
      </mesh>
      <MotherboardModel position={[0.58, ySurf + 0.01, -0.05]} />

      <Oscilloscope position={[0.02, ySurf, -0.42]} rotation={0.18} />
      <HelpingHands position={[-0.15, ySurf, 0.18]} />
      <WireSpool position={[0.9, ySurf, -0.5]} color="#d04030" />
      <WireSpool position={[0.99, ySurf, -0.38]} color="#3060c0" />
      <WireSpool position={[0.82, ySurf, -0.36]} color="#d8b830" />
      <Multimeter position={[-0.95, ySurf, 0.3]} rotation={0.5} />
      <Screwdriver position={[-0.6, ySurf + 0.012, 0.45]} rotation={0.3} handle="#d04030" />
      <Screwdriver position={[-0.5, ySurf + 0.012, 0.52]} rotation={-0.15} handle="#3060c0" />
      <LoosePcb position={[0.15, ySurf + 0.003, 0.42]} rotation={0.4} />
      <LoosePcb position={[0.28, ySurf + 0.009, 0.47]} rotation={-0.2} />
      {/* loose coil of solder near the station */}
      <mesh position={[-0.2, ySurf + 0.01, -0.35]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.03, 0.008, 8, 16]} />
        <meshStandardMaterial color="#a8a8b0" metalness={0.6} roughness={0.4} />
      </mesh>
      <PartsOrganizer position={[-0.95, ySurf + 0.07, -0.45]} rotation={0.1} />

      {!isDark && (
        <pointLight position={[0, topY + 0.45, 0.2]} intensity={0.7} color="#ffe8cc" distance={2.2} decay={2} />
      )}
    </group>
  );
}
