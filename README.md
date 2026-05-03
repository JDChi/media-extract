# media-extract

`media-extract` is a local video extraction CLI for Codex. It does not summarize or analyze content. It only turns a local video into reusable artifacts that Codex can inspect later.

## Scope

First version capabilities:

- `doctor`
- `probe`
- `extract-audio`
- `sample-frames`
- `transcribe`

First version constraints:

- local video files only
- JSON stdout only
- local ASR only
- no auto-install flow

## Requirements

- macOS on Apple Silicon for local transcription
- `ffmpeg` and `ffprobe`
- `python3`
- `mlx-whisper`
- the default `medium` MLX model cached locally

## Install dependencies

Install `ffmpeg` and `ffprobe`:

```sh
brew install ffmpeg
```

Install `mlx-whisper`:

```sh
python3 -m pip install mlx-whisper
```

Prepare the default `medium` model cache:

```sh
python3 -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='mlx-community/whisper-medium-mlx')"
```

## Build

```sh
npm run build
```

Make the CLI available on your machine:

```sh
npm link
```

Verify the environment:

```sh
media-extract doctor
media-extract doctor --json
```

Use `doctor` when you want a readable summary in the terminal. Use `doctor --json` when another tool or agent needs structured environment data.

## Usage

Probe a local video:

```sh
media-extract probe /absolute/path/to/video.mp4
```

Extract normalized audio:

```sh
media-extract extract-audio /absolute/path/to/video.mp4
```

Sample frames:

```sh
media-extract sample-frames /absolute/path/to/video.mp4
```

Transcribe with the default local backend and model:

```sh
media-extract transcribe /absolute/path/to/video.mp4 --format srt
```

## Notes

- `transcribe` uses the `mlx_whisper` executable and the `mlx-community/whisper-medium-mlx` model.
- `doctor` is human-readable by default. Add `--json` when Codex or another script needs structured output.
- `transcribe` will not auto-download the model. Run `doctor` first if you are unsure about your machine state.
- Missing dependencies are reported as JSON errors with suggested commands.
