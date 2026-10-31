// Welcome screen: a scroll-driven story. A realistic 3D planet stays pinned behind the
// text and moves, turns and shrinks as you scroll; sections fade and slide in; the
// discovery counter runs from 1992 to today using the real dataset.
// "Skip intro" is always visible, and everything calms down for prefers-reduced-motion.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import PlanetBody from './PlanetBody.jsx';
import './intro.css';

const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Made-up planets for the intro art (artistic impressions, not real data).
const HERO = { pl_name: 'Intro Terra', hab: { radius: { value: 1 }, eqTemp: { value: 255 } } };
const GIANT = { pl_name: 'Intro Giant', hab: { radius: { value: 11 }, eqTemp: { value: 160 } } };
const LAVA = { pl_name: 'Intro Ember', hab: { radius: { value: 1.3 }, eqTemp: { value: 1400 } } };

// Where the hero planet sits at each point of the scroll (progress 0..1).
// x/y are in world units, s is scale, r is extra spin.
const KEYS = [
  { p: 0.0, x: 2.6, y: 0.2, s: 1.0, r: 0 },
  { p: 0.25, x: -2.9, y: -0.3, s: 0.72, r: 1.2 },
  { p: 0.5, x: 2.9, y: 0.4, s: 0.62, r: 2.4 },
  { p: 0.75, x: -2.6, y: 0.1, s: 0.7, r: 3.4 },
  { p: 1.0, x: 0, y: -0.2, s: 1.15, r: 4.6 },
];
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
function keyAt(p) {
  for (let i = 1; i < KEYS.length; i++) {
    if (p <= KEYS[i].p) {
      const a = KEYS[i - 1], b = KEYS[i];
      const t = ease((p - a.p) / (b.p - a.p));
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: a.s + (b.s - a.s) * t, r: a.r + (b.r - a.r) * t };
    }
  }
  return KEYS[KEYS.length - 1];
}

function IntroScene({ progress }) {
  const hero = useRef();
  const spin = useRef();
  const far = useRef();
  const ember = useRef();
  const stars = useRef();
  const { viewport } = useThree();
  const narrow = viewport.aspect < 0.9;

  useFrame((_, dt) => {
    const p = progress.current;
    const k = keyAt(p);
    const f = reduced ? 1 : 1 - Math.exp(-dt * 4); // smooth follow, frame-rate independent
    const x = narrow ? k.x * 0.25 : k.x;
    const y = narrow ? 1.4 + k.y * 0.3 : k.y;
    const s = narrow ? k.s * 0.75 : k.s;
    hero.current.position.x += (x - hero.current.position.x) * f;
    hero.current.position.y += (y - hero.current.position.y) * f;
    hero.current.scale.setScalar(hero.current.scale.x + (s - hero.current.scale.x) * f);
    // Slow idle spin plus an extra turn that follows the scroll.
    const u = spin.current.userData;
    u.base = (u.base ?? 0) + (reduced ? 0 : dt * 0.06);
    u.r = (u.r ?? 0) + (k.r - (u.r ?? 0)) * f;
    spin.current.rotation.y = u.base + u.r;
    // Background worlds drift at different speeds: parallax depth.
    // The gas giant stays on the opposite side to the hero planet, behind the glass text
    // panels; it rises in after the first screen and leaves before the last.
    const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const gx = narrow ? 0 : -k.x * 2.6;
    const gy = -15 + 14 * sm(0.05, 0.22, p) + 16 * sm(0.8, 1, p);
    far.current.position.x += (gx - far.current.position.x) * f * 0.6;
    far.current.position.y += (gy - far.current.position.y) * f;
    far.current.rotation.y += dt * 0.01;
    ember.current.position.y = 5 - p * 15;
    ember.current.rotation.y += dt * 0.05;
    stars.current.rotation.x = p * 0.6;
    stars.current.rotation.y += reduced ? 0 : dt * 0.004;
  });

  return (
    <>
      <ambientLight intensity={0.05} />
      {/* A distant "sun" off to the upper left gives a crisp day/night terminator. */}
      <directionalLight position={[-6, 3, 4]} intensity={3.2} color="#fff4e6" />
      <group ref={stars}><Stars radius={80} depth={40} count={4000} factor={3} fade speed={0.4} /></group>
      <group ref={hero} position={[2.6, 0.2, 0]}>
        <group ref={spin}><PlanetBody planet={HERO} radius={1.6} segments={96} /></group>
      </group>
      <group ref={far} position={[0, -15, -16]}><PlanetBody planet={GIANT} radius={3.2} /></group>
      <group ref={ember} position={[9, 5, -8]}><PlanetBody planet={LAVA} radius={0.5} /></group>
    </>
  );
}

/** Adds .in to elements with [data-reveal] when they scroll into view. */
function useReveal(root) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = el.querySelectorAll('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { root: el, threshold: 0.25 });
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, [root]);
}

/** Types out text once `start` becomes true. */
function useTyped(text, start) {
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (!start || reduced) return;
    const id = setInterval(() => setN((v) => (v >= text.length ? (clearInterval(id), v) : v + 2)), 22);
    return () => clearInterval(id);
  }, [start, text]);
  return text.slice(0, n);
}

const ASTRA_SAMPLE = 'TRAPPIST-1 e gets about two-thirds of the starlight Earth does, which puts it inside its star’s conservative habitable zone. It is close to Earth’s size, so it is probably rocky. Whether it has an atmosphere is still an open question that JWST is working on.';

