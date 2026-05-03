import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { ensureDir, ensureParentDir } from "./fs.js";
import { CliError } from "./output.js";
import { findExecutable, runCommand } from "./shell.js";

export const DEFAULT_FRAME_INTERVAL_SECONDS = 1;

interface RawStream {
  index?: number;
  codec_name?: string;
  codec_type?: string;
  width?: number;
  height?: number;
  sample_rate?: string;
  channels?: number;
}

interface RawFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
  format_name?: string;
}

interface RawProbe {
  streams?: RawStream[];
  format?: RawFormat;
}

export interface VideoMetadata {
  durationSeconds: number;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  bitRate: number | null;
  formatName: string | null;
  hasAudio: boolean;
  streams: Array<{
    index: number | null;
    codecName: string | null;
    codecType: string | null;
    width?: number;
    height?: number;
    sampleRate?: number;
    channels?: number;
  }>;
}

function requireTool(name: string): string {
  const executable = findExecutable(name);
  if (!executable) {
    throw new CliError(
      "missing-dependency",
      `Required dependency is missing: ${name}`,
      {
        dependency: name,
        installCommand: name === "ffprobe" || name === "ffmpeg" ? "brew install ffmpeg" : null
      }
    );
  }

  return executable;
}

export async function probeVideo(inputPath: string): Promise<VideoMetadata> {
  const ffprobe = requireTool("ffprobe");
  const resolvedInput = resolve(inputPath);
  if (!existsSync(resolvedInput)) {
    throw new CliError("missing-input", `Input file does not exist: ${resolvedInput}`);
  }

  const result = runCommand(ffprobe, [
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-of",
    "json",
    resolvedInput
  ]);

  if (result.status !== 0) {
    throw new CliError("probe-failed", `ffprobe failed for ${resolvedInput}`, result.stderr.trim());
  }

  const parsed = JSON.parse(result.stdout) as RawProbe;
  const streams = parsed.streams ?? [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");
  const hasAudio = streams.some((stream) => stream.codec_type === "audio");
  const format = parsed.format ?? {};

  return {
    durationSeconds: Number(format.duration ?? "0"),
    width: videoStream?.width ?? null,
    height: videoStream?.height ?? null,
    sizeBytes: Number(format.size ?? "0"),
    bitRate: format.bit_rate ? Number(format.bit_rate) : null,
    formatName: format.format_name ?? null,
    hasAudio,
    streams: streams.map((stream) => ({
      index: stream.index ?? null,
      codecName: stream.codec_name ?? null,
      codecType: stream.codec_type ?? null,
      width: stream.width,
      height: stream.height,
      sampleRate: stream.sample_rate ? Number(stream.sample_rate) : undefined,
      channels: stream.channels
    }))
  };
}

export interface ExtractAudioResult {
  path: string;
  sampleRate: number;
  channels: number;
  codec: string;
  transcoded: boolean;
}

export async function extractNormalizedAudio(
  inputPath: string,
  outFile: string
): Promise<ExtractAudioResult> {
  const ffmpeg = requireTool("ffmpeg");
  ensureParentDir(outFile);
  const resolvedOutput = resolve(outFile);

  const result = runCommand(ffmpeg, [
    "-y",
    "-i",
    resolve(inputPath),
    "-vn",
    "-ac",
    "1",
    "-ar",
    "16000",
    "-c:a",
    "pcm_s16le",
    resolvedOutput
  ]);

  if (result.status !== 0) {
    throw new CliError(
      "extract-audio-failed",
      `ffmpeg failed to extract audio from ${inputPath}`,
      result.stderr.trim()
    );
  }

  return {
    path: resolvedOutput,
    sampleRate: 16000,
    channels: 1,
    codec: "pcm_s16le",
    transcoded: true
  };
}

export interface SampleFramesResult {
  directory: string;
  files: string[];
  intervalSeconds: number;
}

export async function sampleFrames(
  inputPath: string,
  outDir: string,
  intervalSeconds = DEFAULT_FRAME_INTERVAL_SECONDS
): Promise<SampleFramesResult> {
  const ffmpeg = requireTool("ffmpeg");
  const resolvedOutDir = ensureDir(outDir);
  const outputPattern = join(resolvedOutDir, "frame-%03d.jpg");

  const result = runCommand(ffmpeg, [
    "-y",
    "-i",
    resolve(inputPath),
    "-vf",
    `fps=1/${intervalSeconds}`,
    outputPattern
  ]);

  if (result.status !== 0) {
    throw new CliError(
      "sample-frames-failed",
      `ffmpeg failed to sample frames from ${inputPath}`,
      result.stderr.trim()
    );
  }

  const files = readdirSync(resolvedOutDir)
    .filter((entry: string) => entry.endsWith(".jpg"))
    .sort()
    .map((entry: string) => join(resolvedOutDir, entry));

  return {
    directory: resolvedOutDir,
    files,
    intervalSeconds
  };
}
