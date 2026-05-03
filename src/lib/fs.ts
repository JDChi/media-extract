import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";

import { CliError } from "./output.js";

export function ensureAbsoluteInput(inputPath: string): string {
  if (!inputPath) {
    throw new CliError("invalid-input", "An input path is required.");
  }

  const resolved = resolve(inputPath);
  if (!existsSync(resolved)) {
    throw new CliError("missing-input", `Input file does not exist: ${resolved}`);
  }

  return resolved;
}

export function ensureAbsoluteMaybe(inputPath: string): string {
  return isAbsolute(inputPath) ? inputPath : resolve(inputPath);
}

export function ensureParentDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

export function ensureDir(dirPath: string): string {
  const resolved = resolve(dirPath);
  mkdirSync(resolved, { recursive: true });
  return resolved;
}

export function defaultArtifactDir(inputPath: string): string {
  const stem = basename(inputPath, extname(inputPath));
  return ensureDir(join(process.cwd(), ".media-extract", stem));
}

export function withExtension(filePath: string, extension: string): string {
  const ext = extension.startsWith(".") ? extension : `.${extension}`;
  return join(dirname(filePath), `${basename(filePath, extname(filePath))}${ext}`);
}
