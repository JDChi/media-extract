import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { runDoctor } from "../dist/commands/doctor.js";
import { detectMediumModel } from "../dist/lib/mlx-whisper.js";
import { makeTempDir } from "./helpers.mjs";

test("doctor reports a usable extraction environment with internally consistent capabilities", async () => {
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
  assert.equal(
    report.outputs.capabilities.canTranscribe,
    report.outputs.dependencies.python.status === "ok" &&
      report.outputs.dependencies.mlxWhisper.status === "ok" &&
      report.outputs.dependencies.defaultModel.status === "ok"
  );
  assert.match(
    report.outputs.dependencies.mlxWhisper.status,
    /^(ok|missing|unsupported)$/
  );
  assert.match(
    report.outputs.dependencies.defaultModel.status,
    /^(ok|missing|unsupported)$/
  );
});

test("detectMediumModel stays missing while the Hugging Face cache still contains an incomplete blob", () => {
  const hfHome = makeTempDir("hf-home-");
  const modelRoot = join(
    hfHome,
    "hub",
    "models--mlx-community--whisper-medium-mlx"
  );
  mkdirSync(join(modelRoot, "refs"), { recursive: true });
  mkdirSync(join(modelRoot, "snapshots", "snapshot-1"), { recursive: true });
  mkdirSync(join(modelRoot, "blobs"), { recursive: true });
  writeFileSync(join(modelRoot, "refs", "main"), "snapshot-1");
  writeFileSync(join(modelRoot, "blobs", "weights.bin.incomplete"), "partial");
  writeFileSync(join(modelRoot, "blobs", "tokenizer.json"), "ready");

  const previousHfHome = process.env.HF_HOME;
  const previousHome = process.env.HOME;
  const previousXdgCacheHome = process.env.XDG_CACHE_HOME;
  const isolatedHome = makeTempDir("home-");

  process.env.HF_HOME = hfHome;
  process.env.HOME = isolatedHome;
  delete process.env.XDG_CACHE_HOME;
  try {
    const result = detectMediumModel();
    assert.equal(result.status, "missing");
    assert.equal(result.locations.some((location) => location === modelRoot), true);
  } finally {
    if (previousHfHome === undefined) {
      delete process.env.HF_HOME;
    } else {
      process.env.HF_HOME = previousHfHome;
    }

    if (previousHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = previousHome;
    }

    if (previousXdgCacheHome === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = previousXdgCacheHome;
    }
  }
});

test("doctor CLI defaults to human-readable output", () => {
  const output = execFileSync("node", ["dist/cli.js", "doctor"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.match(output, /media-extract doctor/i);
  assert.match(output, /ffmpeg:\s+ok/i);
  assert.match(output, /mlx_whisper:\s+(ok|missing|unsupported)/i);
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

  assert.match(output, /Usage:/i);
  assert.match(output, /media-extract <command> \[options\]/i);
  assert.match(output, /doctor\s+Check local dependencies/i);
  assert.match(output, /extract-audio/i);
  assert.doesNotMatch(output, /^\s*\{/m);
});

test("subcommand help is human-readable", () => {
  const output = execFileSync("node", ["dist/cli.js", "transcribe", "-h"], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  assert.match(output, /Usage:/i);
  assert.match(output, /media-extract transcribe <inputPath>/i);
  assert.match(output, /--format <format>/i);
  assert.doesNotMatch(output, /^\s*\{/m);
});
