// Run with: npm test
// Sanity checks: Earth-like inputs must give Earth-like results.
import test from 'node:test';
import assert from 'node:assert/strict';
import { seff, earthSimilarity, zoneStatus, habitableZone, phlSample } from '../src/lib/habitability.js';

const earthLike = {
  pl_rade: 1, pl_insol: 1, pl_orbsmax: 1, pl_orbper: 365.25,
  st_teff: 5780, st_lum: 0, st_rad: 1, st_mass: 1,
};

test('Kopparapu 2014 Sun-like limits match the published SeffSun values', () => {
  assert.equal(seff('runawayGreenhouse', 5780), 1.107);
  assert.equal(seff('maximumGreenhouse', 5780), 0.356);
  assert.equal(seff('recentVenus', 5780), 1.776);
  assert.equal(seff('earlyMars', 5780), 0.320);
});

test('Sun-like conservative HZ is about 0.95 to 1.68 AU', () => {
  const hz = habitableZone(earthLike);
  assert.ok(Math.abs(hz.au.runawayGreenhouse - 0.950) < 0.01);
  assert.ok(Math.abs(hz.au.maximumGreenhouse - 1.676) < 0.01);
});

test('Earth has ESI = 1 and sits in the conservative HZ', () => {
  assert.equal(earthSimilarity(earthLike).value, 1);
  assert.equal(zoneStatus(earthLike).key, 'conservative');
  assert.equal(phlSample(earthLike), 'conservative');
});

test('A hot Jupiter is classed as too hot with low ESI', () => {
  const hotJupiter = { ...earthLike, pl_rade: 15, pl_insol: 900 };
  assert.equal(zoneStatus(hotJupiter).key, 'hot');
  assert.ok(earthSimilarity(hotJupiter).value < 0.2);
  assert.equal(phlSample(hotJupiter), null);
});

test('Missing star data gives unknown, not a crash', () => {
  assert.equal(zoneStatus({ pl_rade: 1 }).key, 'unknown');
});
