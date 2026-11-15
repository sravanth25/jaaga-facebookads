import React from "react";
import { Easing, interpolate, random, useCurrentFrame } from "remotion";

export const W = 1080;
export const H = 1920;

export const C = {
  ink: "#2A1A12",
  skin: "#E7B188",
  skinShade: "#C98E66",
  muzzle: "#F4D2AE",
  saffron: "#F08A24",
  saffronShade: "#C9651A",
  gold: "#F2C14E",
  goldShade: "#C8922A",
  maroon: "#7A1E2C",
  red: "#C62828",
  hair: "#3B2416",
  tail: "#D9A57A",
  tuft: "#4A2C1A",
  plum: "#6B2D5C",
  ravanaSkin: "#A86A44",
  guard: "#5D6F8F",
  sitaSkin: "#B97A58",
  jade: "#1F5A4A",
};

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const ease = Easing.bezier(0.33, 1, 0.68, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

export const lerp = (
  f: number,
  i: [number, number],
  o: [number, number],
  easing: (n: number) => number = ease,
) => interpolate(f, i, o, { ...clamp, easing });

export type P = [number, number];
export const bez = (p0: P, p1: P, p2: P, p3: P, t: number): P => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Full-frame SVG canvas with shared gradients. */
export const Canvas: React.FC<{ children: React.ReactNode; bg?: string }> = ({
  children,
  bg = "#000",
}) => (
  <svg
    viewBox={`0 0 ${W} ${H}`}
    width={W}
    height={H}
    style={{ position: "absolute", inset: 0, background: bg }}
  >
    <defs>
      <radialGradient id="glow">
        <stop offset="0%" stopColor="#FFF4C2" stopOpacity={1} />
        <stop offset="35%" stopColor="#FFB547" stopOpacity={0.55} />
        <stop offset="100%" stopColor="#FF6A00" stopOpacity={0} />
      </radialGradient>
      <radialGradient id="softGlow">
        <stop offset="0%" stopColor="#FFC766" stopOpacity={0.6} />
        <stop offset="100%" stopColor="#FF7A1A" stopOpacity={0} />
      </radialGradient>
      <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#140A24" />
        <stop offset="55%" stopColor="#4A1638" />
        <stop offset="100%" stopColor="#B23A2E" />
      </linearGradient>
      <linearGradient id="duskSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#24123E" />
        <stop offset="60%" stopColor="#6E2350" />
        <stop offset="100%" stopColor="#E0623A" />
      </linearGradient>
      <linearGradient id="jadeHall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0E2C26" />
        <stop offset="100%" stopColor="#2C7360" />
      </linearGradient>
      <linearGradient id="goldText" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFF1B8" />
        <stop offset="50%" stopColor="#F7C552" />
        <stop offset="100%" stopColor="#E0862A" />
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
        <stop offset="60%" stopColor="#000" stopOpacity={0} />
        <stop offset="100%" stopColor="#000" stopOpacity={0.55} />
      </radialGradient>
    </defs>
    {children}
    <rect width={W} height={H} fill="url(#vignette)" />
  </svg>
);

/** A flickering flame whose base sits at (x, y). */
export const Flame: React.FC<{
  x: number;
  y: number;
  size?: number;
  seed?: number;
  glow?: boolean;
}> = ({ x, y, size = 40, seed = 0, glow = true }) => {
  const f = useCurrentFrame();
  const sw = 1 + 0.1 * Math.sin(f * 0.9 + seed * 3.1);
  const sh = 1 + 0.16 * Math.sin(f * 0.73 + seed * 1.7) + 0.06 * Math.sin(f * 2.1 + seed);
  const tip = 0.18 * Math.sin(f * 0.55 + seed * 2.3);
  const w = size * 0.62 * sw;
  const h = size * 1.25 * sh;
  const shape = (k: number) => {
    const ww = w * k;
    const hh = h * k;
    const tx = tip * size * k;
    return `M ${-ww / 2} 0 Q ${-ww / 2} ${-hh * 0.55} ${tx} ${-hh} Q ${ww / 2} ${-hh * 0.55} ${ww / 2} 0 A ${ww / 2} ${ww / 2.6} 0 0 1 ${-ww / 2} 0 Z`;
  };
  return (
    <g transform={`translate(${x} ${y})`}>
      {glow && <circle cy={-h * 0.4} r={size * 2.2} fill="url(#softGlow)" opacity={0.85} />}
      <path d={shape(1)} fill="#E8461E" />
      <path d={shape(0.78)} fill="#FF9A1F" transform={`translate(0 ${-size * 0.02})`} />
      <path d={shape(0.5)} fill="#FFE07A" />
      <path d={shape(0.25)} fill="#FFFBEA" />
    </g>
  );
};

export const Diya: React.FC<{
  x: number;
  y: number;
  s?: number;
  lit?: boolean;
  seed?: number;
}> = ({ x, y, s = 1, lit = true, seed = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    {lit && <Flame x={0} y={-18 * s} size={26 * s} seed={seed} />}
    <path
      d={`M ${-46 * s} ${-16 * s} Q 0 ${34 * s} ${46 * s} ${-16 * s} Q ${30 * s} ${-26 * s} ${18 * s} ${-18 * s} L ${-18 * s} ${-18 * s} Q ${-30 * s} ${-26 * s} ${-46 * s} ${-16 * s} Z`}
      fill="#A9532B"
      stroke={C.ink}
      strokeWidth={3}
    />
    <path
      d={`M ${-38 * s} ${-8 * s} Q 0 ${16 * s} ${38 * s} ${-8 * s}`}
      fill="none"
      stroke="#E39A5A"
      strokeWidth={3 * s}
    />
  </g>
);

export const Stars: React.FC<{ n?: number; seed?: string; maxY?: number }> = ({
  n = 90,
  seed = "s",
  maxY = H * 0.6,
}) => {
  const f = useCurrentFrame();
  return (
    <g>
      {new Array(n).fill(0).map((_, i) => {
        const x = random(`${seed}x${i}`) * W;
        const y = random(`${seed}y${i}`) * maxY;
        const r = 1 + random(`${seed}r${i}`) * 2.6;
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(f * 0.08 + i * 1.3));
        return <circle key={i} cx={x} cy={y} r={r} fill="#FFF6DA" opacity={tw} />;
      })}
    </g>
  );
};

/** Bright radial burst, used for the sparkler (phuljhadi). */
export const Sparkler: React.FC<{ x: number; y: number; r: number; seed?: string }> = ({
  x,
  y,
  r,
  seed = "sp",
}) => {
  const f = useCurrentFrame();
  const k = Math.floor(f / 2);
  const rays = 70;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * 1.6} fill="url(#glow)" opacity={0.75} />
      {new Array(rays).fill(0).map((_, i) => {
        const a = random(`${seed}a${i}-${k}`) * Math.PI * 2;
        const len = r * (0.35 + random(`${seed}l${i}-${k}`) * 0.75);
        const st = r * 0.08;
        const x1 = Math.cos(a) * st;
        const y1 = Math.sin(a) * st;
        const x2 = Math.cos(a) * len;
        const y2 = Math.sin(a) * len;
        const fork = random(`${seed}f${i}-${k}`) > 0.6;
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFE9A8" strokeWidth={2} opacity={0.9} />
            {fork && (
              <>
                <line
                  x1={x2}
                  y1={y2}
                  x2={x2 + Math.cos(a + 0.6) * len * 0.18}
                  y2={y2 + Math.sin(a + 0.6) * len * 0.18}
                  stroke="#FFD27A"
                  strokeWidth={1.6}
                />
                <circle cx={x2} cy={y2} r={2.5} fill="#FFFFFF" />
              </>
            )}
          </g>
        );
      })}
      <circle r={r * 0.13} fill="#FFFFFF" />
    </g>
  );
};

/** Tail drawn as an inked stroke with a dark tuft at its tip. */
export const Tail: React.FC<{
  d: string;
  w?: number;
  tip?: P;
  tipAngle?: number;
  tuft?: boolean;
}> = ({ d, w = 26, tip, tipAngle = 0, tuft = true }) => (
  <g strokeLinecap="round" fill="none">
    <path d={d} stroke={C.ink} strokeWidth={w + 8} />
    <path d={d} stroke={C.tail} strokeWidth={w} />
    <path d={d} stroke="#F0C9A2" strokeWidth={w * 0.25} transform={`translate(${-w * 0.18} 0)`} opacity={0.7} />
    {tip && tuft && (
      <g transform={`translate(${tip[0]} ${tip[1]}) rotate(${tipAngle})`}>
        <path
          d={`M 0 ${w * 0.4} Q ${-w * 1.1} ${-w * 0.6} 0 ${-w * 2.4} Q ${w * 1.1} ${-w * 0.6} 0 ${w * 0.4} Z`}
          fill={C.tuft}
          stroke={C.ink}
          strokeWidth={3}
        />
        <circle cy={w * 0.6} r={w * 0.55} fill={C.gold} stroke={C.ink} strokeWidth={3} />
      </g>
    )}
  </g>
);
