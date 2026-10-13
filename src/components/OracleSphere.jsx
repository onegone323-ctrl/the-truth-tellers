import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import useViewportWidth from "@/hooks/useViewportWidth";
import { getVoiceAnalyser } from "@/lib/oracleVoice";

// The OracleSphere — the Oracle's true form: a spinning gold network globe
// (points + connective filaments over a dark core). While the Oracle speaks,
// it ENGULFS into fire — a live ember storm around the globe whose colors
// (blood -> gold -> ivory) are driven by the real audio energy of his voice.
// States: idle | listening | thinking | speaking.

// Brand palette
const BLOOD = new THREE.Color("#8b1a2b");
const GOLD = new THREE.Color("#d4af37");
const IVORY = new THREE.Color("#f0e6d2");

// Soft round glow sprite so every particle reads as a spark, not a square.
function sparkTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// Evenly distributed points on a unit sphere (Fibonacci lattice).
function fibonacciSphere(n) {
  const pts = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    pts.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return pts;
}

// Connect each globe point to its two nearest neighbors — the "network".
function buildFilaments(pts) {
  const pairs = new Set();
  const positions = [];
  for (let i = 0; i < pts.length; i++) {
    const d = [];
    for (let j = 0; j < pts.length; j++) {
      if (i === j) continue;
      d.push([pts[i].distanceTo(pts[j]), j]);
    }
    d.sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 2; k++) {
      const j = d[k][1];
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      positions.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
    }
  }
  return positions;
}

