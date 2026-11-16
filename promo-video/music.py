# Original procedural music bed for the Jaaga promo: 120 BPM, 29 s, cues on scene cuts.
import numpy as np, wave, sys
SR = 44100; DUR = 29.0; N = int(SR * DUR); BEAT = 0.5; BAR = 2.0
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR); j = min(N, i + len(sig))
    if j <= i: return
    s = sig[: j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2); R[i:j] += s * np.sqrt((1 + pan) / 2)
def lowpass(x, a):
    y = np.empty_like(x); acc = 0.0
    for k in range(len(x)): acc += a * (x[k] - acc); y[k] = acc
    return y
def env(n, a, r):
    e = np.ones(n); ai = int(a * SR); ri = int(r * SR)
    if ai: e[:ai] = np.linspace(0, 1, ai)
    if ri: e[-ri:] *= np.linspace(1, 0, ri)
    return e

# C - G - Am - F (MIDI chords, voiced around middle C)
CHORDS = [[60, 64, 67, 72], [59, 62, 67, 71], [57, 60, 64, 69], [57, 60, 65, 69]]
ROOTS = [36, 43, 45, 41]
nbars = int(np.ceil(DUR / BAR))

# Pad: detuned saws, filtered, whole track
for b in range(nbars):
    ch = CHORDS[b % 4]; n = int(BAR * SR * 1.15); tt = np.arange(n) / SR
    sig = np.zeros(n)
    for m in ch:
        for d in (-0.12, 0.12):
            f = hz(m) * 2 ** (d / 12)
            sig += 2 * ((tt * f) % 1.0) - 1
    sig = lowpass(sig / 8, 0.035) * env(n, 0.5, 0.6)
    add(sig, b * BAR, pan=0.0, gain=0.8)

# Intro riser (filtered noise swell into the 4 s cut)
n = int(1.5 * SR); nz = lowpass(rng.standard_normal(n), 0.08) * np.linspace(0, 1, n) ** 2
add(nz, 2.5, gain=0.18)

# Pluck arpeggio, 8th notes, from 4 s to 24 s
pattern = [0, 1, 2, 3, 2, 1, 2, 3]
step = BEAT / 2; tstart = 4.0
k = 0
while tstart + k * step < 24.0:
    when = tstart + k * step; b = int(when // BAR) % 4
    m = CHORDS[b][pattern[k % 8]] + 12
    n = int(0.45 * SR); tt = np.arange(n) / SR; f = hz(m)
    s = (np.sin(2*np.pi*f*tt) + 0.35*np.sin(4*np.pi*f*tt) + 0.12*np.sin(6*np.pi*f*tt)) * np.exp(-tt * 9)
    add(s * env(n, 0.003, 0.05), when, pan=0.35 if k % 2 else -0.35, gain=0.16)
    k += 1

# Bass, quarter notes, 7 s to 24 s
when = 7.0
while when < 24.0:
    b = int(when // BAR) % 4; f = hz(ROOTS[b])
    n = int(0.48 * SR); tt = np.arange(n) / SR
    s = (np.sin(2*np.pi*f*tt) + 0.3*np.sin(4*np.pi*f*tt)) * env(n, 0.01, 0.12)
    add(s, when, gain=0.32); when += BEAT

# Kick on beats 7-24 s, hats on off-beats 12.5-24 s, clap on 2&4 from 12.5 s
def kick():
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 50 + 90 * np.exp(-tt * 30); ph = 2*np.pi*np.cumsum(f)/SR
    return np.sin(ph) * np.exp(-tt * 9)
def hat():
    n = int(0.06 * SR); x = rng.standard_normal(n); x = x - lowpass(x, 0.5)
    return x * np.exp(-np.arange(n)/SR * 60)
def clap():
    n = int(0.2 * SR); x = lowpass(rng.standard_normal(n), 0.35)
    return x * np.exp(-np.arange(n)/SR * 22)
when = 7.0; i = 0
while when < 24.0 - 1e-6:
    add(kick(), when, gain=0.4)
    if when >= 12.5:
        add(hat(), when + BEAT/2, pan=0.2, gain=0.12)
        if i % 2 == 1: add(clap(), when, gain=0.16)
    when += BEAT; i += 1

# Soft impacts on each scene cut
for cut in (4.0, 7.0, 12.5, 18.0, 24.0):
    n = int(1.6 * SR); tt = np.arange(n) / SR
    s = lowpass(rng.standard_normal(n), 0.03) * np.exp(-tt * 3) + np.sin(2*np.pi*hz(36)*tt) * np.exp(-tt * 4)
    add(s, cut, gain=0.22)

# Outro bell chime on the Google Play button (~25.2 s)
for j, m in enumerate([72, 76, 79, 84]):
    n = int(2.5 * SR); tt = np.arange(n) / SR; f = hz(m)
    s = (np.sin(2*np.pi*f*tt) + 0.4*np.sin(2*np.pi*f*2.76*tt)*np.exp(-tt*6)) * np.exp(-tt * 2.2)
    add(s, 25.15 + j * 0.09, pan=-0.3 + j * 0.2, gain=0.13)

# Master: gentle fade in/out, normalise, soft clip
mix = np.stack([L, R], 1)
fade = np.ones(N); fi = int(0.3*SR); fo = int(2.5*SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
mix *= fade[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.2) * 0.85
pcm = (mix * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
