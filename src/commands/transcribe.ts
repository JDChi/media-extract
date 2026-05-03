import { defaultArtifactDir, ensureAbsoluteInput, ensureAbsoluteMaybe, withExtension } from "../lib/fs.js";
import { extractNormalizedAudio } from "../lib/ffmpeg.js";
import { DEFAULT_MODEL_LABEL, TranscriptFormat, transcribeWithMlxWhisper } from "../lib/mlx-whisper.js";
import { CliError, success, type SuccessResult } from "../lib/output.js";

import { runDoctor } from "./doctor.js";

export interface TranscribeCommandOptions {
  inputPath: string;
  outFile?: string;
  format: TranscriptFormat;
  doctorReport?: Awaited<ReturnType<typeof runDoctor>>;
}

const AUDIO_EXTENSIONS = new Set([".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg"]);

function isAudioInput(inputPath: string): boolean {
  const lastDot = inputPath.lastIndexOf(".");
  const extension = lastDot >= 0 ? inputPath.slice(lastDot).toLowerCase() : "";
  return AUDIO_EXTENSIONS.has(extension);
}

export async function runTranscribe(
  options: TranscribeCommandOptions
): Promise<
  SuccessResult<{
    transcript: {
      path: string;
      format: TranscriptFormat;
      backend: string;
      model: string;
    };
    audio?: {
      path: string;
      extractedForTranscription: boolean;
    };
  }>
> {
  const resolvedInput = ensureAbsoluteInput(options.inputPath);
  const report = options.doctorReport ?? (await runDoctor());
  const dependencies = report.outputs.dependencies;

  if (!report.outputs.capabilities.canTranscribe) {
    if (dependencies.mlxWhisper.status !== "ok") {
      throw new CliError(
        "missing-mlx-whisper",
        "mlx_whisper is not available. Install it with `python3 -m pip install mlx-whisper`.",
        dependencies.mlxWhisper
      );
    }

    if (dependencies.defaultModel.status !== "ok") {
      throw new CliError(
        "missing-model",
        `The default ${DEFAULT_MODEL_LABEL} model is not prepared locally.`,
        dependencies.defaultModel
      );
    }
  }

  const artifactDir = defaultArtifactDir(resolvedInput);
  const outputFile = options.outFile
    ? withExtension(ensureAbsoluteMaybe(options.outFile), options.format)
    : `${artifactDir}/transcript.${options.format}`;

  let transcriptionInput = resolvedInput;
  let audioOutput:
    | {
        path: string;
        extractedForTranscription: boolean;
      }
    | undefined;

  if (!isAudioInput(resolvedInput)) {
    transcriptionInput = `${artifactDir}/audio.wav`;
    const extracted = await extractNormalizedAudio(resolvedInput, transcriptionInput);
    audioOutput = {
      path: extracted.path,
      extractedForTranscription: true
    };
  }

  const transcript = await transcribeWithMlxWhisper({
    inputPath: transcriptionInput,
    outputFile,
    format: options.format
  });

  return success("transcribe", resolvedInput, {
    transcript: {
      path: transcript.path,
      format: options.format,
      backend: transcript.backend,
      model: transcript.model
    },
    audio: audioOutput
  });
}
