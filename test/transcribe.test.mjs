import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { runTranscribe } from "../dist/commands/transcribe.js";
import { makeTempDir } from "./helpers.mjs";

test("transcribe fails clearly when mlx_whisper is unavailable", async () => {
  const dir = makeTempDir();
  const fakeAudio = join(dir, "placeholder.wav");
  writeFileSync(fakeAudio, "not real audio");

  await assert.rejects(
    () =>
      runTranscribe({
        inputPath: fakeAudio,
        format: "txt",
        doctorReport: {
          ok: true,
          command: "doctor",
          input: null,
          outputs: {
            dependencies: {
              ffmpeg: { status: "ok" },
              ffprobe: { status: "ok" },
              python: { status: "ok", executable: "python3" },
              mlxWhisper: {
                status: "missing",
                installCommand: "python3 -m pip install mlx-whisper"
              },
              defaultModel: {
                status: "missing",
                prepareCommand:
                  "python3 -c \"from huggingface_hub import snapshot_download; snapshot_download(repo_id='mlx-community/whisper-medium-mlx')\""
              }
            },
            capabilities: {
              canTranscribe: false
            }
          },
          warnings: [],
          error: null
        }
      }),
    /mlx_whisper is not available/
  );
});
