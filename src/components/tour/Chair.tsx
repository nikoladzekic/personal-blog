import { RoundedBox } from '@react-three/drei';

const FABRIC = '#232330';
const FABRIC_LIGHT = '#2d2d3d';
const METAL = '#1e2028';

interface ChairProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
}

export function Chair({ position = [0, 0, 0], rotation = [0, 0, 0] }: ChairProps) {
  return (
    <group position={position} rotation={rotation}>
      {/* Gas lift cylinder */}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.042, 0.052, 0.54, 12]} />
        <meshStandardMaterial color={METAL} roughness={0.25} metalness={0.75} />
      </mesh>

      {/* Seat pan undercarriage */}
      <mesh position={[0, 0.56, 0]}>
        <cylinderGeometry args={[0.3, 0.28, 0.06, 14]} />
        <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.65} />
      </mesh>

      {/* Seat cushion — RoundedBox gives the padded look */}
      <RoundedBox args={[0.62, 0.1, 0.65]} radius={0.045} smoothness={5} position={[0, 0.63, 0.01]} castShadow>
        <meshStandardMaterial color={FABRIC} roughness={0.85} />
      </RoundedBox>
      {/* Seat cushion crease seam */}
      <mesh position={[0, 0.685, 0.01]}>
        <boxGeometry args={[0.6, 0.008, 0.01]} />
        <meshStandardMaterial color={METAL} roughness={0.9} />
      </mesh>

      {/* Lumbar back */}
      <RoundedBox args={[0.64, 0.72, 0.1]} radius={0.04} smoothness={5} position={[0, 1.0, -0.24]} castShadow>
        <meshStandardMaterial color={FABRIC} roughness={0.85} />
      </RoundedBox>
      {/* Back panel detail — horizontal lumbar ridge */}
      <mesh position={[0, 0.88, -0.18]}>
        <boxGeometry args={[0.55, 0.04, 0.02]} />
        <meshStandardMaterial color={FABRIC_LIGHT} roughness={0.8} />
      </mesh>

      {/* Head rest */}
      <RoundedBox args={[0.34, 0.22, 0.09]} radius={0.03} smoothness={4} position={[0, 1.5, -0.22]} castShadow>
        <meshStandardMaterial color={FABRIC} roughness={0.85} />
      </RoundedBox>

      {/* Armrests */}
      {[-1, 1].map((side, i) => (
        <group key={i}>
          {/* Arm post */}
          <mesh position={[side * 0.38, 0.76, 0]}>
            <cylinderGeometry args={[0.022, 0.025, 0.3, 8]} />
            <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.65} />
          </mesh>
          {/* Arm pad */}
          <RoundedBox args={[0.09, 0.025, 0.32]} radius={0.012} smoothness={3} position={[side * 0.38, 0.92, 0.04]}>
            <meshStandardMaterial color="#161620" roughness={0.7} />
          </RoundedBox>
        </group>
      ))}

      {/* 5-star base */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        return (
          <group key={i}>
            {/* Arm */}
            <mesh
              position={[Math.cos(angle) * 0.26, 0.06, Math.sin(angle) * 0.26]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.52, 0.04, 0.075]} />
              <meshStandardMaterial color={METAL} roughness={0.3} metalness={0.65} />
            </mesh>
            {/* Wheel housing */}
            <mesh position={[Math.cos(angle) * 0.46, 0.065, Math.sin(angle) * 0.46]}>
              <boxGeometry args={[0.065, 0.055, 0.055]} />
              <meshStandardMaterial color="#111115" roughness={0.7} />
            </mesh>
            {/* Wheel */}
            <mesh
              position={[Math.cos(angle) * 0.46, 0.045, Math.sin(angle) * 0.46]}
              rotation={[0, angle, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.038, 0.038, 0.038, 10]} />
              <meshStandardMaterial color="#0a0a0e" roughness={0.85} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
