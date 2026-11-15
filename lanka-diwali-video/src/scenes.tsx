import React from "react";
import { continueRender, delayRender, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { City, Mountain, Sea } from "./city";
import { Guard, HanumanBack, HanumanFace, RavanaSeated, SitaPraying } from "./characters";
import { bez, C, Canvas, Diya, Flame, H, inOut, lerp, P, Sparkler, Stars, Tail, W } from "./lib";

const fontFamily = "RozhaA, RozhaB, serif";
if (typeof document !== "undefined") {
  const h = delayRender("Loading Rozha One");
  Promise.all(
    [
      ["RozhaA", "rozha-latin.woff2"],
      ["RozhaB", "rozha-deva.woff2"],
    ].map(([name, file]) =>
      new FontFace(name, `url(${staticFile(file)}) format("woff2")`).load().then((ff) => document.fonts.add(ff)),
    ),
  ).then(() => continueRender(h));
}

/** Slow camera push: scales the whole scene around (ox, oy). */
const Cam: React.FC<{
  children: React.ReactNode;
  dur: number;
  from?: number;
  to?: number;
  ox?: number;
  oy?: number;
  dy?: [number, number];
  shake?: number;
}> = ({ children, dur, from = 1, to = 1.08, ox = W / 2, oy = H / 2, dy = [0, 0], shake = 0 }) => {
  const f = useCurrentFrame();
  const s = lerp(f, [0, dur], [from, to], inOut);
  const ty = lerp(f, [0, dur], dy, inOut);
  const sx = shake ? Math.sin(f * 2.3) * shake : 0;
  const sy = shake ? Math.cos(f * 1.9) * shake : 0;
  return (
    <g transform={`translate(${ox + sx} ${oy + ty + sy}) scale(${s}) translate(${-ox} ${-oy})`}>{children}</g>
  );
};

const Hall: React.FC = () => (
  <g>
    <rect width={W} height={H} fill="url(#jadeHall)" />
    {[90, 990].map((x) => (
      <g key={x}>
        <path d={`M ${x - 70} 0 Q ${x - 40} 700 ${x - 90} 1400 L ${x + 90} 1400 Q ${x + 40} 700 ${x + 70} 0 Z`} fill="#174B3D" />
        <path d={`M ${x - 30} 0 Q ${x} 700 ${x - 40} 1400`} stroke="#0E3329" strokeWidth={10} fill="none" />
      </g>
    ))}
    {[230, 850].map((x) => (
      <g key={x}>
        <rect x={x - 34} y={200} width={68} height={1150} fill="#2F7A63" stroke={C.ink} strokeWidth={4} />
        <rect x={x - 50} y={180} width={100} height={40} fill={C.gold} stroke={C.ink} strokeWidth={4} />
        <rect x={x - 50} y={1330} width={100} height={40} fill={C.gold} stroke={C.ink} strokeWidth={4} />
      </g>
    ))}
    {/* steps */}
    {new Array(6).fill(0).map((_, i) => (
      <rect key={i} x={140 - i * 30} y={1150 + i * 60} width={800 + i * 60} height={60} fill={i % 2 ? "#3E8C74" : "#357C66"} stroke="#1C4F41" strokeWidth={3} />
    ))}
    <rect x={0} y={1510} width={W} height={410} fill="#2A6E5A" />
    <path d="M 380 1150 L 700 1150 L 760 1920 L 320 1920 Z" fill="#1F5A4A" opacity={0.6} />
  </g>
);

/* 01 · Ten heads */
export const S01: React.FC<{ dur: number }> = ({ dur }) => (
  <Canvas>
    <Cam dur={dur} from={1.12} to={1.0} oy={700}>
      <Hall />
      {/* throne */}
      <path d="M 200 1180 L 200 420 Q 540 160 880 420 L 880 1180 Z" fill={C.gold} stroke={C.ink} strokeWidth={5} />
      <path d="M 250 1180 L 250 450 Q 540 230 830 450 L 830 1180 Z" fill="#B5462E" stroke={C.ink} strokeWidth={4} />
      <RavanaSeated x={540} y={660} s={0.95} />
      <rect x={160} y={1140} width={760} height={60} fill={C.goldShade} stroke={C.ink} strokeWidth={4} />
      {[120, 960].map((x, i) => (
        <g key={x}>
          <rect x={x - 10} y={1050} width={20} height={250} fill={C.gold} stroke={C.ink} strokeWidth={3} />
          <Flame x={x} y={1050} size={44} seed={i} />
        </g>
      ))}
      <HanumanBack
        x={540}
        y={1760}
        s={0.22}
        bound
        tail="M 0 -450 C 260 -380 380 -140 240 -40 C 120 40 -60 -20 40 -120"
        tip={[40, -120]}
        tipAngle={-30}
      />
    </Cam>
  </Canvas>
);

/* 02 · The tail that won't end */
export const S02: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const d = "M 540 2400 C 100 2100 980 1800 540 1500 S 100 900 540 600 S 980 0 540 -320";
  const reveal = lerp(f, [0, dur - 10], [0.18, 1], inOut);
  const ty = lerp(f, [0, dur], [-520, 330], inOut);
  return (
    <Canvas bg="#F2B544">
      <rect width={W} height={H} fill="#F2B544" />
      <circle cx={540} cy={960} r={900} fill="#F9D27A" opacity={0.6} />
      <g transform={`translate(0 ${ty})`}>
        <mask id="tailReveal">
          <path d={d} stroke="#fff" strokeWidth={120} fill="none" pathLength={1} strokeDasharray={`${reveal} 1`} />
        </mask>
        <g mask="url(#tailReveal)">
          <path d={d} stroke={C.ink} strokeWidth={70} fill="none" strokeLinecap="round" />
          <path d={d} stroke="#F3E6C8" strokeWidth={60} fill="none" strokeLinecap="round" />
          <path d={d} stroke="#B89C70" strokeWidth={60} fill="none" strokeDasharray="4 30" />
        </g>
        <Guard x={680} y={1950} s={0.62} />
        <Guard x={360} y={1060} s={0.6} flip />
        <Guard x={720} y={170} s={0.6} />
      </g>
    </Canvas>
  );
};

