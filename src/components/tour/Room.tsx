import { RoundedBox, ContactShadows, MeshReflectorMaterial, Text } from '@react-three/drei';
import { usePixelTextures } from './usePixelTexture';
import { Desk, DESK_TOP_Y } from './Desk';
import { Workbench, WORKBENCH_TOP_Y, WORKBENCH_X, WORKBENCH_Z } from './Workbench';
import { Bookshelf } from './Bookshelf';
import { Chair } from './Chair';
import { WindowView } from './WindowView';

const WIDTH = 10;
const DEPTH = 8;
const HEIGHT = 3.2;

export { DESK_TOP_Y };
export const DESK_Z = -DEPTH / 2 + 0.58;
export const DESK_X = 0;

interface RoomProps {
  isDark?: boolean;
}

export function Room({ isDark = false }: RoomProps) {
  const tex = usePixelTextures();

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <MeshReflectorMaterial
          map={tex.floor}
          mirror={isDark ? 0.15 : 0}
          mixBlur={8}
          mixStrength={isDark ? 0.25 : 0.4}
          blur={[400, 100]}
          resolution={512}
          roughness={0.85}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color={isDark ? '#3a3028' : '#9b7042'}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, HEIGHT, 0]}>
        <planeGeometry args={[WIDTH, DEPTH]} />
        <meshStandardMaterial map={tex.ceiling} roughness={1} color={isDark ? '#888890' : undefined} />
      </mesh>

      <mesh position={[0, HEIGHT / 2, -DEPTH / 2]}>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        <meshStandardMaterial map={tex.walls} roughness={1} color={isDark ? '#909098' : undefined} />
      </mesh>
      <mesh position={[0, HEIGHT / 2, DEPTH / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        <meshStandardMaterial map={tex.walls} roughness={1} color={isDark ? '#909098' : undefined} />
      </mesh>
      <mesh position={[-WIDTH / 2, HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[DEPTH, HEIGHT]} />
        <meshStandardMaterial map={tex.walls} roughness={1} color={isDark ? '#909098' : undefined} />
      </mesh>
      <mesh position={[WIDTH / 2, HEIGHT / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[DEPTH, HEIGHT]} />
        <meshStandardMaterial map={tex.walls} roughness={1} color={isDark ? '#909098' : undefined} />
      </mesh>

      {[
        { pos: [0, 0.08, -DEPTH / 2 + 0.02] as [number, number, number], args: [WIDTH, 0.14, 0.045] as [number, number, number] },
        { pos: [-WIDTH / 2 + 0.02, 0.08, 0] as [number, number, number], args: [0.045, 0.14, DEPTH] as [number, number, number] },
        { pos: [WIDTH / 2 - 0.02, 0.08, 0] as [number, number, number], args: [0.045, 0.14, DEPTH] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} position={b.pos}>
          <boxGeometry args={b.args} />
          <meshStandardMaterial color={isDark ? '#5a5868' : '#c8c0d4'} roughness={0.9} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, -1.0]}>
        <planeGeometry args={[4.9, 3.8]} />
        <meshStandardMaterial color={isDark ? '#4a3a6a' : '#7a6aaa'} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -1.0]}>
        <planeGeometry args={[4.6, 3.5]} />
        <meshStandardMaterial color={isDark ? '#3a2a5a' : '#5f4f8b'} roughness={0.95} />
      </mesh>

      <group position={[-WIDTH / 2 + 0.07, 1.74, 0.35]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[2.4, 1.55]} />
          <WindowView isDark={isDark} />
        </mesh>
        {[
          { pos: [0, 0.825, 0.015] as [number, number, number], args: [2.58, 0.075, 0.06] as [number, number, number] },
          { pos: [0, -0.825, 0.015] as [number, number, number], args: [2.58, 0.075, 0.06] as [number, number, number] },
          { pos: [-1.27, 0, 0.015] as [number, number, number], args: [0.075, 1.71, 0.06] as [number, number, number] },
          { pos: [1.27, 0, 0.015] as [number, number, number], args: [0.075, 1.71, 0.06] as [number, number, number] },
          { pos: [0, 0, 0.015] as [number, number, number], args: [0.055, 1.71, 0.04] as [number, number, number] },
          { pos: [0, 0.2, 0.015] as [number, number, number], args: [2.58, 0.04, 0.04] as [number, number, number] },
        ].map((f, i) => (
          <mesh key={i} position={f.pos}>
            <boxGeometry args={f.args} />
            <meshStandardMaterial color="#4a4856" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, -0.9, 0.06]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[2.5, 0.06, 0.22]} />
          <meshStandardMaterial color={isDark ? '#6a6878' : '#d8d4e0'} roughness={0.7} />
        </mesh>
      </group>

      {!isDark && (
        <mesh rotation={[-Math.PI / 2, 0, 0.14]} position={[-1.9, 0.016, 0.7]}>
          <planeGeometry args={[2.5, 1.4]} />
          <meshStandardMaterial
            color="#fff8d0"
            transparent
            opacity={0.18}
            emissive="#ffe8a0"
            emissiveIntensity={0.14}
          />
        </mesh>
      )}

      <group position={[3.2, 2.05, -DEPTH / 2 + 0.04]}>
        <RoundedBox args={[1.05, 1.3, 0.04]} radius={0.012} smoothness={3} position={[0, 0, -0.015]}>
          <meshStandardMaterial color="#111118" roughness={0.8} />
        </RoundedBox>
        <mesh>
          <planeGeometry args={[0.88, 1.1]} />
          <meshStandardMaterial map={tex.poster} roughness={1} />
        </mesh>
      </group>

      {/* Sticky notes with text */}
      <group position={[-2.65, 1.95, -DEPTH / 2 + 0.03]} rotation={[0, 0, 0.06]}>
        <mesh>
          <planeGeometry args={[0.32, 0.32]} />
          <meshStandardMaterial color="#e8d44a" roughness={1} emissive="#504818" emissiveIntensity={isDark ? 0.4 : 0.15} />
        </mesh>
        <Text
          position={[0, 0.02, 0.001]}
          fontSize={0.032}
          color="#3a2800"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.26}
          lineHeight={1.3}
        >{`fix memory\nleak in\nparser`}</Text>
      </group>

      <group position={[-2.22, 1.66, -DEPTH / 2 + 0.03]} rotation={[0, 0, -0.05]}>
        <mesh>
          <planeGeometry args={[0.3, 0.3]} />
          <meshStandardMaterial color="#7ad07a" roughness={1} emissive="#1a4018" emissiveIntensity={isDark ? 0.4 : 0.15} />
        </mesh>
        <Text
          position={[0, 0.02, 0.001]}
          fontSize={0.028}
          color="#0a2a0a"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.24}
          lineHeight={1.3}
        >{`read:\nFourier\nanalysis`}</Text>
      </group>

      <group position={[-2.58, 1.62, -DEPTH / 2 + 0.03]} rotation={[0, 0, 0.12]}>
        <mesh>
          <planeGeometry args={[0.27, 0.27]} />
          <meshStandardMaterial color="#ff9966" roughness={1} emissive="#4a2010" emissiveIntensity={isDark ? 0.4 : 0.15} />
        </mesh>
        <Text
          position={[0, 0.02, 0.001]}
          fontSize={0.028}
          color="#3a1200"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.22}
          lineHeight={1.3}
        >{`ORDER\nmore\nsolder!`}</Text>
      </group>

      <group position={[-2.38, 2.18, -DEPTH / 2 + 0.03]} rotation={[0, 0, -0.08]}>
        <mesh>
          <planeGeometry args={[0.28, 0.28]} />
          <meshStandardMaterial color="#c8aaff" roughness={1} emissive="#200840" emissiveIntensity={isDark ? 0.45 : 0.12} />
        </mesh>
        <Text
          position={[0, 0.02, 0.001]}
          fontSize={0.026}
          color="#18003a"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.22}
          lineHeight={1.3}
        >{`ship v2.1\nbefore\nFriday!`}</Text>
      </group>

      <group position={[-2.82, 1.68, -DEPTH / 2 + 0.03]} rotation={[0, 0, 0.04]}>
        <mesh>
          <planeGeometry args={[0.26, 0.26]} />
          <meshStandardMaterial color="#aaddff" roughness={1} emissive="#082040" emissiveIntensity={isDark ? 0.45 : 0.12} />
        </mesh>
        <Text
          position={[0, 0.02, 0.001]}
          fontSize={0.026}
          color="#001830"
          anchorX="center"
          anchorY="middle"
          maxWidth={0.21}
          lineHeight={1.3}
        >{`rm -rf\n/bugs\n--force`}</Text>
      </group>

      <Desk position={[DESK_X, 0, DESK_Z]} />
      <Workbench isDark={isDark} />
      <Bookshelf position={[WIDTH / 2 - 0.22, 0, -1.8]} />
      <Chair position={[0.65, 0, DESK_Z + 1.55]} rotation={[0, Math.PI, 0]} />

      <group position={[0, HEIGHT - 0.01, -0.4]}>
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 0.07, 14]} />
          <meshStandardMaterial color="#4a4858" roughness={0.65} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.02, 14]} />
          <meshStandardMaterial
            color="#fff4d6"
            emissive={isDark ? '#aabbff' : '#fff0c8'}
            emissiveIntensity={isDark ? 0.15 : 0.3}
          />
        </mesh>
      </group>

      <ContactShadows
        position={[0, 0.008, 0]}
        opacity={isDark ? 0.7 : 0.55}
        scale={12}
        blur={2.8}
        far={1.6}
        color={isDark ? '#0a0818' : '#2a1a3a'}
      />

      {isDark ? (
        <>
          <ambientLight intensity={0.06} />
          <hemisphereLight args={['#223355', '#1a1510', 0.12]} />
          <pointLight position={[-WIDTH / 2 + 1, 2.1, 0.5]} intensity={2} color="#334466" distance={11} decay={1.2} />
          <pointLight position={[-4.2, HEIGHT - 0.2, -3.2]} intensity={3} color="#4488ff" distance={8} decay={1.5} />
          <pointLight position={[4.2, HEIGHT - 0.2, -3.2]} intensity={3} color="#9933ff" distance={8} decay={1.5} />
          <pointLight position={[-4.2, HEIGHT - 0.2, 3.2]} intensity={3} color="#9933ff" distance={8} decay={1.5} />
          <pointLight position={[4.2, HEIGHT - 0.2, 3.2]} intensity={3} color="#4488ff" distance={8} decay={1.5} />
          <pointLight position={[0, DESK_TOP_Y - 0.25, DESK_Z]} intensity={2} color="#00ffcc" distance={5} decay={1.8} />
          <pointLight position={[1.05, DESK_TOP_Y + 0.55, DESK_Z + 0.45]} intensity={5} color="#7ab4ff" distance={3.5} decay={1.6} />
          <pointLight
            position={[WORKBENCH_X, WORKBENCH_TOP_Y + 0.35, WORKBENCH_Z]}
            intensity={2.5}
            color="#ff8800"
            distance={2.5}
            decay={2}
          />
        </>
      ) : (
        <>
          <ambientLight intensity={0.45} />
          <hemisphereLight args={['#eef8ff', '#9a7a50', 0.55]} />
          <directionalLight
            castShadow
            position={[-6, 5, 3]}
            intensity={1.7}
            color="#fff5c8"
            // 2048 is free at runtime: FrozenShadows bakes this map once and
            // stops re-rendering it, and the finer map dithers/aliases less
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-6}
            shadow-camera-right={6}
            shadow-camera-top={6}
            shadow-camera-bottom={-6}
            shadow-camera-near={0.5}
            shadow-camera-far={22}
            shadow-bias={-0.0002}
          />
          <directionalLight position={[2, 8, -2]} intensity={0.5} color="#d8eeff" />
          <pointLight position={[-WIDTH / 2 + 1, 2.1, 0.5]} intensity={6} color="#d8f0ff" distance={11} decay={1.1} />
          <pointLight position={[1.05, DESK_TOP_Y + 0.55, DESK_Z + 0.45]} intensity={2.5} color="#7ab4ff" distance={2.8} decay={1.8} />
          <pointLight
            position={[WORKBENCH_X, WORKBENCH_TOP_Y + 0.35, WORKBENCH_Z]}
            intensity={1.8}
            color="#ff8800"
            distance={2}
            decay={2}
          />
        </>
      )}
    </group>
  );
}
