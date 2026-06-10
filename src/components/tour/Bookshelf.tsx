import { RoundedBox } from '@react-three/drei';
import { usePixelTextures } from './usePixelTexture';

// Book data: [x_offset_on_shelf, shelf_row, width, height, color, tiltDeg]
const SHELF_BOOKS = [
  [-0.75, 0, 0.07, 0.30, '#7a2a2a', -3],
  [-0.65, 0, 0.09, 0.35, '#2a4a7a', 0],
  [-0.54, 0, 0.075, 0.28, '#4a2a7a', 2],
  [-0.44, 0, 0.085, 0.33, '#2a7a4a', -1],
  [-0.34, 0, 0.065, 0.31, '#7a5a2a', 0],
  [-0.26, 0, 0.09, 0.36, '#3a3a3a', 3],
  [-0.15, 0, 0.07, 0.27, '#7a2a5a', -2],
  [ 0.65, 0, 0.07, 0.29, '#2a5a7a', 0],  // leaning stack

  [-0.72, 1, 0.085, 0.32, '#5a7a2a', 2],
  [-0.61, 1, 0.07, 0.34, '#7a3a2a', -2],
  [-0.52, 1, 0.09, 0.30, '#2a2a7a', 0],
  [-0.41, 1, 0.075, 0.28, '#5a2a2a', 3],
  [-0.30, 1, 0.08, 0.35, '#2a7a7a', -1],
  [-0.20, 1, 0.065, 0.26, '#7a6a2a', 0],
  [ 0.50, 1, 0.11, 0.32, '#3a5a3a', -3],

  [-0.70, 2, 0.08, 0.33, '#6a2a7a', 0],
  [-0.60, 2, 0.07, 0.29, '#2a6a4a', 2],
  [-0.52, 2, 0.09, 0.31, '#7a4a2a', -2],
  [-0.41, 2, 0.075, 0.35, '#2a2a5a', 0],
  [-0.30, 2, 0.085, 0.28, '#5a7a5a', 3],
] as const;

const SHELF_YS = [0.42, 1.14, 1.86];

export function Bookshelf({ position = [0, 0, 0] as [number, number, number] } = {}) {
  const tex = usePixelTextures();

  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {/* Carcass back panel */}
      <RoundedBox args={[2.2, 2.5, 0.42]} radius={0.018} smoothness={3} position={[0, 1.25, -0.21]} castShadow>
        <meshPhysicalMaterial
          map={tex.shelfWood}
          roughness={0.55}
          clearcoat={0.3}
          clearcoatRoughness={0.4}
        />
      </RoundedBox>

      {/* Shelf planks */}
      {SHELF_YS.map((y, i) => (
        <RoundedBox
          key={i}
          args={[2.08, 0.05, 0.4]}
          radius={0.01}
          smoothness={2}
          position={[0, y, 0.0]}
          castShadow
        >
          <meshPhysicalMaterial
            map={tex.shelfWood}
            roughness={0.5}
            clearcoat={0.35}
            clearcoatRoughness={0.35}
          />
        </RoundedBox>
      ))}

      {/* Side uprights */}
      {[-1.09, 1.09].map((x, i) => (
        <RoundedBox key={i} args={[0.065, 2.52, 0.44]} radius={0.012} smoothness={3} position={[x, 1.25, 0.0]} castShadow>
          <meshPhysicalMaterial color="#7a5a30" roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.35} />
        </RoundedBox>
      ))}

      {/* Crown rail */}
      <RoundedBox args={[2.26, 0.06, 0.1]} radius={0.01} smoothness={2} position={[0, 2.52, -0.15]}>
        <meshPhysicalMaterial color="#8a6a3a" roughness={0.45} clearcoat={0.4} clearcoatRoughness={0.3} />
      </RoundedBox>

      {/* Books */}
      {SHELF_BOOKS.map(([x, shelfIdx, w, h, col, tilt], i) => (
        <group
          key={i}
          position={[x, (SHELF_YS[shelfIdx] ?? 0.42) + h / 2 + 0.028, 0.06]}
          rotation={[0, 0, (tilt * Math.PI) / 180]}
        >
          {/* Spine */}
          <mesh>
            <boxGeometry args={[w, h, 0.19]} />
            <meshStandardMaterial color={col} roughness={0.75} />
          </mesh>
          {/* Pages fore-edge */}
          <mesh position={[w / 2 + 0.004, 0, 0.01]}>
            <boxGeometry args={[0.014, h - 0.012, 0.17]} />
            <meshStandardMaterial color="#f0ead8" roughness={0.9} />
          </mesh>
          {/* Cover highlight stripe */}
          <mesh position={[0, h * 0.2, 0.1]}>
            <boxGeometry args={[w * 0.6, 0.022, 0.003]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} transparent opacity={0.25} />
          </mesh>
        </group>
      ))}

      {/* Small decorative items */}
      {/* Globe-like sphere on top of shelf */}
      <mesh position={[0.75, 2.6, 0.06]}>
        <sphereGeometry args={[0.085, 14, 14]} />
        <meshStandardMaterial color="#1e6ea0" roughness={0.3} metalness={0.2} />
      </mesh>
      {/* Small succulent pot */}
      <group position={[-0.7, 2.58, 0.04]}>
        <mesh>
          <cylinderGeometry args={[0.055, 0.045, 0.1, 10]} />
          <meshStandardMaterial color="#8a5030" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <sphereGeometry args={[0.065, 8, 6]} />
          <meshStandardMaterial color="#3a8a2a" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
