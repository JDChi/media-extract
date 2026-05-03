import { defaultArtifactDir, ensureAbsoluteInput, ensureAbsoluteMaybe } from "../lib/fs.js";
import { extractNormalizedAudio } from "../lib/ffmpeg.js";
import { success, type SuccessResult } from "../lib/output.js";

export interface ExtractAudioCommandOptions {
  inputPath: string;
  outFile?: string;
}

export async function runExtractAudio(
  options: ExtractAudioCommandOptions
): Promise<
  SuccessResult<{
    audio: Awaited<ReturnType<typeof extractNormalizedAudio>>;
  }>
> {
  const resolvedInput = ensureAbsoluteInput(options.inputPath);
  const outFile = options.outFile
    ? ensureAbsoluteMaybe(options.outFile)
    : `${defaultArtifactDir(resolvedInput)}/audio.wav`;
  const audio = await extractNormalizedAudio(resolvedInput, outFile);
  return success("extract-audio", resolvedInput, { audio });
}
