import { spawnSync } from "node:child_process";

import { CliError } from "./output.js";

export interface CommandExecution {
  status: number | null;
  stdout: string;
  stderr: string;
}

export interface RunCommandOptions {
  cwd?: string;
}

export function runCommand(
  executable: string,
  args: string[],
  options: RunCommandOptions = {}
): CommandExecution {
  const result = spawnSync(executable, args, {
    cwd: options.cwd,
    encoding: "utf8"
  });

  if (result.error) {
    throw new CliError("command-failed", `Unable to start ${executable}`, result.error);
  }

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export function findExecutable(name: string): string | null {
  const result = spawnSync("which", [name], { encoding: "utf8" });
  if (result.status !== 0) {
    return null;
  }

  const value = (result.stdout ?? "").trim();
  return value.length > 0 ? value : null;
}
