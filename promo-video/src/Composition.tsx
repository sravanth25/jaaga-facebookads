import React from "react";
import {
  AbsoluteFill,
  Audio,
  staticFile,
  Composition,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const NAVY = "#153568";
const WHITE = "#FFFFFF";
const NAVY_SOFT = "rgba(21,53,104,0.08)";
const NAVY_MID = "rgba(21,53,104,0.55)";
const FONT =
  "'Poppins', 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const FPS = 30;
const SCENES = {
  intro: 120,
  hook: 90,
  audit: 165,
  locate: 165,
  services: 180,
  outro: 150,
};
const TOTAL = Object.values(SCENES).reduce((a, b) => a + b, 0);

// ---------- helpers ----------
const useSpring = (delay = 0, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping } });
};

const SceneFade: React.FC<{ duration: number; children: React.ReactNode; bg?: string }> = ({
  duration,
  children,
  bg = WHITE,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 10, duration - 10, duration], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: bg, fontFamily: FONT, opacity }}>
      {children}
    </AbsoluteFill>
  );
};

const Rise: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  delay = 0,
  children,
  style,
}) => {
  const s = useSpring(delay, 16);
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const Logo: React.FC<{ size: number; color?: string; bg?: string }> = ({
  size,
  color = NAVY,
  bg = WHITE,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
    <svg width={size} height={size} viewBox="0 0 100 100">
      <path
        d="M50 4 C28 4 12 20 12 41 C12 67 50 96 50 96 C50 96 88 67 88 41 C88 20 72 4 50 4 Z"
        fill={color}
      />
      <circle cx="50" cy="40" r="15" fill={bg} />
    </svg>
    <div
      style={{
        fontSize: size * 0.9,
        fontWeight: 800,
        color,
        letterSpacing: -2,
      }}
    >
      Jaaga
    </div>
  </div>
);

const SceneTag: React.FC<{ n: string; label: string; delay?: number }> = ({ n, label, delay = 0 }) => (
  <Rise delay={delay}>
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 16,
        padding: "12px 28px",
        borderRadius: 999,
        background: NAVY_SOFT,
        color: NAVY,
        fontSize: 30,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
      }}
    >
      <span style={{ opacity: 0.6 }}>{n}</span> {label}
    </div>
  </Rise>
);

const Check: React.FC<{ size?: number; progress: number }> = ({ size = 44, progress }) => (
  <svg width={size} height={size} viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="22" fill={NAVY} opacity={interpolate(progress, [0, 1], [0.15, 1])} />
    <path
      d="M12 23 L19 30 L32 15"
      fill="none"
      stroke={WHITE}
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={40}
      strokeDashoffset={40 * (1 - progress)}
    />
  </svg>
);

// ---------- scenes ----------
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const logo = useSpring(5, 11);
  const ring = interpolate(frame, [0, 120], [0.6, 1.5]);
  return (
    <SceneFade duration={SCENES.intro}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 700 + i * 260,
              height: 700 + i * 260,
              borderRadius: "50%",
              border: `2px solid ${NAVY}`,
              opacity: 0.08 - i * 0.02,
              transform: `scale(${ring})`,
            }}
          />
        ))}
        <div style={{ transform: `scale(${logo})` }}>
          <Logo size={190} />
        </div>
        <Rise delay={30} style={{ marginTop: 40 }}>
          <div style={{ fontSize: 56, color: NAVY, fontWeight: 500, textAlign: "center" }}>
            Know your land. <b>Before you buy.</b>
          </div>
        </Rise>
      </AbsoluteFill>
    </SceneFade>
  );
};

