// A planet: textured surface (bumps, shiny oceans, glowing lava), a drifting cloud
// layer for temperate worlds, and a soft atmospheric rim lit from the viewing angle.
// Used by the System, Compare and Intro views.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { planetKind, planetMaps, ATMOSPHERE, glowTexture } from '../lib/textures.js';

/** Fresnel rim: brightest where the surface turns away from the viewer, like a real atmosphere. */
function AtmosphereMaterial({ color, power = 3.2, intensity = 1.1 }) {
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color) },
    uPower: { value: power },
    uIntensity: { value: intensity },
  }), [color, power, intensity]);
  return (
    <shaderMaterial
      uniforms={uniforms}
      transparent
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      side={THREE.FrontSide}
      vertexShader={`
        varying vec3 vNormal; varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`}
      fragmentShader={`
        uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
        varying vec3 vNormal; varying vec3 vView;
        void main() {
          float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), uPower);
          gl_FragColor = vec4(uColor * rim * uIntensity, rim);
        }`}
    />
  );
}

export default function PlanetBody({ planet, radius, onClick, segments = 64 }) {
  const kind = planetKind(planet);
  const maps = useMemo(() => planetMaps(planet.pl_name, kind), [planet.pl_name, kind]);
  const atmo = ATMOSPHERE[kind];
  const clouds = useRef();
  useFrame((_, dt) => { if (clouds.current) clouds.current.rotation.y += dt * 0.02; });

  return (
    <group rotation={[0.41, 0, 0]}>{/* ~23° axial tilt */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[radius, segments, segments / 2]} />
        <meshStandardMaterial
          map={maps.map}
          bumpMap={maps.bumpMap}
          bumpScale={maps.bumpMap ? radius * 0.04 : 0}
          roughnessMap={maps.roughnessMap}
          roughness={1}
          metalness={0}
          emissive={maps.emissiveMap ? '#ffffff' : '#000000'}
          emissiveMap={maps.emissiveMap}
          emissiveIntensity={maps.emissiveMap ? 1.6 : 0}
        />
      </mesh>
      {maps.clouds && (
        <mesh ref={clouds} scale={1.012}>
          <sphereGeometry args={[radius, segments, segments / 2]} />
          <meshStandardMaterial map={maps.clouds} transparent depthWrite={false} roughness={1} />
        </mesh>
      )}
      {atmo && (
        <mesh scale={1.05}>
          <sphereGeometry args={[radius, 48, 24]} />
          <AtmosphereMaterial color={atmo} intensity={kind === 'lava' ? 1.4 : 1.1} />
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
