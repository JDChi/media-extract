import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

import { runDoctor } from "../dist/commands/doctor.js";

test("doctor reports a usable extraction environment and a missing mlx_whisper backend on this machine", async () => {
  const report = await runDoctor();

  assert.equal(report.ok, true);
  assert.equal(report.command, "doctor");
  assert.equal(report.outputs.platform.arch, "arm64");
  assert.equal(report.outputs.platform.supportedAsrPlatform, true);
  assert.equal(report.outputs.dependencies.ffmpeg.status, "ok");
  assert.equal(report.outputs.dependencies.ffprobe.status, "ok");
  assert.equal(report.outputs.capabilities.canProbe, true);
  assert.equal(report.outputs.capabilities.canExtractAudio, true);
  assert.equal(report.outputs.capabilities.canSampleFrames, true);
  assert.equal(report.outputs.capabilities.canTranscribe, false);
  assert.equal(report.outputs.dependencies.mlxWhisper.status, "missing");
  assert.equal(report.outputs.dependencies.defaultModel.status, "missing");
});

test("doctor CLI defaults to human-readable output", () => {
  const output = execFileSync("node", ["dist/cli.js", "doctor"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.match(output, /media-extract doctor/i);
  assert.match(output, /ffmpeg:\s+ok/i);
  assert.match(output, /mlx_whisper:\s+missing/i);
  assert.doesNotMatch(output, /^\s*\{/m);
});

test("doctor --json keeps the machine-readable contract", () => {
  const output = execFileSync("node", ["dist/cli.js", "doctor", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });
  const parsed = JSON.parse(output);

  assert.equal(parsed.ok, true);
  assert.equal(parsed.command, "doctor");
  assert.equal(parsed.outputs.dependencies.ffmpeg.status, "ok");
});

test("top-level help is human-readable", () => {
  const output = execFileSync("node", ["dist/cli.js", "-h"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.match(output, /usage:\s+media-extract/i);
  assert.match(output, /doctor/i);
  assert.match(output, /extract-audio/i);
  assert.doesNotMatch(output, /^\s*\{/m);
});

test("subcommand help is human-readable", () => {
  const output = execFileSync("node", ["dist/cli.js", "transcribe", "-h"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.match(output, /usage:\s+media-extract transcribe/i);
  assert.match(output, /--format txt\|srt/i);
  assert.doesNotMatch(output, /^\s*\{/m);
});
