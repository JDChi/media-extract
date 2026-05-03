---
name: media-extraction
description: Use when a user provides a local video path and Codex needs to extract metadata, audio, frames, or local subtitles before doing any higher-level analysis.
---

# Codex Video Extraction

Use `media-extract` as a data-extraction backend for local video files.

## When to use

Trigger this skill when the user asks to:

- inspect a local video
- extract audio from a video
- generate local subtitles
- pull representative frames
- summarize a video after first extracting source artifacts

## Workflow

1. If this is the first use in a session, or if transcription may be needed, run:

```sh
media-extract doctor
```

Use the default `doctor` output when you want a human-readable environment summary for the user.

If you need to branch on exact dependency fields inside the agent workflow, run:

```sh
media-extract doctor --json
```

2. Choose the narrowest command that matches the request:

- `probe` for metadata only
- `extract-audio` for a normalized `wav`
- `sample-frames` for still images
- `transcribe` for local text or `srt`

Example commands:

```sh
media-extract probe /absolute/path/to/video.mp4
media-extract extract-audio /absolute/path/to/video.mp4
media-extract sample-frames /absolute/path/to/video.mp4
media-extract transcribe /absolute/path/to/video.mp4 --format srt
```

3. Read the JSON output and continue the task from the returned file paths.

## Rules

- Do not assume local ASR is installed.
- Treat `doctor` as the source of truth for environment state.
- `doctor` is human-readable by default. Use `doctor --json` when the workflow needs structured fields.
- If `transcribe` is unavailable, explain that the limitation comes from missing local dependencies or model cache, not from the video itself.
- Do not summarize the video until the required artifacts have been extracted.
