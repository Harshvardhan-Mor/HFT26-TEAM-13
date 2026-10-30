// Smoothly flies the camera from `from` to `to` whenever `trigger` changes.
// Stops as soon as the user grabs the controls, so it never fights them.
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function CameraFlyIn({ trigger, from, to, target = [0, 0, 0], duration = 1.8 }) {
  const { camera, controls } = useThree();
  const anim = useRef(null);

  useEffect(() => {
    camera.position.set(...from);
    anim.current = { t: 0, start: new THREE.Vector3(...from), end: new THREE.Vector3(...to) };
    if (controls) controls.target.set(...target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, controls]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => { anim.current = null; };
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(a.t + dt / duration, 1);
    const k = 1 - (1 - a.t) ** 3; // ease-out cubic
    camera.position.lerpVectors(a.start, a.end, k);
    controls?.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}
