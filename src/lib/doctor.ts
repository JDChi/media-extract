import { platform } from "node:os";

import { DEFAULT_MODEL_LABEL, detectMediumModel, detectMlxWhisperExecutable } from "./mlx-whisper.js";
import { findExecutable } from "./shell.js";

export type DependencyStatus = "ok" | "missing" | "unsupported";

export interface DependencyCheck {
  status: DependencyStatus;
  executable?: string;
  installCommand?: string;
  prepareCommand?: string;
  locations?: string[];
  message?: string;
}

export interface DoctorOutputs {
  platform: {
    os: string;
    arch: string;
    supportedAsrPlatform: boolean;
  };
  dependencies: {
    ffmpeg: DependencyCheck;
    ffprobe: DependencyCheck;
    python: DependencyCheck;
    mlxWhisper: DependencyCheck;
    defaultModel: DependencyCheck & { model: string };
  };
  capabilities: {
    canProbe: boolean;
    canExtractAudio: boolean;
    canSampleFrames: boolean;
    canTranscribe: boolean;
  };
}

function checkPython(): DependencyCheck {
  const executable = findExecutable("python3") ?? findExecutable("python");
  if (!executable) {
    return {
      status: "missing",
      installCommand: "brew install python"
    };
  }

  return {
    status: "ok",
    executable
  };
}

export function gatherDoctorOutputs(): DoctorOutputs {
  const os = platform();
  const arch = process.arch;
  const supportedAsrPlatform = os === "darwin" && arch === "arm64";

  const ffmpegExecutable = findExecutable("ffmpeg");
  const ffprobeExecutable = findExecutable("ffprobe");
  const python = checkPython();
  const mlxWhisperExecutable = detectMlxWhisperExecutable();
  const model = detectMediumModel();

  const ffmpeg: DependencyCheck = ffmpegExecutable
    ? { status: "ok", executable: ffmpegExecutable }
    : { status: "missing", installCommand: "brew install ffmpeg" };

  const ffprobe: DependencyCheck = ffprobeExecutable
    ? { status: "ok", executable: ffprobeExecutable }
    : { status: "missing", installCommand: "brew install ffmpeg" };

  const mlxWhisper: DependencyCheck = !supportedAsrPlatform
    ? {
        status: "unsupported",
        message: "Local mlx-whisper transcription is only supported on Apple Silicon macOS."
      }
    : mlxWhisperExecutable
      ? { status: "ok", executable: mlxWhisperExecutable }
      : {
          status: "missing",
          installCommand: `${python.executable ?? "python3"} -m pip install mlx-whisper`
        };

  const defaultModel: DependencyCheck & { model: string } = !supportedAsrPlatform
    ? {
        status: "unsupported",
        model: DEFAULT_MODEL_LABEL,
        message: "The default model is unsupported because the local ASR platform is unsupported."
      }
    : model.status === "ok"
      ? {
          status: "ok",
          model: DEFAULT_MODEL_LABEL,
          locations: model.locations
        }
      : {
          status: "missing",
          model: DEFAULT_MODEL_LABEL,
          locations: model.locations,
          prepareCommand:
            `${python.executable ?? "python3"} -c "from huggingface_hub import snapshot_download; ` +
            `snapshot_download(repo_id='mlx-community/whisper-medium-mlx')"`
        };

  return {
    platform: {
      os,
      arch,
      supportedAsrPlatform
    },
    dependencies: {
      ffmpeg,
      ffprobe,
      python,
      mlxWhisper,
      defaultModel
    },
    capabilities: {
      canProbe: ffprobe.status === "ok",
      canExtractAudio: ffmpeg.status === "ok",
      canSampleFrames: ffmpeg.status === "ok",
      canTranscribe:
        python.status === "ok" &&
        mlxWhisper.status === "ok" &&
        defaultModel.status === "ok" &&
        supportedAsrPlatform
    }
  };
}
