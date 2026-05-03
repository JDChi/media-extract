import { defaultArtifactDir, ensureAbsoluteInput, ensureAbsoluteMaybe } from "../lib/fs.js";
import { sampleFrames } from "../lib/ffmpeg.js";
import { success, type SuccessResult } from "../lib/output.js";

export interface SampleFramesCommandOptions {
  inputPath: string;
  outDir?: string;
}

export async function runSampleFrames(
  options: SampleFramesCommandOptions
): Promise<
  SuccessResult<{
    frames: {
      directory: string;
      files: string[];
      count: number;
      intervalSeconds: number;
    };
  }>
> {
  const resolvedInput = ensureAbsoluteInput(options.inputPath);
  const outDir = options.outDir
    ? ensureAbsoluteMaybe(options.outDir)
    : `${defaultArtifactDir(resolvedInput)}/frames`;
  const frames = await sampleFrames(resolvedInput, outDir);
  return success("sample-frames", resolvedInput, {
    frames: {
      directory: frames.directory,
      files: frames.files,
      count: frames.files.length,
      intervalSeconds: frames.intervalSeconds
    }
  });
}