/* 03 · The small smile */
export const S03: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <Canvas>
      <Cam dur={dur} from={1} to={1.1} oy={900}>
        <Hall />
        <rect width={W} height={H} fill="#0B2A22" opacity={0.45} />
        <HanumanFace x={540} y={1000} s={1.25} smile={lerp(f, [15, dur - 10], [0, 0.45])} open={0} bound />
      </Cam>
    </Canvas>
  );
};

/* 04 · The torch */
export const S04: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const hx = lerp(f, [0, 40], [900, 620], inOut);
  const hy = lerp(f, [0, 40], [300, 640], inOut);
  const lit = f > 42;
  const flare = lerp(f, [42, 52], [0, 1]);
  return (
    <Canvas bg="#050304">
      <Cam dur={dur} from={1.05} to={1.15} oy={900}>
        <Tail d="M 200 1920 C 260 1500 160 1200 420 1000 C 560 900 520 820 520 820" w={46} tip={[520, 820]} tipAngle={20} />
        {lit && <Flame x={528} y={790} size={60 + flare * 50} seed={4} />}
        {/* Ravana's arm with torch */}
        <g transform={`translate(${hx} ${hy}) rotate(-30)`}>
          <path d="M 0 0 L 700 -400" stroke={C.ink} strokeWidth={120} strokeLinecap="round" />
          <path d="M 0 0 L 700 -400" stroke={C.ravanaSkin} strokeWidth={110} strokeLinecap="round" />
          <rect x={40} y={-60} width={70} height={110} rx={10} fill={C.gold} stroke={C.ink} strokeWidth={4} transform="rotate(-30 75 -5)" />
          <path d="M -40 30 L -150 -90" stroke="#5A3418" strokeWidth={26} strokeLinecap="round" />
          <circle cx={-10} cy={10} r={52} fill={C.ravanaSkin} stroke={C.ink} strokeWidth={4} />
          <Flame x={-160} y={-96} size={95} seed={2} />
        </g>
      </Cam>
      {f > 42 && <rect width={W} height={H} fill="#FFDCA0" opacity={lerp(f, [42, 54], [0.5, 0])} />}
    </Canvas>
  );
};

