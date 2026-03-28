import { x } from 'tinyexec'

export type ExecResult = {
  stdout: string
  stderr: string
  exitCode: number | undefined
}

export async function baseExec(
  command: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<ExecResult> {
  const cwd = options.cwd ?? process.cwd()
  const env = options.env ? { ...process.env, ...options.env } : process.env

  const output = await x(command, args, {
    throwOnError: false,
    nodeOptions: {
      cwd,
      env,
    },
  })

  return {
    stdout: output.stdout,
    stderr: output.stderr,
    exitCode: output.exitCode,
  }
}

export function exec(args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return baseExec('node', ['bin/cli.mjs', ...args], options)
}

export function execWithConfig(
  args: string[],
  configPath: string,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  return exec(['--config', configPath, ...args], options)
}
