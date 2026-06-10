import { useEffect, useRef } from 'react';

export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  interact: boolean;
}

export function useKeyboard(): React.RefObject<KeyState> {
  const keys = useRef<KeyState>({
    forward: false, backward: false,
    left: false,    right: false,
    interact: false,
  });

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.current.forward  = true; break;
        case 'KeyS': case 'ArrowDown':  keys.current.backward = true; break;
        case 'KeyA': case 'ArrowLeft':  keys.current.left     = true; break;
        case 'KeyD': case 'ArrowRight': keys.current.right    = true; break;
        case 'KeyE':                    keys.current.interact = true; break;
      }
    };

    const onUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.current.forward  = false; break;
        case 'KeyS': case 'ArrowDown':  keys.current.backward = false; break;
        case 'KeyA': case 'ArrowLeft':  keys.current.left     = false; break;
        case 'KeyD': case 'ArrowRight': keys.current.right    = false; break;
        case 'KeyE':                    keys.current.interact = false; break;
      }
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  return keys;
}