/* 05 · Phuljhadi */
export const S05: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const r = lerp(f, [0, 25], [80, 430]);
  return (
    <Canvas bg="#050304">
      <Cam dur={dur} from={1} to={1.06} shake={3}>
        <Tail d="M 540 1920 C 520 1600 600 1400 540 1150 C 500 1000 540 980 540 980" w={44} tuft={false} />
        <Sparkler x={540} y={900} r={r} />
      </Cam>
    </Canvas>
  );
};

/* 06 · Fire climbs */
export const S06: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const segs: [P, P, P, P][] = [
    [[540, 2000], [180, 1700], [900, 1350], [540, 1050]],
    [[540, 1050], [180, 750], [880, 400], [540, 80]],
  ];
  const progress = lerp(f, [0, dur - 10], [0.05, 1], inOut);
  const n = 34;
  const tailD = "M 540 2000 C 180 1700 900 1350 540 1050 C 180 750 880 400 540 80";
  return (
    <Canvas bg="#0A1F1A">
      <rect width={W} height={H} fill="#0A1F1A" />
      <rect width={W} height={H} fill="url(#jadeHall)" opacity={0.45} />
      <Cam dur={dur} from={1} to={1.12} oy={1200}>
        <Tail d={tailD} w={40} tuft={false} />
        {new Array(n).fill(0).map((_, i) => {
          const t = i / (n - 1);
          if (t > progress) return null;
          const seg = t < 0.5 ? segs[0] : segs[1];
          const p = bez(...seg, (t % 0.5) * 2 || (t >= 1 ? 1 : 0));
          const grow = Math.min(1, (progress - t) * 6);
          return <Flame key={i} x={p[0]} y={p[1] + 10} size={(70 + random(`f6${i}`) * 50) * grow} seed={i} glow={i % 3 === 0} />;
        })}
      </Cam>
    </Canvas>
  );
};

/* 07 · Sita's prayer */
export const S07: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <Canvas bg="#0D1B3D">
      <rect width={W} height={H} fill="#0D1B3D" />
      <circle cx={540} cy={700} r={800} fill="#1E3A78" opacity={0.6} />
      <Stars n={70} seed="sita" maxY={H} />
      <Cam dur={dur} from={1.04} to={1.12} oy={1000}>
        {new Array(14).fill(0).map((_, i) => {
          const x = random(`pet${i}`) * W;
          const y = ((random(`pety${i}`) * H + f * (3 + random(`pv${i}`) * 3)) % (H + 100)) - 50;
          return (
            <g key={i} transform={`translate(${x + Math.sin(f * 0.05 + i) * 30} ${y}) rotate(${f * 2 + i * 40})`}>
              <path d="M 0 -10 Q 8 0 0 10 Q -8 0 0 -10 Z" fill="#FFF8E6" />
              <path d="M -10 0 Q 0 8 10 0 Q 0 -8 -10 0 Z" fill="#FFF8E6" />
            </g>
          );
        })}
        <SitaPraying x={540} y={1050} s={1.15} />
        <Diya x={540} y={1760} s={2.2} seed={7} />
      </Cam>
    </Canvas>
  );
};

/* 08 · Fireproof */
export const S08: React.FC<{ dur: number }> = ({ dur }) => (
  <Canvas>
    <Cam dur={dur} from={1} to={1.08} oy={1100}>
      <Hall />
      <path d="M 220 1500 L 220 500 Q 540 180 860 500 L 860 1500 Z" fill="#103C31" stroke={C.gold} strokeWidth={10} />
      <HanumanBack
        x={500}
        y={1820}
        s={1.35}
        tail="M 0 -450 C 260 -520 360 -820 300 -1000 C 260 -1120 330 -1160 330 -1160"
        tip={[330, -1160]}
        tipAngle={10}
        tuft={false}
      />
      <Flame x={500 + 330 * 1.35} y={1820 - 1160 * 1.35} size={90} seed={8} />
    </Cam>
  </Canvas>
);

