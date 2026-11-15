import React from "react";
import { interpolateColors, random } from "remotion";
import { C, Flame, W } from "./lib";

type B = { x: number; w: number; h: number; kind: "dome" | "tower" | "hall" };

const buildings = (seed: string): B[] => {
  const list: B[] = [];
  let x = -30;
  let i = 0;
  while (x < W + 60) {
    const r = random(`${seed}${i}`);
    const centre = 1 - Math.min(1, Math.abs(x - W / 2) / (W / 2));
    const kind = r < 0.4 ? "dome" : r < 0.75 ? "tower" : "hall";
    const w = 80 + random(`${seed}w${i}`) * 70;
    const h = (kind === "tower" ? 260 : kind === "dome" ? 190 : 140) * (0.6 + centre * 0.9) * (0.8 + random(`${seed}h${i}`) * 0.4);
    list.push({ x, w, h, kind });
    x += w * 0.78;
    i++;
  }
  // the great central shikhara
  list.push({ x: W / 2, w: 170, h: 560, kind: "tower" });
  return list.sort((a, b) => a.h - b.h);
};

const cache: Record<string, B[]> = {};

/**
 * Lanka skyline. `lit(x)` returns 0..1 lighting for a building at x.
 * Coordinates: building bases sit on baseY, drawn at scale s around W/2.
 */
export const City: React.FC<{
  baseY: number;
  s?: number;
  lit: (x: number) => number;
  fire?: boolean;
  seed?: string;
  reflect?: boolean;
}> = ({ baseY, s = 1, lit, fire, seed = "lanka", reflect }) => {
  const bs = (cache[seed] ??= buildings(seed));
  const dark = "#2B1834";
  const gold = "#F3B648";
  const draw = (b: B, idx: number) => {
    const l = lit(b.x);
    const fill = interpolateColors(l, [0, 1], [dark, gold]);
    const edge = interpolateColors(l, [0, 1], ["#4A2A55", "#FFE3A0"]);
    const y = baseY;
    const { x, w, h } = b;
    const body = h * (b.kind === "dome" ? 0.45 : b.kind === "hall" ? 0.7 : 0.25);
    const windows: React.ReactNode[] = [];
    const rows = Math.max(1, Math.floor(body / 46));
    const cols = Math.max(1, Math.floor(w / 40));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x - w / 2 + (w / cols) * (c + 0.5);
        const wy = y - 22 - r * 46;
        const on = l > 0.15 + random(`${seed}win${idx}-${r}-${c}`) * 0.7;
        windows.push(
          <path
            key={`${r}-${c}`}
            d={`M ${wx - 8} ${wy} L ${wx - 8} ${wy - 16} Q ${wx} ${wy - 28} ${wx + 8} ${wy - 16} L ${wx + 8} ${wy} Z`}
            fill={on ? "#FFE89A" : "#1A0E22"}
          />,
        );
      }
    }
    let roof: React.ReactNode = null;
    const top = y - body;
    if (b.kind === "dome") {
      const dh = h - body;
      roof = (
        <>
          <path
            d={`M ${x - w * 0.45} ${top} Q ${x - w * 0.62} ${top - dh * 0.55} ${x} ${top - dh} Q ${x + w * 0.62} ${top - dh * 0.55} ${x + w * 0.45} ${top} Z`}
            fill={fill}
            stroke={edge}
            strokeWidth={3}
          />
          <path d={`M ${x} ${top - dh} L ${x} ${top - dh - 30}`} stroke={edge} strokeWidth={4} />
        </>
      );
    } else if (b.kind === "tower") {
      const th = h - body;
      roof = (
        <>
          <path
            d={`M ${x - w / 2} ${top} Q ${x - w * 0.46} ${top - th * 0.6} ${x} ${top - th} Q ${x + w * 0.46} ${top - th * 0.6} ${x + w / 2} ${top} Z`}
            fill={fill}
            stroke={edge}
            strokeWidth={3}
          />
          {[0.25, 0.5, 0.72].map((k) => (
            <path
              key={k}
              d={`M ${x - w * 0.5 * (1 - k * 0.85)} ${top - th * k} L ${x + w * 0.5 * (1 - k * 0.85)} ${top - th * k}`}
              stroke={edge}
              strokeWidth={3}
              opacity={0.7}
            />
          ))}
          <ellipse cx={x} cy={top - th - 6} rx={w * 0.12} ry={8} fill={fill} stroke={edge} strokeWidth={3} />
          <path d={`M ${x} ${top - th - 12} L ${x} ${top - th - 46}`} stroke={edge} strokeWidth={4} />
        </>
      );
    } else {
      roof = (
        <path
          d={`M ${x - w / 2 - 8} ${top} L ${x} ${top - (h - body)} L ${x + w / 2 + 8} ${top} Z`}
          fill={fill}
          stroke={edge}
          strokeWidth={3}
        />
      );
    }
    return (
      <g key={idx}>
        <rect x={x - w / 2} y={top} width={w} height={body} fill={fill} stroke={edge} strokeWidth={3} />
        {windows}
        {roof}
        {fire && l > 0.6 && random(`${seed}fire${idx}`) > 0.45 && (
          <Flame x={x + (random(`${seed}fx${idx}`) - 0.5) * w * 0.6} y={top + 6} size={34 + random(`${seed}fs${idx}`) * 30} seed={idx} />
        )}
      </g>
    );
  };
  const city = (
    <g>
      {bs.map(draw)}
      {/* rampart */}
      <rect x={-20} y={baseY} width={W + 40} height={70} fill={interpolateColors(lit(W / 2), [0, 1], ["#231329", "#8A4A26"])} />
      {new Array(28).fill(0).map((_, i) => (
        <rect key={i} x={i * 40} y={baseY - 14} width={22} height={16} fill={interpolateColors(lit(i * 40), [0, 1], ["#231329", "#B8642C"])} />
      ))}
      {/* diya line on rampart */}
      {new Array(36).fill(0).map((_, i) => {
        const dx = 15 + i * 30;
        return lit(dx) > 0.5 ? <circle key={i} cx={dx} cy={baseY + 20} r={5} fill="#FFE07A" /> : null;
      })}
    </g>
  );
  return (
    <g transform={`translate(${W / 2} ${baseY}) scale(${s}) translate(${-W / 2} ${-baseY})`}>
      {city}
      {reflect && (
        <g transform={`translate(0 ${baseY * 2 + 140}) scale(1 -1)`} opacity={0.32}>
          {city}
        </g>
      )}
    </g>
  );
};

export const Mountain: React.FC<{ baseY: number; color?: string }> = ({ baseY, color = "#2A1530" }) => (
  <path d={`M 620 ${baseY} L 860 ${baseY - 520} L 930 ${baseY - 430} L 1000 ${baseY - 470} L 1160 ${baseY} Z`} fill={color} />
);

export const Sea: React.FC<{ y: number }> = ({ y }) => (
  <g>
    <rect x={0} y={y} width={W} height={2000} fill="#120A1E" />
    <rect x={0} y={y} width={W} height={2000} fill={C.maroon} opacity={0.18} />
  </g>
);
