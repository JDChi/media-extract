import { ensureAbsoluteInput } from "../lib/fs.js";
import { probeVideo } from "../lib/ffmpeg.js";
import { success, type SuccessResult } from "../lib/output.js";

export async function runProbe(inputPath: string): Promise<SuccessResult<{ metadata: Awaited<ReturnType<typeof probeVideo>> }>> {
  const resolvedInput = ensureAbsoluteInput(inputPath);
  const metadata = await probeVideo(resolvedInput);
  return success("probe", resolvedInput, { metadata });
}