/* 09 · Diya row */
export const S09: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const n = 9;
  const pos = (i: number): P => {
    const t = i / (n - 1);
    return [120 + t * 860, 1500 - t * 520];
  };
  const runT = lerp(f, [5, dur - 8], [-0.05, 1.05], (x) => x);
  const tip: P = [120 + runT * 860, 1500 - runT * 520 - 110 - Math.abs(Math.sin(runT * 14)) * 40];
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#duskSky)" />
      <Stars n={50} seed="d9" maxY={700} />
      <City baseY={1000} s={0.8} lit={() => 0.1} seed="far9" />
      <Cam dur={dur} from={1.04} to={1.1} oy={1300}>
        {/* parapet */}
        <path d="M -40 1560 L 1120 870 L 1120 1000 L -40 1720 Z" fill="#C79A5E" stroke={C.ink} strokeWidth={5} />
        <path d="M -40 1720 L 1120 1000 L 1120 1920 L -40 1920 Z" fill="#8C6239" stroke={C.ink} strokeWidth={5} />
        {new Array(12).fill(0).map((_, i) => (
          <path key={i} d={`M ${i * 100} ${1696 - i * 62} L ${i * 100} ${1920}`} stroke="#6E4A2A" strokeWidth={4} />
        ))}
        {new Array(n).fill(0).map((_, i) => {
          const p = pos(i);
          return <Diya key={i} x={p[0]} y={p[1]} s={1.3} lit={runT > i / (n - 1)} seed={i} />;
        })}
        {runT < 1.05 && <Flame x={tip[0]} y={tip[1]} size={60} seed={3} />}
        <Tail d={`M ${tip[0] - 260} ${tip[1] + 360} Q ${tip[0] - 60} ${tip[1] + 200} ${tip[0]} ${tip[1] + 10}`} w={30} tuft={false} />
      </Cam>
    </Canvas>
  );
};

const DomeRow: React.FC<{ lit?: number }> = ({ lit = 1 }) => {
  const domes: [number, number, number][] = [
    [230, 1500, 300],
    [600, 1380, 380],
    [940, 1520, 260],
  ];
  return (
    <g>
      {domes.map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x - w * 0.42} y={y} width={w * 0.84} height={600} fill="#B57A2E" stroke={C.ink} strokeWidth={5} />
          {[0, 1, 2].map((k) => (
            <path key={k} d={`M ${x - w * 0.3 + k * w * 0.3 - 20} ${y + 200} L ${x - w * 0.3 + k * w * 0.3 - 20} ${y + 120} Q ${x - w * 0.3 + k * w * 0.3} ${y + 80} ${x - w * 0.3 + k * w * 0.3 + 20} ${y + 120} L ${x - w * 0.3 + k * w * 0.3 + 20} ${y + 200} Z`} fill={lit ? "#FFE08A" : "#3A2030"} stroke={C.ink} strokeWidth={3} />
          ))}
          <path d={`M ${x - w / 2} ${y} Q ${x - w * 0.66} ${y - w * 0.55} ${x} ${y - w * 0.95} Q ${x + w * 0.66} ${y - w * 0.55} ${x + w / 2} ${y} Z`} fill={C.gold} stroke={C.ink} strokeWidth={5} />
          <path d={`M ${x - w * 0.28} ${y - w * 0.2} Q ${x - w * 0.3} ${y - w * 0.55} ${x - w * 0.05} ${y - w * 0.8}`} stroke="#FFF2C0" strokeWidth={10} fill="none" opacity={0.7} />
          <path d={`M ${x} ${y - w * 0.95} L ${x} ${y - w * 1.15}`} stroke={C.ink} strokeWidth={8} />
          <circle cx={x} cy={y - w * 1.15} r={10} fill={C.gold} stroke={C.ink} strokeWidth={3} />
        </g>
      ))}
    </g>
  );
};

