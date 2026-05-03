import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";

import { CliError } from "./output.js";
import { findExecutable, runCommand } from "./shell.js";

export const DEFAULT_MODEL_LABEL = "medium";
export const DEFAULT_MODEL_REPO = "mlx-community/whisper-medium-mlx";

export type TranscriptFormat = "txt" | "srt";

function huggingFaceCacheRoots(): string[] {
  const roots: string[] = [];
  const home = homedir();
  const env = process.env;

  if (env.HF_HOME) {
    roots.push(resolve(env.HF_HOME));
  }

  if (env.XDG_CACHE_HOME) {
    roots.push(resolve(env.XDG_CACHE_HOME, "huggingface"));
  }

  roots.push(join(home, ".cache", "huggingface"));
  roots.push(join(home, "Library", "Caches", "huggingface"));

  return [...new Set(roots)];
}

function hasCompletedModelCache(location: string): boolean {
  if (!existsSync(location)) {
    return false;
  }

  const refsMain = join(location, "refs", "main");
  const snapshotsDir = join(location, "snapshots");
  const blobsDir = join(location, "blobs");

  if (!existsSync(refsMain) || !existsSync(snapshotsDir) || !existsSync(blobsDir)) {
    return false;
  }

  const snapshotEntries = readdirSync(snapshotsDir);
  if (snapshotEntries.length === 0) {
    return false;
  }

  const blobEntries = readdirSync(blobsDir);
  if (blobEntries.length === 0) {
    return false;
  }

  if (blobEntries.some((entry: string) => entry.endsWith(".incomplete"))) {
    return false;
  }

  return true;
}

export function detectMediumModel(): { status: "ok" | "missing"; locations: string[] } {
  const locations = huggingFaceCacheRoots().map((root) =>
    join(root, "hub", "models--mlx-community--whisper-medium-mlx")
  );

  return {
    status: locations.some((location) => hasCompletedModelCache(location)) ? "ok" : "missing",
    locations
  };
}

export function detectMlxWhisperExecutable(): string | null {
  return findExecutable("mlx_whisper");
}

export interface TranscribeOptions {
  inputPath: string;
  outputFile: string;
  format: TranscriptFormat;
  executable?: string;
}

export async function transcribeWithMlxWhisper(
  options: TranscribeOptions
): Promise<{ path: string; backend: string; model: string }> {
  const executable = options.executable ?? detectMlxWhisperExecutable();
  if (!executable) {
    throw new CliError(
      "missing-mlx-whisper",
      "mlx_whisper is not available. Install it with `python3 -m pip install mlx-whisper`."
    );
  }

  const resolvedOutput = resolve(options.outputFile);
  const outputDir = dirname(resolvedOutput);
  const outputName = basename(resolvedOutput, extname(resolvedOutput));

  const result = runCommand(
    executable,
    [
      resolve(options.inputPath),
      "--model",
      DEFAULT_MODEL_REPO,
      "-f",
      options.format,
      "--output-name",
      outputName
    ],
    { cwd: outputDir }
  );

  if (result.status !== 0) {
    throw new CliError("transcribe-failed", "mlx_whisper failed to transcribe the input.", {
      stderr: result.stderr.trim()
    });
  }

  if (!existsSync(resolvedOutput)) {
    throw new CliError(
      "missing-transcript",
      `mlx_whisper finished without creating the expected transcript: ${resolvedOutput}`
    );
  }

  return {
    path: resolvedOutput,
    backend: "mlx-whisper",
    model: DEFAULT_MODEL_LABEL
  };
}
