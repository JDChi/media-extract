export interface CommandErrorShape {
  code: string;
  message: string;
  details?: unknown;
}

export interface SuccessResult<T> {
  ok: true;
  command: string;
  input: string | null;
  outputs: T;
  warnings: string[];
  error: null;
}

export interface FailureResult {
  ok: false;
  command: string;
  input: string | null;
  outputs: Record<string, never>;
  warnings: string[];
  error: CommandErrorShape;
}

export type CommandResult<T> = SuccessResult<T> | FailureResult;

export class CliError extends Error {
  code: string;
  details?: unknown;
  exitCode: number;

  constructor(code: string, message: string, details?: unknown, exitCode = 1) {
    super(message);
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}

export function success<T>(
  command: string,
  input: string | null,
  outputs: T,
  warnings: string[] = []
): SuccessResult<T> {
  return {
    ok: true,
    command,
    input,
    outputs,
    warnings,
    error: null
  };
}

export function failure(
  command: string,
  input: string | null,
  error: CommandErrorShape,
  warnings: string[] = []
): FailureResult {
  return {
    ok: false,
    command,
    input,
    outputs: {},
    warnings,
    error
  };
}

export function printJson(result: CommandResult<unknown>): void {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
