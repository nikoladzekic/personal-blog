import {
  EffectComposer,
  Bloom,
  Vignette,
  Pixelation,
  SSAO,
} from '@react-three/postprocessing';

interface EffectsProps {
  isDark?: boolean;
}

export function Effects({ isDark = false }: EffectsProps) {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      <SSAO
        samples={16}
        radius={0.05}
        intensity={isDark ? 8 : 12}
        luminanceInfluence={0.6}
        distanceThreshold={1}
        rangeThreshold={0.5}
      />

      <Bloom
        intensity={isDark ? 1.2 : 0.35}
        luminanceThreshold={isDark ? 0.3 : 0.55}
        luminanceSmoothing={0.45}
        mipmapBlur
        radius={isDark ? 0.5 : 0.35}
      />

      <Pixelation granularity={2} />

      <Vignette offset={0.5} darkness={isDark ? 0.35 : 0.18} />
    </EffectComposer>
  );
}
