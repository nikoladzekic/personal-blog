import {
  EffectComposer,
  Bloom,
  Vignette,
  SSAO,
  ToneMapping,
} from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

interface EffectsProps {
  isDark?: boolean;
}

export function Effects({ isDark = false }: EffectsProps) {
  return (
    <EffectComposer multisampling={0} enableNormalPass>
      {/* full-quality AO relative to the buffer. The canvas already renders at
          dpr 0.5, so this costs ~¼ of the original full-res AO — and A/B
          measurement showed the cheap 8-sample/half-scale variant (which made
          bright day walls visibly grainy) only bought ~2fps. Don't re-cheapen. */}
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

      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />

      {/* the retro 2px pixelation now comes free from the half-res canvas
          upscaling with image-rendering: pixelated (see World.tsx dpr) */}

      <Vignette offset={0.5} darkness={isDark ? 0.35 : 0.18} />
    </EffectComposer>
  );
}
