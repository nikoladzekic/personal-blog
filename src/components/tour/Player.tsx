import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { useKeyboard } from './useKeyboard';
import { resolveMovement } from './colliders';
import { playFootstep } from './sounds';

const SPEED = 4;
const PLAYER_HEIGHT = 1.7;
const BASE_FOV = 70;
const MOVE_FOV = 73;
const INTERACT_DIST = 1.8;
const INTERACT_DOT = 0.2;

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
  const prevBob = useRef(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // Dev helper: camera handle for scripted movement tests
    if (import.meta.env.DEV) (window as any).__cam = camera;
    // Dev helper: ?cam=x,y,z,tx,ty,tz positions the camera for screenshots
    const debugCam = new URLSearchParams(window.location.search).get('cam');
    if (debugCam) {
      const [x, y, z, tx, ty, tz] = debugCam.split(',').map(Number);
      camera.position.set(x ?? 0, y ?? PLAYER_HEIGHT, z ?? 3.2);
      camera.lookAt(tx ?? 0, ty ?? 1.2, tz ?? -4);
    } else {
      camera.position.set(0, PLAYER_HEIGHT, 3.2);
      camera.lookAt(0, 1.2, -4);
    }
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

    const resolved = resolveMovement(
      camera.position.x,
      camera.position.z,
      velocity.current.x,
      velocity.current.z
    );
    camera.position.x = resolved.x;
    camera.position.z = resolved.z;

    const t = state.clock.elapsedTime;
    if (isMoving) {
      const bob = Math.sin(t * 12);
      camera.position.y = PLAYER_HEIGHT + bob * 0.04;
      // Footstep lands at the bottom of each head-bob dip
      if (bob < -0.9 && prevBob.current >= -0.9) {
        playFootstep();
      }
      prevBob.current = bob;
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