const Hook: React.FC = () => {
  const words = ["Verify.", "Locate.", "Protect."];
  return (
    <SceneFade duration={SCENES.hook} bg={NAVY}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
        <Rise>
          <div style={{ fontSize: 52, color: WHITE, opacity: 0.8, fontWeight: 500 }}>
            Every property deserves a second look.
          </div>
        </Rise>
        <div style={{ display: "flex", gap: 50 }}>
          {words.map((w, i) => (
            <Rise key={w} delay={15 + i * 10}>
              <div style={{ fontSize: 130, color: WHITE, fontWeight: 800, letterSpacing: -3 }}>{w}</div>
            </Rise>
          ))}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const Phone: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => {
  const s = useSpring(delay, 15);
  return (
    <div
      style={{
        width: 440,
        height: 860,
        borderRadius: 60,
        background: NAVY,
        padding: 16,
        boxShadow: "0 40px 90px rgba(21,53,104,0.35)",
        transform: `translateY(${interpolate(s, [0, 1], [300, 0])}px) rotate(${interpolate(s, [0, 1], [8, 0])}deg)`,
        opacity: s,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 46,
          background: WHITE,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};

const Audit: React.FC = () => {
  const frame = useCurrentFrame();
  const items = ["Title & ownership", "Encumbrance (EC)", "Survey records", "Litigation check", "Approvals"];
  const score = Math.round(
    interpolate(frame, [40, 130], [0, 96], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }),
  );
  return (
    <SceneFade duration={SCENES.audit}>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
        <div style={{ flex: 1 }}>
          <SceneTag n="01" label="Audit Report" />
          <Rise delay={8} style={{ marginTop: 34 }}>
            <div style={{ fontSize: 96, fontWeight: 800, color: NAVY, lineHeight: 1.05, letterSpacing: -2 }}>
              A complete property audit, in one report.
            </div>
          </Rise>
          <Rise delay={18} style={{ marginTop: 34 }}>
            <div style={{ fontSize: 42, color: NAVY_MID, lineHeight: 1.4 }}>
              Ownership, documents, dues and disputes, checked by experts.
            </div>
          </Rise>
        </div>
        <Phone delay={4}>
          <div style={{ background: NAVY, color: WHITE, padding: "50px 34px 34px" }}>
            <div style={{ fontSize: 22, opacity: 0.7, letterSpacing: 2 }}>AUDIT REPORT</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 10 }}>
              <div style={{ fontSize: 96, fontWeight: 800 }}>{score}</div>
              <div style={{ fontSize: 30, opacity: 0.8 }}>/100 Safe</div>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.2)", marginTop: 10 }}>
              <div style={{ width: `${score}%`, height: "100%", borderRadius: 5, background: WHITE }} />
            </div>
          </div>
          <div style={{ padding: "26px 30px", display: "flex", flexDirection: "column", gap: 22 }}>
            {items.map((it, i) => {
              const p = interpolate(frame, [45 + i * 16, 60 + i * 16], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              return (
                <div
                  key={it}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    padding: "18px 20px",
                    borderRadius: 20,
                    background: NAVY_SOFT,
                  }}
                >
                  <Check progress={p} />
                  <div style={{ fontSize: 28, fontWeight: 600, color: NAVY }}>{it}</div>
                </div>
              );
            })}
          </div>
        </Phone>
      </AbsoluteFill>
    </SceneFade>
  );
};

const Locate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pin = spring({ frame: frame - 35, fps, config: { damping: 9 } });
  const draw = interpolate(frame, [60, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = (frame % 40) / 40;
  const boundary = "M150 210 L430 170 L470 420 L190 470 Z";
  return (
    <SceneFade duration={SCENES.locate}>
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 160px", gap: 120 }}>
        <Phone delay={4}>
          <svg width="100%" height="100%" viewBox="0 0 408 828" preserveAspectRatio="xMidYMid slice">
            <rect width="408" height="828" fill="#F4F7FB" />
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`h${i}`} x1="0" x2="408" y1={i * 75} y2={i * 75 + 30} stroke={NAVY} strokeOpacity="0.07" strokeWidth="2" />
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <line key={`v${i}`} y1="0" y2="828" x1={i * 70} x2={i * 70 - 40} stroke={NAVY} strokeOpacity="0.07" strokeWidth="2" />
            ))}
            <path d="M0 600 C120 560 260 650 408 590" stroke={NAVY} strokeOpacity="0.18" strokeWidth="26" fill="none" />
            <g transform="translate(-60, 60)">
              <path d={boundary} fill={NAVY} fillOpacity={0.12 * draw} />
              <path
                d={boundary}
                fill="none"
                stroke={NAVY}
                strokeWidth="5"
                strokeDasharray="1200"
                strokeDashoffset={1200 * (1 - draw)}
                strokeLinejoin="round"
              />
              <circle cx="310" cy="320" r={20 + pulse * 60} fill={NAVY} opacity={(1 - pulse) * 0.3 * pin} />
              <g transform={`translate(310, ${320 - 200 * (1 - pin)}) scale(${pin})`}>
                <path d="M0 0 C-10 -18 -34 -32 -34 -56 C-34 -76 -18 -92 0 -92 C18 -92 34 -76 34 -56 C34 -32 10 -18 0 0 Z" fill={NAVY} />
                <circle cx="0" cy="-58" r="13" fill={WHITE} />
              </g>
            </g>
            <g opacity={draw}>
              <rect x="24" y="680" width="360" height="120" rx="24" fill={WHITE} stroke={NAVY} strokeOpacity="0.12" />
              <text x="48" y="728" fontSize="26" fontWeight="700" fill={NAVY} fontFamily={FONT}>Survey No. 142/3A</text>
              <text x="48" y="768" fontSize="21" fill={NAVY} fillOpacity="0.6" fontFamily={FONT}>Boundary located · 1.2 acres</text>
            </g>
          </svg>
        </Phone>
        <div style={{ flex: 1 }}>
          <SceneTag n="02" label="Find & Locate" />
          <Rise delay={8} style={{ marginTop: 34 }}>
            <div style={{ fontSize: 96, fontWeight: 800, color: NAVY, lineHeight: 1.05, letterSpacing: -2 }}>
              Find your land. See its exact boundary.
            </div>
          </Rise>
          <Rise delay={18} style={{ marginTop: 34 }}>
            <div style={{ fontSize: 42, color: NAVY_MID, lineHeight: 1.4 }}>
              Search by survey number and visit the plot with on-map directions.
            </div>
          </Rise>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const ICONS: Record<string, React.ReactNode> = {
  legal: <path d="M24 6 L40 12 V24 C40 34 32 41 24 44 C16 41 8 34 8 24 V12 Z M17 24 L22 29 L31 19" />,
  survey: <path d="M8 40 L24 8 L40 40 Z M24 8 V40 M14 28 H34" />,
  docs: <path d="M12 6 H30 L38 14 V42 H12 Z M30 6 V14 H38 M18 24 H32 M18 31 H32" />,
  monitor: <path d="M4 24 C10 14 17 10 24 10 C31 10 38 14 44 24 C38 34 31 38 24 38 C17 38 10 34 4 24 Z M24 18 A6 6 0 1 0 24 30 A6 6 0 1 0 24 18" />,
  expert: <path d="M24 6 A8 8 0 1 0 24 22 A8 8 0 1 0 24 6 M8 42 C8 32 15 27 24 27 C33 27 40 32 40 42" />,
  value: <path d="M6 40 H42 M10 34 L20 22 L28 28 L40 12 M32 12 H40 V20" />,
};

