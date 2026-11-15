import React from "react";
import { useCurrentFrame } from "remotion";
import { C, P, Tail } from "./lib";

const ol = { stroke: C.ink, strokeWidth: 4, strokeLinejoin: "round" as const };

/* ------------------------------------------------------------------ */
/* Hanuman, seen from behind. Local coords: feet at y=0, crown ~-1080 */
/* ------------------------------------------------------------------ */
const ArmBack: React.FC = () => (
  <g>
    <path
      d="M -165 -725 C -205 -680 -218 -580 -208 -500 L -203 -462 Q -185 -440 -166 -462 L -160 -505 C -150 -580 -136 -650 -126 -690 Z"
      fill={C.skin}
      {...ol}
    />
    <path d="M -200 -640 L -150 -632 L -152 -606 L -203 -612 Z" fill={C.gold} {...ol} />
    <circle cx={-176} cy={-622} r={7} fill="#2E8B57" stroke={C.ink} strokeWidth={2} />
    <path d="M -210 -505 L -160 -505 L -162 -478 L -208 -478 Z" fill={C.gold} {...ol} />
    <ellipse cx={-185} cy={-448} rx={23} ry={30} fill={C.skin} {...ol} />
  </g>
);

export const HanumanBack: React.FC<{
  x: number;
  y: number;
  s: number;
  tail?: string;
  tip?: P;
  tipAngle?: number;
  bound?: boolean;
  tuft?: boolean;
}> = ({ x, y, s, tail, tip, tipAngle, bound, tuft = true }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinecap="round">
    {/* scarf hanging behind */}
    <path d="M -150 -735 Q -175 -600 -158 -340 L -112 -340 Q -128 -600 -118 -742 Z" fill={C.red} {...ol} />
    <path d="M -158 -352 L -112 -352" stroke={C.gold} strokeWidth={10} />
    {/* legs */}
    {[-1, 1].map((m) => (
      <g key={m} transform={`scale(${m} 1)`}>
        <path d="M -96 -80 L -48 -80 L -54 -24 L -88 -24 Z" fill={C.skin} {...ol} />
        <path d="M -92 -42 L -50 -42 L -51 -26 L -91 -26 Z" fill={C.gold} {...ol} />
        <ellipse cx={-70} cy={-10} rx={36} ry={15} fill={C.skin} {...ol} />
      </g>
    ))}
    {/* dhoti */}
    <path
      d="M -122 -440 C -176 -300 -158 -150 -104 -70 L -40 -70 C -30 -200 -10 -262 0 -300 C 10 -262 30 -200 40 -70 L 104 -70 C 158 -150 176 -300 122 -440 Z"
      fill={C.saffron}
      {...ol}
    />
    <path d="M -100 -80 L -42 -80 M 42 -80 L 100 -80" stroke={C.gold} strokeWidth={12} />
    <path d="M -80 -360 Q -90 -250 -70 -150 M 80 -360 Q 90 -250 70 -150 M -20 -330 Q -15 -250 -25 -130" stroke={C.saffronShade} strokeWidth={6} fill="none" />
    {/* arms */}
    <ArmBack />
    <g transform="scale(-1 1)">
      <ArmBack />
    </g>
    {/* torso */}
    <path
      d="M -125 -465 C -135 -560 -160 -640 -170 -705 Q -165 -742 -120 -750 L 120 -750 Q 165 -742 170 -705 C 160 -640 135 -560 125 -465 Z"
      fill={C.skin}
      {...ol}
    />
    <path d="M 0 -735 L 0 -490" stroke={C.skinShade} strokeWidth={6} />
    <path d="M -95 -690 Q -60 -630 -28 -655 M 95 -690 Q 60 -630 28 -655" stroke={C.skinShade} strokeWidth={6} fill="none" />
    {/* scarf across back */}
    <path d="M -150 -738 Q -100 -640 -40 -470 L 4 -470 Q -70 -650 -108 -748 Z" fill={C.red} {...ol} />
    <path d="M -146 -728 Q -96 -630 -36 -470" stroke={C.gold} strokeWidth={7} fill="none" />
    {bound && (
      <g stroke="#C9A46B" strokeWidth={14} fill="none">
        <path d="M -175 -560 Q 0 -530 175 -560" />
        <path d="M -185 -510 Q 0 -480 185 -510" />
        <path d="M -175 -560 Q 0 -530 175 -560" stroke={C.ink} strokeWidth={2} />
      </g>
    )}
    {/* waist wrap */}
    <path d="M -132 -482 Q 0 -456 132 -482 L 128 -425 Q 0 -400 -128 -425 Z" fill={C.maroon} {...ol} />
    <path d="M -128 -432 Q 0 -408 128 -432" stroke={C.gold} strokeWidth={6} fill="none" />
    {/* neck + hair */}
    <rect x={-38} y={-800} width={76} height={60} fill={C.skin} {...ol} />
    <path
      d="M -80 -860 C -98 -800 -104 -760 -110 -716 Q -60 -700 0 -706 Q 60 -700 110 -716 C 104 -760 98 -800 80 -860 Q 0 -905 -80 -860 Z"
      fill={C.hair}
      {...ol}
    />
    <path d="M -60 -850 Q -70 -790 -60 -720 M -20 -860 Q -28 -790 -18 -712 M 30 -858 Q 22 -790 34 -712 M 66 -846 Q 60 -790 70 -722" stroke="#5A3A24" strokeWidth={5} fill="none" />
    {/* crown */}
    <path d="M -66 -885 L -52 -942 L 52 -942 L 66 -885 Z" fill={C.gold} {...ol} />
    <path d="M -50 -942 L -36 -988 L 36 -988 L 50 -942 Z" fill={C.gold} {...ol} />
    <path d="M -34 -988 L -10 -1044 L 10 -1044 L 34 -988 Z" fill={C.gold} {...ol} />
    <circle cy={-1056} r={13} fill={C.gold} {...ol} />
    <path d="M 0 -1069 L 0 -1092" stroke={C.ink} strokeWidth={6} />
    <rect x={-74} y={-888} width={148} height={34} rx={8} fill={C.goldShade} {...ol} />
    <path d="M -46 -925 Q 0 -905 46 -925 M -32 -970 Q 0 -955 32 -970" stroke={C.goldShade} strokeWidth={5} fill="none" />
    {tail && <Tail d={tail} w={26} tip={tip} tipAngle={tipAngle} tuft={tuft} />}
  </g>
);

