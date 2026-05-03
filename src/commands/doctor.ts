import { gatherDoctorOutputs } from "../lib/doctor.js";
import { success, type SuccessResult } from "../lib/output.js";

export async function runDoctor(): Promise<SuccessResult<ReturnType<typeof gatherDoctorOutputs>>> {
  const outputs = gatherDoctorOutputs();
  const warnings: string[] = [];

  if (!outputs.capabilities.canTranscribe) {
    warnings.push("Video extraction is available, but local transcription is not fully configured.");
  }

  return success("doctor", null, outputs, warnings);
}

export function renderDoctorReport(
  result: SuccessResult<ReturnType<typeof gatherDoctorOutputs>>
): string {
  const { outputs, warnings } = result;
  const lines = [
    "media-extract doctor",
    "",
    `platform: ${outputs.platform.os}/${outputs.platform.arch}`,
    `supported ASR platform: ${outputs.platform.supportedAsrPlatform ? "yes" : "no"}`,
    "",
    "dependencies:",
    `  ffmpeg: ${outputs.dependencies.ffmpeg.status}${outputs.dependencies.ffmpeg.executable ? ` (${outputs.dependencies.ffmpeg.executable})` : ""}`,
    `  ffprobe: ${outputs.dependencies.ffprobe.status}${outputs.dependencies.ffprobe.executable ? ` (${outputs.dependencies.ffprobe.executable})` : ""}`,
    `  python3: ${outputs.dependencies.python.status}${outputs.dependencies.python.executable ? ` (${outputs.dependencies.python.executable})` : ""}`,
    `  mlx_whisper: ${outputs.dependencies.mlxWhisper.status}${outputs.dependencies.mlxWhisper.executable ? ` (${outputs.dependencies.mlxWhisper.executable})` : ""}`,
    `  default model (${outputs.dependencies.defaultModel.model}): ${outputs.dependencies.defaultModel.status}`,
    "",
    "capabilities:",
    `  probe: ${outputs.capabilities.canProbe ? "yes" : "no"}`,
    `  extract-audio: ${outputs.capabilities.canExtractAudio ? "yes" : "no"}`,
    `  sample-frames: ${outputs.capabilities.canSampleFrames ? "yes" : "no"}`,
    `  transcribe: ${outputs.capabilities.canTranscribe ? "yes" : "no"}`
  ];

  if (outputs.dependencies.ffmpeg.installCommand) {
    lines.push("", `install ffmpeg: ${outputs.dependencies.ffmpeg.installCommand}`);
  }

  if (outputs.dependencies.mlxWhisper.installCommand) {
    lines.push(`install mlx-whisper: ${outputs.dependencies.mlxWhisper.installCommand}`);
  }

  if (outputs.dependencies.defaultModel.prepareCommand) {
    lines.push(`prepare default model: ${outputs.dependencies.defaultModel.prepareCommand}`);
  }

  if (warnings.length > 0) {
    lines.push("", "warnings:");
    for (const warning of warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
