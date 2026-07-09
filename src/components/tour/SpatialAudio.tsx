import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getListener,
  resumeAudio,
  getPcHumBuffer,
  getBenchBuzzBuffer,
  getWindowAmbienceBuffer,
} from './sounds';

const SOURCES: {
  position: [number, number, number];
  make: (ctx: AudioContext) => AudioBuffer;
  volume: number;
  refDistance: number;
  rolloff: number;
}[] = [
  // PC tower on the desk (sm_pc world position)
  { position: [1.29, 1.35, -3.42], make: getPcHumBuffer, volume: 0.5, refDistance: 0.7, rolloff: 2 },
  // Soldering station on the workbench
  { position: [-3.92, 0.75, -1.15], make: getBenchBuzzBuffer, volume: 0.3, refDistance: 0.6, rolloff: 2 },
  // Window on the left wall
  { position: [-4.93, 1.74, 0.35], make: getWindowAmbienceBuffer, volume: 0.4, refDistance: 1.4, rolloff: 1.6 },
];

export function SpatialAudio() {
  const { camera, scene } = useThree();

  useEffect(() => {
    const listener = getListener();
    camera.add(listener);

    const sounds = SOURCES.map((s) => {
      const audio = new THREE.PositionalAudio(listener);
      audio.setBuffer(s.make(listener.context as AudioContext));
      audio.setLoop(true);
      audio.setVolume(s.volume);
      audio.setRefDistance(s.refDistance);
      audio.setRolloffFactor(s.rolloff);
      audio.position.set(...s.position);
      scene.add(audio);
      return audio;
    });

    // The click that grabs pointer lock is the user gesture that lets the
    // AudioContext start; until then it sits suspended.
    const startAll = () => {
      resumeAudio();
      for (const snd of sounds) {
        if (!snd.isPlaying) snd.play();
      }
    };

    document.addEventListener('pointerlockchange', startAll);
    if (listener.context.state === 'running') startAll();

    return () => {
      document.removeEventListener('pointerlockchange', startAll);
      for (const snd of sounds) {
        if (snd.isPlaying) snd.stop();
        scene.remove(snd);
      }
      camera.remove(listener);
    };
  }, [camera, scene]);

  return null;
}
