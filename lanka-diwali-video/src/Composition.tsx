import React from "react";
import { AbsoluteFill, Composition, Sequence, useCurrentFrame } from "remotion";
import { lerp } from "./lib";
import { S01, S02, S03, S04, S05, S06, S07, S08, S09, S10, S11, S12, S13, S14, S16, S17, S18 } from "./scenes";

// The 17 shots from the prompt pack, in order (shot 15 was cut in the original too).
const SHOTS: { id: string; dur: number; C: React.FC<{ dur: number }> }[] = [
  { id: "01 Ten heads", dur: 90, C: S01 },
  { id: "02 The tail that won't end", dur: 90, C: S02 },
  { id: "03 The small smile", dur: 75, C: S03 },
  { id: "04 The torch", dur: 75, C: S04 },
  { id: "05 Phuljhadi", dur: 70, C: S05 },
  { id: "06 Fire climbs", dur: 75, C: S06 },
  { id: "07 Sita's prayer", dur: 90, C: S07 },
  { id: "08 Fireproof", dur: 70, C: S08 },
  { id: "09 Diya row", dur: 80, C: S09 },
  { id: "10 Anar", dur: 75, C: S10 },
  { id: "11 Chakri", dur: 70, C: S11 },
  { id: "12 Joyride", dur: 90, C: S12 },
  { id: "13 Ladi", dur: 75, C: S13 },
  { id: "14 The one house", dur: 75, C: S14 },
  { id: "16 All of Lanka", dur: 95, C: S16 },
  { id: "17 The smile", dur: 80, C: S17 },
  { id: "18 Happy Diwali", dur: 150, C: S18 },
];

const XF = 8; // crossfade frames
const TOTAL = SHOTS.reduce((a, s) => a + s.dur, 0) - XF * (SHOTS.length - 1);

const Fade: React.FC<{ children: React.ReactNode; first: boolean; last: boolean; dur: number }> = ({
  children,
  first,
  last,
  dur,
}) => {
  const f = useCurrentFrame();
  const inO = first ? lerp(f, [0, 15], [0, 1]) : lerp(f, [0, XF], [0, 1]);
  const outO = last ? lerp(f, [dur - 20, dur], [1, 0]) : 1;
  return <AbsoluteFill style={{ opacity: inO * outO }}>{children}</AbsoluteFill>;
};

export const LankaDiwali: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SHOTS.map((s, i) => {
        const from = start;
        start += s.dur - XF;
        return (
          <Sequence key={s.id} name={s.id} from={from} durationInFrames={s.dur}>
            <Fade first={i === 0} last={i === SHOTS.length - 1} dur={s.dur}>
              <s.C dur={s.dur} />
            </Fade>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const MyComposition = () => (
  <Composition id="LankaDiwali" component={LankaDiwali} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
);
