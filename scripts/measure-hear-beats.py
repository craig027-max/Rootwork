#!/usr/bin/env python3
"""Measure Hear beat splits from baked mp3s (does not regenerate clips).

Each Hear clip is name → 0.6s gap → spoken sound → 0.6s gap → letters.
This finds those two mid-clip silences and writes speech-start times for
beats 2 and 3. Beat 1 (name) starts at 0.

    python3 scripts/measure-hear-beats.py

Keep in lockstep with HEAR_BEAT_GAP_S in generate-hear-clips.py.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLIP_DIR = ROOT / "public" / "audio" / "hear"
OUT = ROOT / "src" / "core" / "hearBeatTimes.ts"

# Baker inserts 0.6s; trim leftover lands ~0.67–0.70s. Letter pauses are shorter.
MIN_GAP_S = 0.45
MAX_GAP_S = 1.05
# Ignore a leading pad; the first real gap is after the name.
MIN_START_S = 0.15

START_RE = re.compile(r"silence_start:\s*([0-9.]+)")
END_RE = re.compile(
    r"silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)"
)


def detect_gaps(path: Path) -> list[tuple[float, float, float]]:
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            str(path),
            "-af",
            "silencedetect=noise=-35dB:d=0.35",
            "-f",
            "null",
            "-",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    err = result.stderr
    starts = [float(m.group(1)) for m in START_RE.finditer(err)]
    ends: list[tuple[float, float]] = [
        (float(m.group(1)), float(m.group(2))) for m in END_RE.finditer(err)
    ]
    gaps: list[tuple[float, float, float]] = []
    for start, (end, duration) in zip(starts, ends):
        if MIN_GAP_S <= duration <= MAX_GAP_S and start > MIN_START_S:
            gaps.append((start, end, duration))
    return gaps


def measure_all() -> dict[str, tuple[float, float]]:
    files = sorted(CLIP_DIR.glob("*.mp3"))
    if not files:
        raise SystemExit(f"No Hear clips in {CLIP_DIR}")
    splits: dict[str, tuple[float, float]] = {}
    failed: list[str] = []
    for path in files:
        gaps = detect_gaps(path)
        if len(gaps) != 2:
            failed.append(f"{path.name}: {[(round(g[0], 3), round(g[1], 3), round(g[2], 3)) for g in gaps]}")
            continue
        splits[path.stem] = (round(gaps[0][1], 3), round(gaps[1][1], 3))
    if failed:
        raise SystemExit("Could not derive two beat gaps:\n" + "\n".join(failed))
    return splits


def write_map(splits: dict[str, tuple[float, float]]) -> None:
    rows = ",\n".join(
        f"  {clip_id}: [{t2}, {t3}]" for clip_id, (t2, t3) in splits.items()
    )
    OUT.write_text(
        f"""/**
 * Speech-start times (seconds) for Hear beats 2 and 3.
 * Beat 1 (name) starts at 0. Used with HTMLAudioElement.currentTime.
 *
 * Measured from public/audio/hear/{{id}}.mp3 — ffmpeg silencedetect on the
 * ~0.6s baker gaps. Not a guess and not equal thirds.
 * Do not hand-edit: `python3 scripts/measure-hear-beats.py`.
 */
export const HEAR_BEAT_SPLITS: Readonly<Record<string, readonly [number, number]>> = {{
{rows},
}};
""",
        encoding="utf-8",
    )


def main() -> None:
    if not shutil_which("ffmpeg"):
        sys.stderr.write("ffmpeg is required to measure Hear beat splits.\n")
        sys.exit(1)
    splits = measure_all()
    write_map(splits)
    t2 = [v[0] for v in splits.values()]
    t3 = [v[1] for v in splits.values()]
    print(
        f"Wrote {len(splits)} split(s) to {OUT.relative_to(ROOT)}; "
        f"beat2 {min(t2):.3f}–{max(t2):.3f}s, "
        f"beat3 {min(t3):.3f}–{max(t3):.3f}s"
    )


def shutil_which(name: str) -> str | None:
    from shutil import which

    return which(name)


if __name__ == "__main__":
    main()
