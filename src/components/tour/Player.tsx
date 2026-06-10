import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useKeyboard } from './useKeyboard';

const SPEED = 4;
const PLAYER_HEIGHT = 1.7;
const BASE_FOV = 70;
const MOVE_FOV = 73;
const INTERACT_DIST = 1.8;
const INTERACT_DOT = 0.2;

const BOUNDS = { minX: -4.6, maxX: 4.6, minZ: -2.4, maxZ: 3.6 };

interface PlayerProps {
  onNearTerminal: (id: string | null) => void;
  terminalPositions: { id: string; position: [number, number, number] }[];
}

export function Player({ onNearTerminal, terminalPositions }: PlayerProps) {
  const { camera } = useThree();
  const keys = useKeyboard();
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const toTarget = useRef(new THREE.Vector3());
  const controlsRef = useRef(null);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    camera.position.set(0, PLAYER_HEIGHT, 3.2);
    camera.lookAt(0, 1.2, -4);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = BASE_FOV;
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame((state, delta) => {
    if (!locked) return;

    const k = keys.current;
    direction.current.set(
      Number(k.right) - Number(k.left),
      0,
      Number(k.backward) - Number(k.forward)
    );

    const isMoving = direction.current.lengthSq() > 0;
    if (isMoving) {
      direction.current.normalize();
    }

    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.setFromQuaternion(camera.quaternion);
    euler.x = 0;
    euler.z = 0;
    const flatQuat = new THREE.Quaternion().setFromEuler(euler);
    direction.current.applyQuaternion(flatQuat);

    velocity.current.copy(direction.current).multiplyScalar(SPEED * delta);

    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x + velocity.current.x,
      BOUNDS.minX,
      BOUNDS.maxX
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z + velocity.current.z,
      BOUNDS.minZ,
      BOUNDS.maxZ
    );

    const t = state.clock.elapsedTime;
    if (isMoving) {
      camera.position.y = PLAYER_HEIGHT + Math.sin(t * 12) * 0.04;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, MOVE_FOV, 0.12);
        camera.updateProjectionMatrix();
      }
    } else {
      camera.position.y = PLAYER_HEIGHT;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, BASE_FOV, 0.12);
        camera.updateProjectionMatrix();
      }
    }

    forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.current.y = 0;
    if (forward.current.lengthSq() > 0) forward.current.normalize();

    let nearest: string | null = null;
    let nearestDist = Infinity;

    for (const term of terminalPositions) {
      const dx = term.position[0] - camera.position.x;
      const dz = term.position[2] - camera.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < INTERACT_DIST) {
        toTarget.current.set(dx, 0, dz);
        if (toTarget.current.lengthSq() > 0) toTarget.current.normalize();
        const dot = forward.current.dot(toTarget.current);
        if (dot > INTERACT_DOT && dist < nearestDist) {
          nearest = term.id;
          nearestDist = dist;
        }
      }
    }

    onNearTerminal(nearest);
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => setLocked(true)}
      onUnlock={() => setLocked(false)}
    />
  );
}
