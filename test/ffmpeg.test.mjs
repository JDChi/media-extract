import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { probeVideo } from "../dist/lib/ffmpeg.js";
import { runExtractAudio } from "../dist/commands/extract-audio.js";
import { runSampleFrames } from "../dist/commands/sample-frames.js";
import { makeSampleVideo, makeTempDir } from "./helpers.mjs";

test("probe returns core metadata for a valid video", async () => {
  const dir = makeTempDir();
  const videoPath = makeSampleVideo(dir);

  const metadata = await probeVideo(videoPath);

  assert.equal(metadata.hasAudio, true);
  assert.equal(metadata.width, 320);
  assert.equal(metadata.height, 240);
  assert.equal(metadata.streams.length >= 2, true);
  assert.equal(metadata.durationSeconds > 0, true);
});

test("extract-audio writes a normalized wav file", async () => {
  const dir = makeTempDir();
  const videoPath = makeSampleVideo(dir);
  const outFile = join(dir, "audio.wav");

  const result = await runExtractAudio({ inputPath: videoPath, outFile });

  assert.equal(result.ok, true);
  assert.equal(result.outputs.audio.sampleRate, 16000);
  assert.equal(result.outputs.audio.channels, 1);
  assert.equal(existsSync(result.outputs.audio.path), true);
});

test("sample-frames writes at least one jpg", async () => {
  const dir = makeTempDir();
  const videoPath = makeSampleVideo(dir);
  const outDir = join(dir, "frames");

  const result = await runSampleFrames({ inputPath: videoPath, outDir });

  assert.equal(result.ok, true);
  assert.equal(result.outputs.frames.count >= 1, true);
  assert.equal(result.outputs.frames.files.every((file) => file.endsWith(".jpg")), true);
});