const Services: React.FC = () => {
  const list = [
    { k: "legal", t: "Legal Verification", d: "Title checked by lawyers" },
    { k: "survey", t: "Land Survey", d: "Accurate measurement" },
    { k: "docs", t: "Document Check", d: "EC, pattas & records" },
    { k: "monitor", t: "Property Monitoring", d: "Alerts on any change" },
    { k: "expert", t: "Expert Consultation", d: "Talk to a specialist" },
    { k: "value", t: "Property Valuation", d: "Know the fair price" },
  ];
  return (
    <SceneFade duration={SCENES.services}>
      <AbsoluteFill style={{ padding: "110px 160px", alignItems: "center" }}>
        <SceneTag n="03" label="And much more" />
        <Rise delay={6} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 84, fontWeight: 800, color: NAVY, letterSpacing: -2, textAlign: "center" }}>
            Everything your property needs
          </div>
        </Rise>
        <div
          style={{
            marginTop: 60,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 36,
            width: "100%",
          }}
        >
          {list.map((s, i) => (
            <Rise key={s.k} delay={18 + i * 7}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "34px 36px",
                  borderRadius: 32,
                  background: i % 2 === 0 ? NAVY : WHITE,
                  border: `3px solid ${NAVY}`,
                  color: i % 2 === 0 ? WHITE : NAVY,
                }}
              >
                <svg
                  width="76"
                  height="76"
                  viewBox="0 0 48 48"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ flexShrink: 0 }}
                >
                  {ICONS[s.k]}
                </svg>
                <div>
                  <div style={{ fontSize: 40, fontWeight: 700 }}>{s.t}</div>
                  <div style={{ fontSize: 28, opacity: 0.7, marginTop: 6 }}>{s.d}</div>
                </div>
              </div>
            </Rise>
          ))}
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

const Outro: React.FC = () => {
  const btn = useSpring(35, 12);
  return (
    <SceneFade duration={SCENES.outro} bg={NAVY}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Rise>
          <Logo size={150} color={WHITE} bg={NAVY} />
        </Rise>
        <Rise delay={14} style={{ marginTop: 36 }}>
          <div style={{ fontSize: 64, color: WHITE, fontWeight: 600, textAlign: "center" }}>
            Buy land with confidence.
          </div>
        </Rise>
        <div
          style={{
            marginTop: 60,
            transform: `scale(${btn})`,
            display: "flex",
            alignItems: "center",
            gap: 24,
            background: WHITE,
            color: NAVY,
            padding: "26px 52px",
            borderRadius: 999,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 48 48">
            <path d="M10 6 L38 24 L10 42 Z" fill={NAVY} />
          </svg>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, opacity: 0.7, letterSpacing: 1 }}>GET IT ON</div>
            <div style={{ fontSize: 46, fontWeight: 800 }}>Google Play</div>
          </div>
        </div>
      </AbsoluteFill>
    </SceneFade>
  );
};

export const JaagaPromo: React.FC = () => {
  const order: [keyof typeof SCENES, React.FC][] = [
    ["intro", Intro],
    ["hook", Hook],
    ["audit", Audit],
    ["locate", Locate],
    ["services", Services],
    ["outro", Outro],
  ];
  let from = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: WHITE }}>
      <Audio src={staticFile("jaaga-music.wav")} volume={0.8} />
      {order.map(([key, C]) => {
        const seq = (
          <Sequence key={key} from={from} durationInFrames={SCENES[key]} name={key}>
            <C />
          </Sequence>
        );
        from += SCENES[key];
        return seq;
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => {
  return (
    <Composition
      id="JaagaPromo"
      component={JaagaPromo}
      durationInFrames={TOTAL}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
