import { mkdirSync, existsSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export function makeTempDir(prefix = "media-extract-") {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function makeSampleVideo(outDir) {
  mkdirSync(outDir, { recursive: true });
  const output = join(outDir, "fixture.mp4");
  if (existsSync(output)) {
    return output;
  }

  const result = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "testsrc=size=320x240:rate=25",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1000:sample_rate=44100:duration=2",
      "-t",
      "2",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      output
    ],
    { encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(`Unable to create fixture video: ${result.stderr}`);
  }

  return output;
}
