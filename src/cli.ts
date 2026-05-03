#!/usr/bin/env node

import { CliError, failure, printJson } from "./lib/output.js";
import { renderDoctorReport, runDoctor } from "./commands/doctor.js";
import { runProbe } from "./commands/probe.js";
import { runExtractAudio } from "./commands/extract-audio.js";
import { runSampleFrames } from "./commands/sample-frames.js";
import { runTranscribe } from "./commands/transcribe.js";

const context: { command: string; input: string | null } = {
  command: "cli",
  input: null
};

function renderHelp(): string {
  return [
    "usage: media-extract <command> [options]",
    "",
    "commands:",
    "  doctor [--json]                      Check local dependencies and ASR readiness",
    "  probe <video-path>                  Inspect video metadata with ffprobe",
    "  extract-audio <video-path> [--out <file>]",
    "                                      Extract normalized wav audio",
    "  sample-frames <video-path> [--out-dir <dir>]",
    "                                      Sample representative jpg frames",
    "  transcribe <video-path|audio-path> [--out <file>] [--format txt|srt]",
    "                                      Run local mlx-whisper transcription",
    "",
    "top-level flags:",
    "  -h, --help                          Show this help text",
    "",
    "notes:",
    "  doctor is human-readable by default",
    "  use doctor --json for structured output"
  ].join("\n");
}

function renderDoctorHelp(): string {
  return [
    "usage: media-extract doctor [--json]",
    "",
    "Check local dependencies and ASR readiness.",
    "",
    "options:",
    "  --json    Output structured JSON instead of the default human-readable summary"
  ].join("\n");
}

function renderProbeHelp(): string {
  return [
    "usage: media-extract probe <video-path>",
    "",
    "Inspect a local video with ffprobe and print metadata as JSON."
  ].join("\n");
}

function renderExtractAudioHelp(): string {
  return [
    "usage: media-extract extract-audio <video-path> [--out <file>]",
    "",
    "Extract normalized wav audio from a local video.",
    "",
    "options:",
    "  --out <file>    Write the wav output to an explicit file path"
  ].join("\n");
}

function renderSampleFramesHelp(): string {
  return [
    "usage: media-extract sample-frames <video-path> [--out-dir <dir>]",
    "",
    "Sample representative jpg frames from a local video.",
    "",
    "options:",
    "  --out-dir <dir>    Write frames into an explicit directory"
  ].join("\n");
}

function renderTranscribeHelp(): string {
  return [
    "usage: media-extract transcribe <video-path|audio-path> [--out <file>] [--format txt|srt]",
    "",
    "Run local mlx-whisper transcription with the default medium model.",
    "",
    "options:",
    "  --out <file>        Write the transcript to an explicit file path",
    "  --format txt|srt    Choose the transcript output format"
  ].join("\n");
}

function isHelpFlag(value: string | undefined): boolean {
  return value === "-h" || value === "--help";
}

function requireValue(flag: string, value: string | undefined): string {
  if (!value) {
    throw new CliError("invalid-arguments", `Missing value for ${flag}.`);
  }

  return value;
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "-h" || command === "--help") {
    process.stdout.write(`${renderHelp()}\n`);
    return;
  }

  switch (command) {
    case "doctor": {
      context.command = "doctor";
      if (rest.some((value: string) => isHelpFlag(value))) {
        process.stdout.write(`${renderDoctorHelp()}\n`);
        return;
      }
      const asJson = rest.includes("--json");
      const unknownFlags = rest.filter((value: string) => value !== "--json");
      if (unknownFlags.length > 0) {
        throw new CliError("invalid-arguments", `Unknown flag: ${unknownFlags[0]}`);
      }

      const report = await runDoctor();
      if (asJson) {
        printJson(report);
      } else {
        process.stdout.write(renderDoctorReport(report));
      }
      return;
    }
    case "probe": {
      context.command = "probe";
      if (isHelpFlag(rest[0])) {
        process.stdout.write(`${renderProbeHelp()}\n`);
        return;
      }
      context.input = requireValue("input", rest[0]);
      printJson(await runProbe(context.input));
      return;
    }
    case "extract-audio": {
      if (isHelpFlag(rest[0])) {
        process.stdout.write(`${renderExtractAudioHelp()}\n`);
        return;
      }
      const inputPath = requireValue("input", rest[0]);
      context.command = "extract-audio";
      context.input = inputPath;
      let outFile: string | undefined;

      for (let index = 1; index < rest.length; index += 1) {
        if (rest[index] === "--out") {
          outFile = requireValue("--out", rest[index + 1]);
          index += 1;
        } else {
          throw new CliError("invalid-arguments", `Unknown flag: ${rest[index]}`);
        }
      }

      printJson(await runExtractAudio({ inputPath, outFile }));
      return;
    }
    case "sample-frames": {
      if (isHelpFlag(rest[0])) {
        process.stdout.write(`${renderSampleFramesHelp()}\n`);
        return;
      }
      const inputPath = requireValue("input", rest[0]);
      context.command = "sample-frames";
      context.input = inputPath;
      let outDir: string | undefined;

      for (let index = 1; index < rest.length; index += 1) {
        if (rest[index] === "--out-dir") {
          outDir = requireValue("--out-dir", rest[index + 1]);
          index += 1;
        } else {
          throw new CliError("invalid-arguments", `Unknown flag: ${rest[index]}`);
        }
      }

      printJson(await runSampleFrames({ inputPath, outDir }));
      return;
    }
    case "transcribe": {
      if (isHelpFlag(rest[0])) {
        process.stdout.write(`${renderTranscribeHelp()}\n`);
        return;
      }
      const inputPath = requireValue("input", rest[0]);
      context.command = "transcribe";
      context.input = inputPath;
      let outFile: string | undefined;
      let format = "txt";

      for (let index = 1; index < rest.length; index += 1) {
        if (rest[index] === "--out") {
          outFile = requireValue("--out", rest[index + 1]);
          index += 1;
        } else if (rest[index] === "--format") {
          format = requireValue("--format", rest[index + 1]);
          index += 1;
        } else {
          throw new CliError("invalid-arguments", `Unknown flag: ${rest[index]}`);
        }
      }

      if (format !== "txt" && format !== "srt") {
        throw new CliError("invalid-arguments", "Transcription format must be `txt` or `srt`.");
      }

      printJson(await runTranscribe({ inputPath, outFile, format }));
      return;
    }
    default:
      throw new CliError(
        "invalid-command",
        "Usage: media-extract <doctor|probe|extract-audio|sample-frames|transcribe> ..."
      );
  }
}

main().catch((error: unknown) => {
  const cliError =
    error instanceof CliError
      ? error
      : new CliError("unexpected-error", error instanceof Error ? error.message : String(error), error);

  printJson(
    failure(context.command, context.input, {
      code: cliError.code,
      message: cliError.message,
      details: cliError.details
    })
  );
  process.exit(cliError.exitCode);
});