export default function OracleSphere({ state = "idle", size = 215 }) {
  const vw = useViewportWidth();
  const effective = vw < 768 ? Math.min(size, Math.round(vw * 0.6)) : size;
  const mountRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = effective < 190;
    const GLOBE_POINTS = small ? 220 : 420;
    const EMBERS = small ? 160 : 340;

    // ---- Scene ----
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 3.4;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    renderer.setSize(effective, effective);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const spark = sparkTexture();

    // Dark core — occludes the far side of the network so it reads as a solid
    // mystical globe with depth.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.92, 32, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#07050a"), transparent: true, opacity: 0.94 })
    );
    scene.add(core);

    // Warm glow halo behind the network.
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: spark, color: GOLD, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    halo.scale.setScalar(3.1);
    scene.add(halo);

    // ---- Network globe ----
    const globePts = fibonacciSphere(GLOBE_POINTS);
    const globePos = new Float32Array(GLOBE_POINTS * 3);
    globePts.forEach((p, i) => p.toArray(globePos, i * 3));
    const globeGeo = new THREE.BufferGeometry();
    globeGeo.setAttribute("position", new THREE.BufferAttribute(globePos, 3));
    const globeMat = new THREE.PointsMaterial({
      size: 0.052, map: spark, color: GOLD, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const globe = new THREE.Points(globeGeo, globeMat);

    // Filaments (connective lines between neighbors).
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buildFilaments(globePts)), 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: GOLD, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const filaments = new THREE.LineSegments(lineGeo, lineMat);

    const globeGroup = new THREE.Group();
    globeGroup.add(globe);
    globeGroup.add(filaments);
    scene.add(globeGroup);

    // ---- Fire embers ----
    const emberPos = new Float32Array(EMBERS * 3);
    const emberCol = new Float32Array(EMBERS * 3);
    const emberVel = [];
    const emberLife = new Float32Array(EMBERS);
    const emberRate = new Float32Array(EMBERS);
    const resetEmber = (i) => {
      // Born on the globe's surface, rising with a little outward drift.
      const p = globePts[Math.floor(Math.random() * GLOBE_POINTS)];
      emberPos[i * 3] = p.x * 0.98;
      emberPos[i * 3 + 1] = p.y * 0.98;
      emberPos[i * 3 + 2] = p.z * 0.98;
      emberVel[i] = {
        x: p.x * 0.25 + (Math.random() - 0.5) * 0.12,
        y: 0.35 + Math.random() * 0.5,
        z: p.z * 0.25 + (Math.random() - 0.5) * 0.12,
      };
      emberLife[i] = Math.random() * 0.5;
      emberRate[i] = 0.35 + Math.random() * 0.5;
    };
    for (let i = 0; i < EMBERS; i++) { emberVel.push(null); resetEmber(i); }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute("position", new THREE.BufferAttribute(emberPos, 3));
    emberGeo.setAttribute("color", new THREE.BufferAttribute(emberCol, 3));
    const emberMat = new THREE.PointsMaterial({
      size: 0.085, map: spark, vertexColors: true, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const embers = new THREE.Points(emberGeo, emberMat);
    scene.add(embers);

    // ---- Voice-driven energy ----
    const freq = new Uint8Array(128);
    let energy = 0.12; // smoothed 0..1 audio energy of the Oracle's voice
    const voiceEnergy = () => {
      const an = getVoiceAnalyser();
      if (!an) return null;
      an.getByteFrequencyData(freq);
      let s = 0;
      for (let i = 0; i < freq.length; i++) s += freq[i];
      return s / freq.length / 255;
    };

    // Engulf burst: a violent outward rush the moment his voice starts.
    let burst = 0;

    // ---- Loop ----
    let raf = 0;
    let last = performance.now();
    const clock = { t: 0 };
    const tmpColor = new THREE.Color();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      clock.t += dt;

      const st = stateRef.current;
      const speaking = st === "speaking";
      const thinking = st === "thinking";

      // Voice energy drives the fire when he speaks; without a live analyser
      // (some browsers) the fire still breathes on its own pulse.
      const v = voiceEnergy();
      const target = speaking
        ? (v === null ? 0.35 + 0.25 * Math.sin(clock.t * 2.1) : 0.18 + v * 1.15)
        : 0.08;
      energy += (Math.max(0, Math.min(1, target)) - energy) * Math.min(1, dt * 6);

      // Spin: slow idle, faster while thinking, wide-eyed while speaking.
      const speed = reduced ? 0.05 : speaking ? 0.55 : thinking ? 0.42 : 0.16;
      globeGroup.rotation.y += speed * dt;
      globeGroup.rotation.x = Math.sin(clock.t * 0.18) * 0.12;

      // Engulf burst decays.
      burst = Math.max(0, burst - dt * 0.7);

      // Embers: fade in only for the fire state.
      const fireLevel = speaking ? 0.85 : 0;
      emberMat.opacity += (fireLevel - emberMat.opacity) * Math.min(1, dt * 3.2);

      // Fire palette: blood at rest, gold as the voice lifts, ivory flashes.
      tmpColor.copy(BLOOD).lerp(GOLD, Math.min(1, energy * 1.5)).lerp(IVORY, energy * energy * 0.9);
      const heat = energy * (1 + burst * 1.6);

      for (let i = 0; i < EMBERS; i++) {
        if (emberMat.opacity < 0.02) break;
        const v3 = emberVel[i];
        if (!v3) { resetEmber(i); continue; }
        emberPos[i * 3] += v3.x * dt * (1 + heat);
        emberPos[i * 3 + 1] += v3.y * dt * (1 + heat * 1.6);
        emberPos[i * 3 + 2] += v3.z * dt * (1 + heat);
        // gentle swirl around the globe
        const x = emberPos[i * 3], z = emberPos[i * 3 + 2];
        const a = 0.55 * dt;
        emberPos[i * 3] = x * Math.cos(a) - z * Math.sin(a);
        emberPos[i * 3 + 2] = x * Math.sin(a) + z * Math.cos(a);
        emberLife[i] += emberRate[i] * dt;
        if (emberLife[i] > 1) resetEmber(i);
        // brightness fades with life; color rides the voice energy
        const glow = (1 - emberLife[i]) * (0.55 + heat * 0.6);
        emberCol[i * 3] = tmpColor.r * glow;
        emberCol[i * 3 + 1] = tmpColor.g * glow;
        emberCol[i * 3 + 2] = tmpColor.b * glow;
      }
      emberGeo.attributes.position.needsUpdate = true;
      emberGeo.attributes.color.needsUpdate = true;

      // Globe + halo react: warm up and swell with the voice.
      globeMat.color.copy(tmpColor).lerp(GOLD, 0.5);
      globeMat.size = 0.052 + energy * 0.03 + burst * 0.04;
      globeMat.opacity = speaking ? 0.65 + energy * 0.35 : 0.95;
      lineMat.opacity = speaking ? 0.1 + energy * 0.12 : 0.16;
      const swell = 1 + energy * 0.06 + burst * 0.1 + Math.sin(clock.t * 1.4) * 0.012;
      core.scale.setScalar(swell);
      core.material.color.setRGB(0.028 + heat * 0.05, 0.02 + heat * 0.03, 0.04);
      halo.material.opacity = 0.12 + energy * 0.3 + burst * 0.25;
      halo.material.color.copy(tmpColor);
      halo.scale.setScalar(3.1 + energy * 0.5 + burst * 0.6);

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
      globeGeo.dispose(); lineGeo.dispose(); emberGeo.dispose();
      globeMat.dispose(); lineMat.dispose(); emberMat.dispose();
      core.geometry.dispose(); core.material.dispose();
      halo.material.dispose();
      spark.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [effective]);

  return (
    <div
      ref={mountRef}
      role="img"
      aria-label={`The Oracle — ${state}`}
      style={{ width: effective, height: effective }}
    />
  );
}