/* 10 · Anar (fountain firework) */
export const S10: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const sources: P[] = [
    [230, 1215],
    [600, 1018],
    [940, 1270],
  ];
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#nightSky)" />
      <Stars n={60} seed="s10" maxY={900} />
      <Cam dur={dur} from={1} to={1.08} oy={1300}>
        <DomeRow />
        {sources.map(([ox, oy], si) => {
          const start = si * 10;
          return new Array(120).fill(0).map((_, i) => {
            const birth = start + i * 0.55;
            const age = f - birth;
            if (age < 0 || age > 32) return null;
            const ang = (-90 + (random(`a${si}${i}`) - 0.5) * 34) * (Math.PI / 180);
            const v = 26 + random(`v${si}${i}`) * 16;
            const x = ox + Math.cos(ang) * v * age;
            const y = oy + Math.sin(ang) * v * age + 0.9 * age * age;
            const col = age < 8 ? "#FFFDF0" : age < 18 ? "#FFD25A" : "#FF8A2A";
            return <circle key={`${si}-${i}`} cx={x} cy={y} r={age < 10 ? 6 : 4} fill={col} opacity={1 - age / 32} />;
          });
        })}
        {sources.map(([ox, oy], i) => (f > i * 10 ? <circle key={i} cx={ox} cy={oy} r={90} fill="url(#glow)" /> : null))}
      </Cam>
    </Canvas>
  );
};

/* 11 · Chakri (spinning wheel) */
export const S11: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const R = lerp(f, [0, 20], [60, 330]);
  const n = 40;
  return (
    <Canvas bg="#120818">
      <rect width={W} height={H} fill="#120818" />
      <Stars n={60} seed="s11" />
      <Cam dur={dur} from={1} to={1.06} oy={900}>
        <DomeRow />
        <g transform="translate(540 820)">
          <circle r={R + 120} fill="url(#softGlow)" />
          {new Array(n).fill(0).map((_, i) => {
            const a = (i / n) * Math.PI * 2 + f * 0.32;
            const x = Math.cos(a) * R;
            const y = Math.sin(a) * R;
            const ta = a - Math.PI / 2;
            const trail = 70;
            return (
              <g key={i}>
                <line x1={x} y1={y} x2={x - Math.cos(ta) * trail} y2={y - Math.sin(ta) * trail} stroke="#FFB13B" strokeWidth={8} strokeLinecap="round" opacity={0.75} />
                <line x1={x} y1={y} x2={x + Math.cos(a) * 26} y2={y + Math.sin(a) * 26} stroke="#FFF1B0" strokeWidth={4} strokeLinecap="round" />
                <circle cx={x} cy={y} r={7} fill="#FFFBEA" />
              </g>
            );
          })}
          <HanumanBack x={0} y={140} s={0.28} tail="M 0 -450 C 200 -420 260 -260 160 -200" tip={[160, -200]} tipAngle={120} tuft={false} />
        </g>
      </Cam>
    </Canvas>
  );
};

/* 12 · Joyride (night flight) */
export const S12: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const t = lerp(f, [0, dur], [0, 1], inOut);
  const p = bez([-150, 1300], [300, 700], [700, 1000], [1250, 500], t);
  const trail = new Array(26).fill(0).map((_, i) => bez([-150, 1300], [300, 700], [700, 1000], [1250, 500], Math.max(0, t - i * 0.02)));
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#nightSky)" />
      <Stars n={110} seed="s12" maxY={1200} />
      <circle cx={820} cy={330} r={70} fill="#FFF0C8" opacity={0} />
      <Mountain baseY={1500} />
      <City baseY={1500} s={1.15} lit={(x) => (x < p[0] + 80 ? Math.min(1, (p[0] + 80 - x) / 250) : 0)} fire />
      <rect x={0} y={1570} width={W} height={400} fill="#1A0E1E" />
      {trail.map((q, i) => (
        <circle key={i} cx={q[0]} cy={q[1] + 40} r={44 - i * 1.5} fill={i < 6 ? "#FFE08A" : i < 14 ? "#FF9A2A" : "#E8461E"} opacity={0.9 - i * 0.033} />
      ))}
      <g transform={`translate(${p[0]} ${p[1]}) rotate(68)`}>
        <HanumanBack x={0} y={0} s={0.3} />
      </g>
    </Canvas>
  );
};

