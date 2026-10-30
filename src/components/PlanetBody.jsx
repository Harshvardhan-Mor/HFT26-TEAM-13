// A textured planet sphere with a thin atmosphere glow. Used by System and Compare views.
import { useMemo } from 'react';
import * as THREE from 'three';
import { planetKind, planetTexture, ATMOSPHERE, glowTexture } from '../lib/textures.js';

export default function PlanetBody({ planet, radius, onClick }) {
  const kind = planetKind(planet);
  const map = useMemo(() => planetTexture(planet.pl_name, kind), [planet.pl_name, kind]);
  const atmo = ATMOSPHERE[kind];
  return (
    <group>
      <mesh onClick={onClick} rotation={[0.25, 0, 0]}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshStandardMaterial map={map} roughness={0.85} metalness={0.05}
          emissive={kind === 'lava' ? '#ff4a10' : '#000000'} emissiveIntensity={kind === 'lava' ? 0.35 : 0} emissiveMap={kind === 'lava' ? map : null} />
      </mesh>
      {atmo && (
        <mesh scale={1.06}>
          <sphereGeometry args={[radius, 32, 32]} />
          <meshBasicMaterial color={atmo} transparent opacity={0.12} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/** Additive glow sprite for stars. */
export function StarGlow({ color, size }) {
  return (
    <sprite scale={[size, size, 1]}>
      <spriteMaterial map={glowTexture()} color={color} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
    </sprite>
  );
}