export default function IntroScreen({ stats, sample, onStart, onTour }) {
  const root = useRef();
  const timeline = useRef();
  const progress = useRef(0);
  const [tl, setTl] = useState(0);      // 0..1 progress through the timeline section
  const [chatOn, setChatOn] = useState(false);
  const typed = useTyped(ASTRA_SAMPLE, chatOn);
  useReveal(root);

  const years = stats.byYear ?? [];
  const firstYear = years[0]?.[0] ?? 1992;
  const lastYear = years[years.length - 1]?.[0] ?? new Date().getFullYear();
  const maxN = Math.max(1, ...years.map(([, n]) => n));
  const cumulative = useMemo(() => { let c = 0; return years.map(([y, n]) => [y, (c += n)]); }, [years]);
  const year = Math.round(firstYear + (lastYear - firstYear) * tl);
  const count = cumulative.filter(([y]) => y <= year).at(-1)?.[1] ?? 0;

  const onScroll = () => {
    const el = root.current;
    const max = el.scrollHeight - el.clientHeight;
    progress.current = max > 0 ? el.scrollTop / max : 0;
    // Timeline section: progress while it crosses the viewport.
    const t = timeline.current.getBoundingClientRect();
    const v = el.clientHeight;
    setTl(Math.min(1, Math.max(0, (v * 0.85 - t.top) / (t.height * 0.9))));
    if (!chatOn && progress.current > 0.6) setChatOn(true);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onStart(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="intro-story" role="dialog" aria-label="Welcome" ref={root} onScroll={onScroll}>
      <div className="intro-canvas" aria-hidden="true">
        <Canvas camera={{ position: [0, 0, 9], fov: 40 }} dpr={[1, 2]} gl={{ antialias: true }}>
          <IntroScene progress={progress} />
        </Canvas>
      </div>
      <div className="intro-vignette" aria-hidden="true" />
      <div className="intro-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress.current})` }} /></div>
      <button className="intro-skip" onClick={onStart}>Skip intro →</button>

      {/* 1. Hero */}
      <section className="story hero">
        <div className="story-text">
          <p className="eyebrow" data-reveal>NASA Exoplanet Archive · AI virtual astronomer</p>
          <h1 data-reveal>Exoplanet<br />Explorer</h1>
          <p className="tagline" data-reveal>Fly through every known world beyond our Solar System, see which ones might be habitable, and ask an AI astronomer what makes them special.</p>
          <div className="intro-actions" data-reveal>
            <button className="primary big-btn" onClick={onStart}>🚀 Start exploring</button>
            <button className="big-btn" onClick={onTour}>🎬 Take the guided tour</button>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true"><span />Scroll to discover</div>
      </section>

      {/* 2. Discovery timeline */}
      <section className="story right" ref={timeline}>
        <div className="story-text">
          <p className="eyebrow" data-reveal>Chapter 1 · Discovery</p>
          <h2 data-reveal>In {firstYear}, we knew of almost none.</h2>
          <div className="counter" data-reveal>
            <b>{count.toLocaleString()}</b>
            <span>planets confirmed by <em>{year}</em></span>
          </div>
          <div className="bars" data-reveal aria-hidden="true">
            {years.map(([y, n]) => (
              <i key={y} className={y <= year ? 'on' : ''} style={{ height: `${8 + (n / maxN) * 92}%` }} title={`${y}: ${n}`} />
            ))}
          </div>
          <p className="story-p" data-reveal>Today there are <b>{stats.planets.toLocaleString()}</b> confirmed planets around <b>{stats.systems.toLocaleString()}</b> stars, every one of them in this app, at its real position in the sky.</p>
        </div>
      </section>

      {/* 3. Habitability */}
      <section className="story">
        <div className="story-text">
          <p className="eyebrow" data-reveal>Chapter 2 · Could anything live there?</p>
          <h2 data-reveal>{stats.habitable.toLocaleString()} worlds pass the first tests.</h2>
          <div className="cards">
            <div className="card" data-reveal><span className="card-ico">☀️</span><h3>Right distance</h3><p>Inside the zone where liquid water could exist, using Kopparapu et al. (2014).</p></div>
            <div className="card" data-reveal><span className="card-ico">🪨</span><h3>Right size</h3><p>Small enough to be rocky: up to about 1.6 Earth radii, following the PHL catalogue.</p></div>
            <div className="card" data-reveal><span className="card-ico">🌍</span><h3>Earth-like</h3><p>An Earth Similarity Index score from size and starlight, from 0 to 1.</p></div>
          </div>
          <p className="story-p small muted" data-reveal>These are indicators, not evidence of life.</p>
        </div>
      </section>

      {/* 4. Astra */}
      <section className="story right">
        <div className="story-text">
          <p className="eyebrow" data-reveal>Chapter 3 · Ask Astra</p>
          <h2 data-reveal>An AI astronomer that shows its sources.</h2>
          <div className="chat-demo" data-reveal>
            <div className="bubble me">Could TRAPPIST-1 e be habitable?</div>
            <div className="bubble astra"><b>Astra</b>{typed}<span className="caret" /></div>
          </div>
          <p className="story-p small muted" data-reveal>Example answer. In the app, Astra only uses the NASA numbers for the planet you pick, in English, Hindi or Telugu.</p>
        </div>
      </section>

      {/* 5. Call to action */}
      <section className="story center">
        <div className="story-text">
          <h2 data-reveal>Ready to explore?</h2>
          <div className="intro-actions" data-reveal>
            <button className="primary big-btn" onClick={onStart}>🚀 Start exploring</button>
            <button className="big-btn" onClick={onTour}>🎬 Take the guided tour</button>
          </div>
          <p className="intro-note" data-reveal>
            {sample ? 'Showing the offline sample. Run `npm run fetch-data` for the full NASA dataset. ' : ''}
            Planet surfaces are artistic impressions: no exoplanet surface has ever been photographed.
          </p>
        </div>
      </section>
    </div>
  );
}