/* ------------------------------------------------------------------ */
/* Hanuman face close-up. Local coords: face centre at 0,0            */
/* ------------------------------------------------------------------ */
export const HanumanFace: React.FC<{
  x: number;
  y: number;
  s: number;
  smile: number; // 0..1
  open: number; // 0 closed .. 1 open
  bound?: boolean;
}> = ({ x, y, s, smile, open, bound }) => {
  const eye = (m: number) => {
    const cx = 78 * m;
    if (open < 0.2) {
      return <path d={`M ${cx - 34} -24 Q ${cx} ${-8 + smile * 4} ${cx + 34} -24`} stroke={C.ink} strokeWidth={7} fill="none" />;
    }
    const ry = 26 * open;
    return (
      <g>
        <ellipse cx={cx} cy={-24} rx={32} ry={ry} fill="#FFF8EE" {...ol} />
        <ellipse cx={cx - m * 4} cy={-22} rx={17} ry={Math.min(19, ry)} fill={C.hair} />
        <circle cx={cx - m * 4 + 6} cy={-30} r={5} fill="#fff" />
        <path d={`M ${cx - 34} ${-24 - ry * 0.2} Q ${cx} ${-24 - ry * 1.4} ${cx + 34} ${-24 - ry * 0.2}`} stroke={C.ink} strokeWidth={6} fill="none" />
      </g>
    );
  };
  const mY = 140;
  const lift = smile * 22;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinecap="round">
      {/* hair behind */}
      <path d="M -235 -90 C -275 120 -270 300 -220 420 L 220 420 C 270 300 275 120 235 -90 Z" fill={C.hair} {...ol} />
      {/* shoulders */}
      <path d="M -420 700 C -400 470 -260 400 -120 380 L 120 380 C 260 400 400 470 420 700 Z" fill={C.skin} {...ol} />
      <path d="M -160 380 Q 0 470 160 380 L 150 420 Q 0 520 -150 420 Z" fill={C.gold} {...ol} />
      <circle cx={0} cy={470} r={18} fill={C.red} {...ol} />
      <path d="M -150 420 Q 0 640 150 420" stroke={C.gold} strokeWidth={8} fill="none" strokeDasharray="2 14" />
      <path d="M 200 390 Q 330 430 420 560 L 420 700 L 330 700 Q 300 520 170 430 Z" fill={C.red} {...ol} />
      {bound && <path d="M -420 600 Q 0 520 420 600" stroke="#C9A46B" strokeWidth={22} fill="none" />}
      {/* neck */}
      <rect x={-80} y={220} width={160} height={180} fill={C.skin} {...ol} />
      {/* ears + earrings */}
      {[-1, 1].map((m) => (
        <g key={m}>
          <ellipse cx={205 * m} cy={20} rx={40} ry={52} fill={C.skin} {...ol} />
          <path d={`M ${205 * m - 22} 78 A 24 24 0 1 0 ${205 * m + 22} 78`} fill="none" stroke={C.gold} strokeWidth={12} />
        </g>
      ))}
      {/* face */}
      <ellipse cx={0} cy={20} rx={192} ry={220} fill={C.skin} {...ol} />
      <path d="M -190 40 Q -170 200 -60 250 Q 0 262 60 250 Q 170 200 190 40 Q 160 180 60 226 Q 0 236 -60 226 Q -160 180 -190 40 Z" fill="#9C6A47" opacity={0.85} />
      {/* muzzle */}
      <ellipse cx={0} cy={110} rx={128} ry={100} fill={C.muzzle} {...ol} />
      <ellipse cx={-14} cy={62} rx={10} ry={7} fill={C.ink} />
      <ellipse cx={14} cy={62} rx={10} ry={7} fill={C.ink} />
      <path d="M 0 74 L 0 100" stroke={C.skinShade} strokeWidth={5} />
      <path
        d={`M ${-70 - smile * 10} ${mY - lift} Q 0 ${mY + 10 + smile * 34} ${70 + smile * 10} ${mY - lift}`}
        stroke={C.ink}
        strokeWidth={7}
        fill="none"
      />
      {smile > 0.5 && (
        <path d={`M -40 ${mY + 4} Q 0 ${mY + 10 + smile * 30} 40 ${mY + 4}`} fill="#8E3B2E" opacity={(smile - 0.5) * 1.6} />
      )}
      {/* cheeks */}
      <ellipse cx={-110} cy={60} rx={30} ry={16} fill="#E88B6A" opacity={0.25 + smile * 0.25} />
      <ellipse cx={110} cy={60} rx={30} ry={16} fill="#E88B6A" opacity={0.25 + smile * 0.25} />
      {/* eyes + brows */}
      {eye(-1)}
      {eye(1)}
      <path d={`M -130 ${-78 - smile * 6} Q -80 -100 -36 -78`} stroke={C.hair} strokeWidth={16} fill="none" />
      <path d={`M 130 ${-78 - smile * 6} Q 80 -100 36 -78`} stroke={C.hair} strokeWidth={16} fill="none" />
      {/* tilak */}
      <path d="M -20 -70 L -32 -160 M 20 -70 L 32 -160" stroke="#FFFDF5" strokeWidth={11} />
      <path d="M 0 -76 L 0 -158" stroke={C.red} strokeWidth={10} />
      {/* crown */}
      <path d="M -200 -150 Q 0 -230 200 -150 L 196 -196 Q 0 -280 -196 -196 Z" fill={C.goldShade} {...ol} />
      <path d="M -186 -196 L -150 -330 Q 0 -380 150 -330 L 186 -196 Q 0 -280 -186 -196 Z" fill={C.gold} {...ol} />
      <path d="M -140 -330 L -96 -440 Q 0 -470 96 -440 L 140 -330 Q 0 -380 -140 -330 Z" fill={C.gold} {...ol} />
      <path d="M -86 -440 L -30 -540 L 30 -540 L 86 -440 Q 0 -470 -86 -440 Z" fill={C.gold} {...ol} />
      <circle cx={0} cy={-560} r={24} fill={C.gold} {...ol} />
      <path d="M -150 -270 Q -120 -300 -90 -270 Q -60 -240 -30 -270 M 30 -270 Q 60 -300 90 -270 Q 120 -240 150 -270" stroke={C.goldShade} strokeWidth={6} fill="none" />
      <path d="M -110 -390 Q 0 -420 110 -390" stroke={C.goldShade} strokeWidth={6} fill="none" />
      <circle cx={0} cy={-238} r={26} fill={C.red} {...ol} />
      <circle cx={-8} cy={-246} r={7} fill="#FF9C9C" />
      <circle cx={-110} cy={-310} r={11} fill="#2E8B57" {...ol} />
      <circle cx={110} cy={-310} r={11} fill="#2E8B57" {...ol} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Ravana                                                             */
/* ------------------------------------------------------------------ */
export const RavanaHead: React.FC<{ x: number; y: number; r: number; laugh: number; rot?: number }> = ({
  x,
  y,
  r,
  laugh,
  rot = 0,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${r / 100})`} strokeLinecap="round">
    <path d="M -100 -10 C -130 80 -110 150 -80 180 L 80 180 C 110 150 130 80 100 -10 Z" fill="#1E1410" {...ol} />
    <ellipse cx={0} cy={10} rx={92} ry={104} fill={C.ravanaSkin} {...ol} />
    <ellipse cx={-92} cy={14} rx={16} ry={24} fill={C.ravanaSkin} {...ol} />
    <ellipse cx={92} cy={14} rx={16} ry={24} fill={C.ravanaSkin} {...ol} />
    <circle cx={-92} cy={44} r={12} fill="none" stroke={C.gold} strokeWidth={6} />
    <circle cx={92} cy={44} r={12} fill="none" stroke={C.gold} strokeWidth={6} />
    {/* squeezed laughing eyes */}
    <path d="M -58 -6 Q -38 -26 -18 -6 M 18 -6 Q 38 -26 58 -6" stroke={C.ink} strokeWidth={7} fill="none" />
    <path d="M -66 -36 L -16 -26 M 66 -36 L 16 -26" stroke="#1E1410" strokeWidth={13} />
    {/* beard */}
    <path d="M -70 70 Q -60 140 0 150 Q 60 140 70 70 Q 30 110 0 110 Q -30 110 -70 70 Z" fill="#1E1410" />
    {/* mouth */}
    <ellipse cx={0} cy={68} rx={34} ry={10 + 22 * laugh} fill="#5A1414" {...ol} />
    <path d={`M -26 ${62 - 18 * laugh} L 26 ${62 - 18 * laugh}`} stroke="#fff" strokeWidth={8} />
    {/* moustache */}
    <path d="M -4 38 Q -40 30 -62 44 Q -78 52 -72 34 M 4 38 Q 40 30 62 44 Q 78 52 72 34" stroke="#1E1410" strokeWidth={11} fill="none" />
    <ellipse cx={0} cy={22} rx={14} ry={10} fill="#8E5534" />
    {/* crown */}
    <path d="M -84 -60 L -70 -170 Q 0 -200 70 -170 L 84 -60 Q 0 -90 -84 -60 Z" fill={C.gold} {...ol} />
    <path d="M -54 -176 L 0 -260 L 54 -176 Q 0 -196 -54 -176 Z" fill={C.gold} {...ol} />
    <circle cx={0} cy={-120} r={17} fill={C.red} {...ol} />
    <path d="M -76 -94 Q 0 -120 76 -94" stroke={C.goldShade} strokeWidth={6} fill="none" />
  </g>
);

export const RavanaSeated: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => {
  const f = useCurrentFrame();
  const heads = 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* robe/legs */}
      <path d="M -260 120 C -300 300 -280 470 -240 520 L 240 520 C 280 470 300 300 260 120 Z" fill={C.plum} {...ol} />
      <path d="M -200 520 L -150 300 M 200 520 L 150 300 M 0 520 L 0 260" stroke="#4E1F43" strokeWidth={8} />
      <ellipse cx={-120} cy={530} rx={60} ry={22} fill={C.ravanaSkin} {...ol} />
      <ellipse cx={120} cy={530} rx={60} ry={22} fill={C.ravanaSkin} {...ol} />
      {/* torso */}
      <path d="M -230 -150 Q -260 -40 -230 140 L 230 140 Q 260 -40 230 -150 Q 0 -200 -230 -150 Z" fill={C.ravanaSkin} {...ol} />
      <path d="M -190 -140 Q 0 -170 190 -140 L 170 100 Q 0 130 -170 100 Z" fill={C.gold} {...ol} />
      <path d="M -120 -60 Q 0 -20 120 -60 M -140 20 Q 0 60 140 20" stroke={C.goldShade} strokeWidth={8} fill="none" />
      <circle cx={0} cy={-40} r={26} fill={C.red} {...ol} />
      <path d="M -240 100 L 240 100 L 230 160 L -230 160 Z" fill={C.goldShade} {...ol} />
      {/* arms on armrests */}
      {[-1, 1].map((m) => (
        <g key={m} transform={`scale(${m} 1)`}>
          <path d="M -230 -140 Q -330 -60 -340 120 L -280 130 Q -270 0 -210 -60 Z" fill={C.ravanaSkin} {...ol} />
          <rect x={-352} y={70} width={78} height={32} rx={8} fill={C.gold} {...ol} />
          <ellipse cx={-312} cy={150} rx={42} ry={34} fill={C.ravanaSkin} {...ol} />
        </g>
      ))}
      {/* ten heads fanned across the shoulders */}
      {new Array(heads).fill(0).map((_, i) => {
        const t = i / (heads - 1) - 0.5; // -0.5..0.5
        const hx = t * 680;
        const hy = -250 + Math.abs(t) * Math.abs(t) * 260;
        const bob = Math.sin(f * 0.55 + i * 0.9) * 8;
        const laugh = 0.55 + 0.45 * Math.abs(Math.sin(f * 0.42 + i * 0.7));
        const order = Math.abs(t);
        return { i, hx, hy: hy + bob, laugh, order, rot: t * 30 + Math.sin(f * 0.3 + i) * 4 };
      })
        .sort((a, b) => b.order - a.order)
        .map((h) => (
          <RavanaHead key={h.i} x={h.hx} y={h.hy} r={h.order < 0.06 ? 88 : 72} laugh={h.laugh} rot={h.rot} />
        ))}
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Rakshasa guard                                                     */
/* ------------------------------------------------------------------ */
export const Guard: React.FC<{ x: number; y: number; s: number; flip?: boolean; run?: number }> = ({
  x,
  y,
  s,
  flip,
  run = 0,
}) => {
  const f = useCurrentFrame();
  const step = run ? Math.sin(f * 0.9) * 22 * run : 0;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} strokeLinecap="round">
      <path d={`M -40 -10 L ${-50 + step} 120`} stroke={C.guard} strokeWidth={42} />
      <path d={`M 40 -10 L ${50 - step} 120`} stroke={C.guard} strokeWidth={42} />
      <ellipse cx={0} cy={-60} rx={120} ry={130} fill={C.guard} {...ol} />
      <path d="M -112 -40 Q 0 30 112 -40 L 100 60 Q 0 110 -100 60 Z" fill={C.plum} {...ol} />
      <path d="M -112 -40 Q 0 0 112 -40" stroke={C.gold} strokeWidth={14} fill="none" />
      <circle cx={0} cy={-230} r={80} fill={C.guard} {...ol} />
      <ellipse cx={0} cy={-322} rx={22} ry={26} fill="#1A1A1A" />
      <path d="M -36 -250 Q -26 -270 -14 -252 M 14 -252 Q 26 -270 36 -250" stroke={C.ink} strokeWidth={6} fill="none" />
      <circle cx={-26} cy={-236} r={8} fill={C.ink} />
      <circle cx={26} cy={-236} r={8} fill={C.ink} />
      <ellipse cx={0} cy={-196} rx={14} ry={18} fill="#2B2340" />
      <path d="M -30 -186 L -24 -212 L -18 -186 Z M 30 -186 L 24 -212 L 18 -186 Z" fill="#FFF8E8" stroke={C.ink} strokeWidth={2} />
      <path d={`M -110 -110 L ${-170} ${-150 - step}`} stroke={C.guard} strokeWidth={36} />
      <path d={`M 110 -110 L ${170} ${-150 + step}`} stroke={C.guard} strokeWidth={36} />
    </g>
  );
};

/* ------------------------------------------------------------------ */
/* Sita praying, head-and-shoulders                                    */
/* ------------------------------------------------------------------ */
export const SitaPraying: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => {
  const f = useCurrentFrame();
  const breathe = Math.sin(f * 0.08) * 4;
  return (
    <g transform={`translate(${x} ${y + breathe}) scale(${s})`} strokeLinecap="round">
      {/* sari draped over head */}
      <path d="M -230 -40 C -250 -260 -120 -330 0 -330 C 120 -330 250 -260 230 -40 C 260 200 360 360 420 640 L -420 640 C -360 360 -260 200 -230 -40 Z" fill={C.red} {...ol} />
      <path d="M -230 -40 C -250 -260 -120 -330 0 -330 C 120 -330 250 -260 230 -40" stroke={C.gold} strokeWidth={16} fill="none" />
      <path d="M 230 -40 C 260 200 360 360 420 640" stroke={C.gold} strokeWidth={16} fill="none" />
      <path d="M -150 640 Q -60 300 160 120" stroke="#A21F1F" strokeWidth={10} fill="none" />
      {/* hair parting */}
      <path d="M -160 -60 C -170 -200 -80 -250 0 -250 C 80 -250 170 -200 160 -60 Z" fill={C.hair} {...ol} />
      {/* face */}
      <ellipse cx={0} cy={-40} rx={135} ry={165} fill={C.sitaSkin} {...ol} />
      <path d="M -84 -60 Q -56 -42 -28 -60 M 28 -60 Q 56 -42 84 -60" stroke={C.ink} strokeWidth={6} fill="none" />
      <path d="M -90 -64 L -100 -54 M 90 -64 L 100 -54" stroke={C.ink} strokeWidth={4} />
      <path d="M -92 -98 Q -56 -112 -24 -98 M 24 -98 Q 56 -112 92 -98" stroke={C.hair} strokeWidth={7} fill="none" />
      <circle cx={0} cy={-124} r={10} fill={C.red} />
      <path d="M -4 -40 Q -12 0 2 12" stroke="#8C5238" strokeWidth={5} fill="none" />
      <path d="M -28 48 Q 0 62 28 48" stroke="#8E2E2E" strokeWidth={8} fill="none" />
      <ellipse cx={-72} cy={10} rx={22} ry={12} fill="#D9735A" opacity={0.35} />
      <ellipse cx={72} cy={10} rx={22} ry={12} fill="#D9735A" opacity={0.35} />
      <circle cx={-136} cy={0} r={12} fill={C.gold} {...ol} />
      <circle cx={136} cy={0} r={12} fill={C.gold} {...ol} />
      {/* joined palms */}
      <path d="M -10 420 C -60 360 -70 260 -6 190 L 6 190 C 70 260 60 360 10 420 Z" fill={C.sitaSkin} {...ol} />
      <path d="M 0 196 L 0 410" stroke="#8C5238" strokeWidth={4} />
      <rect x={-56} y={410} width={112} height={22} rx={10} fill={C.gold} {...ol} />
      <path d="M -140 640 Q -90 470 -40 420 L 40 420 Q 90 470 140 640 Z" fill={C.red} {...ol} />
    </g>
  );
};