/* 13 · Ladi (firecracker string) */
export const S13: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const n = 22;
  const popIdx = (f - 6) / 2.4;
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#duskSky)" />
      <Cam dur={dur} from={1.02} to={1.1} oy={1200}>
        <DomeRow lit={1} />
        <rect x={0} y={1150} width={W} height={800} fill="#8A5A34" stroke={C.ink} strokeWidth={5} />
        {new Array(14).fill(0).map((_, i) => (
          <rect key={i} x={i * 80} y={1110} width={50} height={42} fill="#8A5A34" stroke={C.ink} strokeWidth={4} />
        ))}
        {new Array(6).fill(0).map((_, r) => (
          <path key={r} d={`M 0 ${1240 + r * 120} L ${W} ${1240 + r * 120}`} stroke="#6E4528" strokeWidth={4} />
        ))}
        <path d={`M 40 1170 Q 540 1300 1040 1170`} stroke="#3A2A1A" strokeWidth={4} fill="none" />
        {new Array(n).fill(0).map((_, i) => {
          const t = i / (n - 1);
          const x = 40 + t * 1000;
          const y = 1170 + Math.sin(t * Math.PI) * 98;
          const popped = popIdx > n - 1 - i;
          const age = popIdx - (n - 1 - i);
          if (!popped)
            return <rect key={i} x={x - 9} y={y} width={18} height={50} rx={4} fill="#D32F2F" stroke={C.ink} strokeWidth={3} transform={`rotate(${(i % 2 ? 1 : -1) * 18} ${x} ${y})`} />;
          return (
            <g key={i}>
              {age < 3 && <Sparkler x={x} y={y + 20} r={90} seed={`l${i}`} />}
              <circle cx={x} cy={y - age * 14} r={30 + age * 6} fill="#B9AFAF" opacity={Math.max(0, 0.6 - age * 0.06)} />
            </g>
          );
        })}
        <Guard x={lerp(f, [0, dur], [700, 120])} y={1720} s={0.55} flip run={1} />
        <Guard x={lerp(f, [0, dur], [900, 330])} y={1760} s={0.6} flip run={1} />
      </Cam>
    </Canvas>
  );
};

/* 14 · The one house */
export const S14: React.FC<{ dur: number }> = ({ dur }) => (
  <Canvas>
    <rect width={W} height={H} fill="#151436" />
    <Stars n={60} seed="s14" maxY={600} />
    <Cam dur={dur} from={1.06} to={1.0} oy={1100}>
      {[60, 1020].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={1000} r={420} fill="url(#softGlow)" />
          <Flame x={x} y={1150} size={140} seed={i + 3} />
        </g>
      ))}
      {/* blue house */}
      <path d="M 180 1500 L 180 760 L 900 760 L 900 1500 Z" fill="#3E5FA8" stroke={C.ink} strokeWidth={6} />
      <path d="M 120 780 L 540 520 L 960 780 Z" fill="#A9452E" stroke={C.ink} strokeWidth={6} />
      {new Array(7).fill(0).map((_, i) => (
        <path key={i} d={`M ${170 + i * 125} ${780} L ${540} ${530}`} stroke="#7E2E1E" strokeWidth={4} />
      ))}
      <rect x={620} y={900} width={180} height={200} fill="#FFC861" stroke={C.ink} strokeWidth={6} />
      <path d="M 710 900 L 710 1100 M 620 1000 L 800 1000" stroke={C.ink} strokeWidth={6} />
      <Diya x={710} y={1090} s={0.9} seed={14} />
      {/* bow-and-arrow mark */}
      <g stroke="#F2F0FF" strokeWidth={8} fill="none" opacity={0.9}>
        <path d="M 330 880 Q 410 980 330 1080" />
        <path d="M 330 880 L 330 1080" strokeWidth={3} />
        <path d="M 300 980 L 440 980 M 420 962 L 440 980 L 420 998" />
      </g>
      {/* tulsi */}
      <rect x={260} y={1300} width={160} height={200} fill="#B7A68C" stroke={C.ink} strokeWidth={5} />
      {new Array(9).fill(0).map((_, i) => (
        <ellipse key={i} cx={340 + (i - 4) * 16} cy={1280 - Math.abs(i - 4) * -6 - (i % 3) * 30} rx={22} ry={12} fill="#3F8A3A" stroke={C.ink} strokeWidth={2} transform={`rotate(${(i - 4) * 14} ${340 + (i - 4) * 16} 1280)`} />
      ))}
      <rect x={0} y={1500} width={W} height={420} fill="#4A4E7A" />
      <HanumanBack x={660} y={1860} s={0.42} tail="M 0 -450 C 160 -400 300 -300 260 -120" tip={[260, -120]} tipAngle={160} tuft={false} />
    </Cam>
  </Canvas>
);

