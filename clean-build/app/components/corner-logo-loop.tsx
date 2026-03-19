"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Phase = "mix" | "settle" | "hold";

type LetterBody = {
  glyph: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  tx: number;
  ty: number;
};

const GLYPH_BASE_RADIUS = [120, 132, 126, 112, 118, 116];

const VIEWBOX = 2834.6;
const CENTER = VIEWBOX / 2;
const RADIUS = VIEWBOX / 2;

const MIX_MS = 2800;
const SETTLE_MS = 150;
const HOLD_MS = 0;
const LOOP_MS = MIX_MS + SETTLE_MS + HOLD_MS;

const GLYPHS = [
  {
    d: "M410.6,1340.8l-96.3,180.3c-11.2,20.7-25.4,30.6-42.4,29.6-22-1.3-36.7-19.3-35.6-37,.5-9.2,4-19,10.3-29.3l125.7-219.9c12-21.4,26.8-31.2,44.6-30.2,17.7,1.1,31.3,12.6,40.6,35.2l98.8,233.2c5.1,11,7.3,21.1,6.8,30.3-1.1,17.8-17.7,33.9-39.7,32.6-17.1-1-29.9-12.5-38.6-34.4l-74.2-190.4Z",
    cx: 401,
    cy: 1385,
    fill: "#fff",
  },
  {
    d: "M728.8,1660.5c-24.2-28.6-35-64.9-32.4-109.5,2.6-43.9,17.6-78.7,45.1-104.2,27.5-25.6,60.5-37.2,99.9-34.9,37.4,2.2,65.2,14.9,82.7,37.3l.2-2.6c1-17.4,16-28.9,34.7-27.8,20,1.2,34.1,16.3,32.7,39.6l-13.1,219.5c-1.4,23.3-17.1,36.6-37.1,35.4-18.1-1.1-32.2-13.6-31.2-31l.2-2.6c-21.3,20.1-50.3,28.7-86.5,26.6-39.4-2.3-70.8-17.8-95.1-45.8ZM918.6,1564.2c3.1-51.7-24-87-69.8-89.7-43.9-2.6-77.6,29.7-80.6,80.7-3,51,25.9,87.1,70.5,89.7,45.8,2.7,76.9-29.1,80-80.8Z",
    cx: 840,
    cy: 1560,
    fill: "#fff",
  },
  {
    d: "M1325.5,1697c11-7.5,21.1-11,30.4-10.5,16.3,1,27.8,13.9,26.8,30.2-.9,14.5-11.6,27.3-31.9,37.2-30.1,15.7-61.4,22.6-93.4,20.7-40.1-2.4-71.9-16.5-96.6-43.1-24.7-26.6-35.6-58.7-33.3-97.6,2.3-38.9,16.9-69.6,44.6-93,27.7-23.4,60.9-33.7,101-31.3,32,1.9,62.3,12.5,90.3,31.6,19.1,12.2,28.2,26.2,27.3,40.7-1,16.3-13.9,27.8-30.2,26.8s-18.9-5.2-28.9-14c-19.3-18.1-39.7-28-61.2-29.3-41.9-2.5-75.7,26.4-78.4,72.3-2.7,45.9,27.4,78.6,69.3,81.1,21.5,1.3,42.9-6.2,64.3-21.8Z",
    cx: 1258,
    cy: 1632,
    fill: "#fff",
  },
  {
    d: "M1756,1649c20.6,1.2,32.5,11.3,31.6,27.3-1,17-12.4,25.2-34.6,23.9-7.3-.4-19.6-1.7-36.6-3.2-17-1.5-26.8-2.6-29.9-2.8l-8.9,150.3c-1.1,19.1-13.2,29.8-29.7,28.8-17.1-1-27.2-13-26.1-32.1l8.9-150.3c-26.4,0-48.7-.8-66.8-1.9-22.2-1.3-32.5-10.8-31.5-27.8,1-16,13.9-24.6,34.6-23.4l189.1,11.2Z",
    cx: 1658,
    cy: 1710,
    fill: "#fff",
  },
  {
    d: "M2114.3,1788.2l-9.1,152.9c-1,16.7-12,26-26.5,25.2-14.9-.9-24.7-11.5-23.7-28.2l5.9-99.5-92.3,102.5c-11.2,12-21.5,17.8-31.4,17.2-14.9-.9-23.4-10.9-22.4-27.7l9.1-153.7c-.6-35.4,54.6-32.2,49.7,3l-6,101.3,92.3-103c11.2-12.5,21.5-18.7,31.5-18.1,14.5.9,23.8,11.9,22.8,28.1Z",
    cx: 2018,
    cy: 1848,
    fill: "#fff",
  },
  {
    d: "M2378.6,2047.5l-52.7-73.9-30.2,18.4-2.3,38.3c-.9,14.3-9.8,21.9-22.2,21.2-12-.7-20-9.4-19.2-23.7l7.8-131.6c.8-13.9,9.8-21.9,22.2-21.2,12,.7,20,9.7,19.2,23.7l-2.8,46.8,85.3-55.5c8.9-5.3,16.4-7.9,22.6-7.6,12,.7,19.3,9.3,18.5,21.3-.5,8.1-5.6,15.2-14.8,20.5l-48.4,29,48.9,66.2c6.1,8.1,8.8,15.3,8.5,21.1-.6,10.8-8.9,19.3-21.3,18.5-7.3-.4-13.7-4.3-19.1-11.6Z",
    cx: 2336,
    cy: 1965,
    fill: "#fff",
  },
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function easeOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function circleCollide(body: LetterBody, dt: number, letterRadius: number) {
  const innerRadius = RADIUS - 160 - letterRadius;
  const dx = body.x - CENTER;
  const dy = body.y - CENTER;
  const dist = Math.hypot(dx, dy);
  if (dist <= innerRadius) return;

  const nx = dx / (dist || 1);
  const ny = dy / (dist || 1);
  body.x = CENTER + nx * innerRadius;
  body.y = CENTER + ny * innerRadius;

  const vn = body.vx * nx + body.vy * ny;
  body.vx -= 1.8 * vn * nx;
  body.vy -= 1.8 * vn * ny;
  body.vx += -ny * 380 * dt;
  body.vy += nx * 380 * dt;
}

function resolveLetterCollisions(bodies: LetterBody[], glyphScale: number) {
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const a = bodies[i];
      const b = bodies[j];
      const ra = GLYPH_BASE_RADIUS[a.glyph] * glyphScale;
      const rb = GLYPH_BASE_RADIUS[b.glyph] * glyphScale;
      const minDist = ra + rb;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= minDist || dist === 0) {
        continue;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const relVelNormal = rvx * nx + rvy * ny;
      if (relVelNormal > 0) {
        continue;
      }

      const restitution = 0.62 + Math.random() * 0.3;
      const impulse = (-(1 + restitution) * relVelNormal) / 2;
      a.vx -= impulse * nx;
      a.vy -= impulse * ny;
      b.vx += impulse * nx;
      b.vy += impulse * ny;
    }
  }
}

