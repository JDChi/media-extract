#!/usr/bin/env node

import { cac } from "cac";

import { renderDoctorReport, runDoctor } from "./commands/doctor.js";
import { runProbe } from "./commands/probe.js";
import { runExtractAudio } from "./commands/extract-audio.js";
import { runSampleFrames } from "./commands/sample-frames.js";
import { runTranscribe } from "./commands/transcribe.js";
import { CliError, failure, printJson } from "./lib/output.js";

type CommandContext = {
  command: string;
  input: string | null;
};

function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  return new CliError("unexpected-error", error instanceof Error ? error.message : String(error), error);
}

async function runWithJsonErrors(
  context: CommandContext,
  action: () => Promise<void>
): Promise<void> {
  try {
    await action();
  } catch (error: unknown) {
    const cliError = toCliError(error);
    printJson(
      failure(context.command, context.input, {
        code: cliError.code,
        message: cliError.message,
        details: cliError.details
      })
    );
    process.exit(cliError.exitCode);
  }
}

const cli = cac("media-extract");

cli.usage("<command> [options]");
cli.help();

cli
  .command("doctor", "Check local dependencies and ASR readiness")
  .option("--json", "Output structured JSON instead of the default human-readable summary")
  .action(async (options: { json?: boolean }) => {
    await runWithJsonErrors({ command: "doctor", input: null }, async () => {
      const report = await runDoctor();
      if (options.json) {
        printJson(report);
      } else {
        process.stdout.write(renderDoctorReport(report));
      }
    });
  });

cli
  .command("probe <videoPath>", "Inspect video metadata with ffprobe")
  .action(async (videoPath: string) => {
    await runWithJsonErrors({ command: "probe", input: videoPath }, async () => {
      printJson(await runProbe(videoPath));
    });
  });

cli
  .command("extract-audio <videoPath>", "Extract normalized wav audio")
  .option("--out <file>", "Write the wav output to an explicit file path")
  .action(async (videoPath: string, options: { out?: string }) => {
    await runWithJsonErrors({ command: "extract-audio", input: videoPath }, async () => {
      printJson(await runExtractAudio({ inputPath: videoPath, outFile: options.out }));
    });
  });

cli
  .command("sample-frames <videoPath>", "Sample representative jpg frames")
  .option("--out-dir <dir>", "Write frames into an explicit directory")
  .action(async (videoPath: string, options: { outDir?: string }) => {
    await runWithJsonErrors({ command: "sample-frames", input: videoPath }, async () => {
      printJson(await runSampleFrames({ inputPath: videoPath, outDir: options.outDir }));
    });
  });

cli
  .command(
    "transcribe <inputPath>",
    "Run local mlx-whisper transcription with the default medium model"
  )
  .option("--out <file>", "Write the transcript to an explicit file path")
  .option("--format <format>", "Choose the transcript output format", {
    default: "txt"
  })
  .action(async (inputPath: string, options: { out?: string; format?: string }) => {
    await runWithJsonErrors({ command: "transcribe", input: inputPath }, async () => {
      const format = options.format ?? "txt";
      if (format !== "txt" && format !== "srt") {
        throw new CliError("invalid-arguments", "Transcription format must be `txt` or `srt`.");
      }

      printJson(await runTranscribe({ inputPath, outFile: options.out, format }));
    });
  });

if (process.argv.length <= 2) {
  cli.outputHelp();
  process.exit(0);
}

cli.parse();