/* 16 · All of Lanka */
export const S16: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const spread = lerp(f, [0, dur - 20], [80, 900]);
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#nightSky)" />
      <Stars n={80} seed="s16" maxY={700} />
      <Cam dur={dur} from={1.15} to={1.0} oy={1100}>
        {new Array(8).fill(0).map((_, i) => (
          <circle key={i} cx={300 + i * 70} cy={700 - ((f * 3 + i * 60) % 400)} r={80 + i * 10} fill="#3A2633" opacity={0.35} />
        ))}
        <Mountain baseY={1180} />
        <City baseY={1180} s={1.2} lit={(x) => Math.min(1, Math.max(0, (spread - Math.abs(x - W / 2)) / 200))} fire seed="all" />
        <Sea y={1240} />
        <circle cx={540} cy={1180} r={spread * 0.9} fill="url(#softGlow)" opacity={0.6} />
        <path d="M 260 1920 Q 540 1580 820 1920 Z" fill="#1A0F14" />
        <HanumanBack x={540} y={1800} s={0.48} tail="M 0 -450 C 220 -420 300 -700 200 -820" tip={[200, -820]} tipAngle={-10} tuft={false} />
        <Flame x={540 + 200 * 0.48} y={1800 - 820 * 0.48} size={40} seed={16} />
      </Cam>
    </Canvas>
  );
};

/* 17 · The smile */
export const S17: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#nightSky)" />
      <circle cx={540} cy={1700} r={900} fill="url(#softGlow)" opacity={0.8} />
      <Cam dur={dur} from={1.0} to={1.08} oy={1000}>
        <HanumanFace x={540} y={1050} s={1.25} smile={lerp(f, [8, dur - 15], [0.35, 1])} open={lerp(f, [4, 18], [0, 1])} />
      </Cam>
    </Canvas>
  );
};

/* 18 · Happy Diwali */
export const S18: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 20, fps, config: { damping: 12, mass: 0.8 } });
  const sub = spring({ frame: f - 40, fps, config: { damping: 200 } });
  return (
    <Canvas>
      <rect width={W} height={H} fill="url(#nightSky)" />
      <Stars n={140} seed="s18" maxY={1300} />
      <Cam dur={dur} from={1.06} to={1.0} oy={1300}>
        <Mountain baseY={1560} />
        <Sea y={1590} />
        <City baseY={1560} s={0.9} lit={() => 1} seed="final" reflect />
        <path d="M 200 1920 Q 540 1720 880 1920 Z" fill="#140A10" />
        <HanumanBack
          x={520}
          y={1890}
          s={0.9}
          tail="M 0 -450 C 380 -400 520 -620 470 -900 C 430 -1080 300 -1160 340 -1250"
          tip={[340, -1250]}
          tuft={false}
        />
        <Sparkler x={520 + 340 * 0.9} y={1890 - 1260 * 0.9} r={170} seed="final" />
      </Cam>
      <g transform={`translate(540 250) scale(${0.6 + 0.4 * pop})`} opacity={Math.min(1, pop * 1.5)}>
        <text textAnchor="middle" fontFamily={fontFamily} fontSize={168} fill="url(#goldText)" stroke="#5A1A0C" strokeWidth={3} y={0}>
          Happy
        </text>
        <text textAnchor="middle" fontFamily={fontFamily} fontSize={190} fill="url(#goldText)" stroke="#5A1A0C" strokeWidth={3} y={180}>
          Diwali
        </text>
      </g>
      <text x={540} y={560} textAnchor="middle" fontFamily={fontFamily} fontSize={64} fill="#FFE7B0" opacity={sub} transform={`translate(0 ${(1 - sub) * 30})`}>
        शुभ दीपावली
      </text>
    </Canvas>
  );
};