function resolveLetterCollisionsIterative(bodies: LetterBody[], glyphScale: number) {
  for (let i = 0; i < 6; i += 1) {
    resolveLetterCollisions(bodies, glyphScale);
    for (const body of bodies) {
      const r = GLYPH_BASE_RADIUS[body.glyph] * glyphScale;
      circleCollide(body, 0.016, r);
    }
  }
}

export function CornerLogoLoop() {
  const pathname = usePathname();
  const [tick, setTick] = useState(0);
  const lettersRef = useRef<LetterBody[]>([]);
  const phaseRef = useRef<Phase>("mix");
  const isPlayingRef = useRef(false);
  const rotationRef = useRef(0);
  const settleStartRotationRef = useRef(0);
  const bounceScaleRef = useRef(1);
  const glyphScaleRef = useRef(1);
  const runStartRef = useRef(0);
  const lastTsRef = useRef(0);
  const frameIdRef = useRef<number | null>(null);
  const settleFromRef = useRef<Array<{ x: number; y: number }>>([]);

  const targets = useMemo(
    () => GLYPHS.map((glyph) => ({ x: glyph.cx, y: glyph.cy })),
    []
  );

  if (pathname?.startsWith("/editor")) {
    return null;
  }

  const renderBodies =
    lettersRef.current.length > 0
      ? lettersRef.current
      : targets.map((target, index) => ({
          glyph: index,
          x: target.x,
          y: target.y,
          vx: 0,
          vy: 0,
          angle: 0,
          spin: 0,
          tx: target.x,
          ty: target.y,
        }));

  function resetBodiesToTargets() {
    lettersRef.current = targets.map((target, index) => ({
      glyph: index,
      x: target.x,
      y: target.y,
      vx: 0,
      vy: 0,
      angle: 0,
      spin: 0,
      tx: target.x,
      ty: target.y,
    }));
  }

  function frame(ts: number) {
      if (!isPlayingRef.current) {
        return;
      }

      const dt = clamp((ts - lastTsRef.current) / 1000, 0.001, 0.033);
      lastTsRef.current = ts;
      const elapsed = ts - runStartRef.current;
      if (elapsed >= LOOP_MS) {
        isPlayingRef.current = false;
        phaseRef.current = "hold";
        rotationRef.current = 0;
        bounceScaleRef.current = 1;
        glyphScaleRef.current = 1;
        resetBodiesToTargets();
        setTick((value) => (value + 1) % 10000000);
        return;
      }

      let phase: Phase = "mix";
      if (elapsed < MIX_MS) {
        phase = "mix";
      } else if (elapsed < MIX_MS + SETTLE_MS) {
        phase = "settle";
      } else {
        phase = "hold";
      }

      if (phase !== phaseRef.current) {
        phaseRef.current = phase;

        if (phase === "mix") {
          lettersRef.current.forEach((body, index) => {
            body.vx += (Math.random() - 0.5) * 1500;
            body.vy += -420 - Math.random() * 300;
            body.x += Math.cos(index) * 16;
            body.y += Math.sin(index) * 10;
            body.spin = (Math.random() - 0.5) * 1600;
            body.angle += (Math.random() - 0.5) * 20;
          });
        }

        if (phase === "hold") {
          lettersRef.current.forEach((body) => {
            body.vx *= 0.5;
            body.vy *= 0.5;
          });
          bounceScaleRef.current = 1;
          glyphScaleRef.current = 1;
          rotationRef.current = 0;
        }

        if (phase === "settle") {
          settleStartRotationRef.current = rotationRef.current;
          settleFromRef.current = lettersRef.current.map((body) => ({ x: body.x, y: body.y }));
          lettersRef.current.forEach((body) => {
            body.vx = 0;
            body.vy = 0;
            body.spin *= 0.3;
          });
        }
      }

      if (phase === "mix") {
        const mixT = elapsed / MIX_MS;
        rotationRef.current = 380 * mixT * mixT;
        if (mixT < 0.16) {
          const t = mixT / 0.16;
          const puff = t < 0.45 ? t / 0.45 : 1 - (t - 0.45) / 0.55;
          bounceScaleRef.current = 1 + 0.11 * Math.max(0, puff);
        } else {
          bounceScaleRef.current = 1;
        }
        const inflate = easeOutCubic(clamp(mixT / 0.08, 0, 1));
        glyphScaleRef.current = 1 + 2.2 * inflate;

        lettersRef.current.forEach((body, index) => {
          const dx = body.x - CENTER;
          const dy = body.y - CENTER;
          const dist = Math.hypot(dx, dy) || 1;

          const swirl = 2400 + Math.sin(ts * 0.01 + index) * 900;
          body.vx += (-dy / dist) * swirl * dt;
          body.vy += (dx / dist) * swirl * dt;

          body.vy += 3000 * dt;
          body.vx += (Math.random() - 0.5) * 980 * dt;
          body.vy += (Math.random() - 0.5) * 980 * dt;

          if (Math.random() < dt * 9) {
            body.vx += (Math.random() - 0.5) * 1200;
            body.vy += (Math.random() - 0.5) * 1200;
          }

          body.vx *= 0.985;
          body.vy *= 0.985;
          body.spin += (Math.random() - 0.5) * 420 * dt;
          body.angle += body.spin * dt;

          body.x += body.vx * dt;
          body.y += body.vy * dt;

          const r = GLYPH_BASE_RADIUS[body.glyph] * glyphScaleRef.current;
          circleCollide(body, dt, r);
        });
        resolveLetterCollisionsIterative(lettersRef.current, glyphScaleRef.current);
      } else if (phase === "settle") {
        const local = (elapsed - MIX_MS) / SETTLE_MS;

        if (local < 0.2) {
          const t = local / 0.2;
          bounceScaleRef.current = 1 - 0.28 * t;
        } else if (local < 0.58) {
          const t = (local - 0.2) / 0.38;
          bounceScaleRef.current = 0.72 + 0.42 * t;
        } else {
          const t = (local - 0.58) / 0.42;
          bounceScaleRef.current = 1.14 - 0.14 * t;
        }

        if (local < 0.35) {
          const t = easeOutCubic(local / 0.35);
          glyphScaleRef.current = 3.2 - 2.2 * t;
        } else {
          glyphScaleRef.current = 1;
        }
        rotationRef.current = 0;

        const settleT = easeOutCubic(clamp(local, 0, 1));
        lettersRef.current.forEach((body, index) => {
          const from = settleFromRef.current[index] ?? { x: body.x, y: body.y };
          body.x = from.x + (body.tx - from.x) * settleT;
          body.y = from.y + (body.ty - from.y) * settleT;
          body.spin *= 0.44;
          body.angle *= 0.4;
        });
      } else {
        glyphScaleRef.current = 1;
        rotationRef.current = 0;
        const holdT = (elapsed - MIX_MS - SETTLE_MS) / HOLD_MS;
        bounceScaleRef.current = 1 - 0.06 * clamp(holdT, 0, 1);
        lettersRef.current.forEach((body) => {
          body.x = body.tx;
          body.y = body.ty;
          body.vx = 0;
          body.vy = 0;
          body.angle = 0;
          body.spin = 0;
        });
      }

      setTick((value) => (value + 1) % 10000000);
      frameIdRef.current = requestAnimationFrame(frame);
    }

  function startRun() {
    if (isPlayingRef.current) {
      return;
    }
    resetBodiesToTargets();
    phaseRef.current = "hold";
    rotationRef.current = 0;
    bounceScaleRef.current = 1;
    glyphScaleRef.current = 1;
    isPlayingRef.current = true;
    runStartRef.current = performance.now();
    lastTsRef.current = runStartRef.current;
    frameIdRef.current = requestAnimationFrame(frame);
  }

  useEffect(() => {
    resetBodiesToTargets();
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [targets]);

  return (
    <Link className="corner-logo-loop" href="/" aria-label="Lastik home" data-tick={tick} onMouseEnter={startRun}>
      <div
        className="corner-logo-machine"
        style={{ transform: `scale(${bounceScaleRef.current}) rotate(${rotationRef.current}deg)` }}
      >
        <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="corner-logo-svg" aria-hidden="true">
          <defs>
            <linearGradient
              id="logoCircleGrad"
              x1="1804.5"
              y1="62.3"
              x2="1090.2"
              y2="2577.4"
              gradientTransform="translate(2835.1 -5.9) rotate(90)"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#b84094" />
              <stop offset="0.2" stopColor="#cc4072" />
              <stop offset="0.4" stopColor="#db4057" />
              <stop offset="0.6" stopColor="#e64044" />
              <stop offset="0.8" stopColor="#ec4039" />
              <stop offset="1" stopColor="#ef4136" />
            </linearGradient>
            <linearGradient id="logoGlyphGradA" x1="491.8" y1="1258.8" x2="376.5" y2="1588.8" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ae519f" />
              <stop offset="0.2" stopColor="#c94a72" />
              <stop offset="0.4" stopColor="#da4657" />
              <stop offset="0.6" stopColor="#e54344" />
              <stop offset="0.8" stopColor="#ec4139" />
              <stop offset="1" stopColor="#ef4136" />
            </linearGradient>
          </defs>

          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="url(#logoCircleGrad)" />

          {renderBodies.map((body, index) => {
            const glyph = GLYPHS[body.glyph];
            return (
              <g
                key={`glyph-${index}`}
                transform={`translate(${body.x} ${body.y}) rotate(${body.angle}) scale(${glyphScaleRef.current}) translate(${-glyph.cx} ${-glyph.cy})`}
              >
                <path d={glyph.d} fill={glyph.fill} />
              </g>
            );
          })}
        </svg>
      </div>
    </Link>
  );
}
