"""Estimate tempo and beat-grid phase for local soundtrack files."""
import subprocess
import sys
from pathlib import Path

import numpy as np

FFMPEG = Path("node_modules/ffmpeg-static/ffmpeg")
RATE = 11025
FPS = 100

for source in map(Path, sys.argv[1:]):
    raw = subprocess.check_output([str(FFMPEG), "-v", "error", "-i", str(source), "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"])
    samples = np.frombuffer(raw, dtype=np.float32)
    hop = RATE // FPS
    samples = samples[: len(samples) // hop * hop].reshape(-1, hop)
    energy = np.sqrt(np.mean(samples * samples, axis=1))
    onset = np.maximum(0, np.diff(energy, prepend=energy[0]))
    scores = []
    for bpm in range(70, 181):
        lag = round(60 * FPS / bpm)
        scores.append(float(np.dot(onset[lag:], onset[:-lag])))
    bpm = int(np.argmax(scores)) + 70
    period = round(60 * FPS / bpm)
    phase_scores = [float(onset[phase::period].sum()) for phase in range(period)]
    phase = int(np.argmax(phase_scores)) / FPS
    print(f"{source.name} duration={len(samples)*hop/RATE:.3f} bpm={bpm} beatOffset={phase:.3f}")
