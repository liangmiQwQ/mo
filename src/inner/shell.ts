import { existsSync } from 'node:fs'
import type { SupportedShell } from '../utils/config'
import type { CommandAliasConfig } from '../utils/alias'
import { buildAliasLines } from '../utils/alias'
import { getDefaultConfigPath, loadConfig, supportedShells } from '../utils/config'
import { error } from '../utils/error'

export function generateShellIntegration(shell: string): string {
  if (!isValidShell(shell)) {
    error(`Invalid shell "${shell}". Supported: ${supportedShells.join(', ')}`)
  }

  const aliases = loadAliasConfig()
  if (shell === 'bash' || shell === 'zsh') {
    return generateBashZshIntegration(aliases)
  } else {
    return generateFishIntegration(aliases)
  }
}

function generateBashZshIntegration(aliases: CommandAliasConfig): string {
  const lines = buildAliasLines(aliases, (name, target) => `alias ${name}='${target}'`)
  return [
    '# mo shell integration script',
    'mo() {',
    '  if [ "$1" = "cd" ] || [ "$1" = "d" ]; then',
    '    shift',
    '    local mo_cd_target',
    '    mo_cd_target="$(command mo cd "$@")" || return $?',
    '    export MO_CD_TARGET="$mo_cd_target"',
    '  else',
    '    command mo "$@" || return $?',
    '  fi',
    '',
    '  local mo_cd_result',
    '  mo_cd_result="$(mo-inner cd)" || return $?',
    '  if [ -n "$mo_cd_result" ] && [ "$mo_cd_result" != "." ]; then',
    '    cd "$mo_cd_result" || return $?',
    '  fi',
    '',
    '  unset MO_CD_TARGET',
    '}',
    ...lines,
    '',
  ].join('\n')
}

function generateFishIntegration(aliases: CommandAliasConfig): string {
  const lines = buildAliasLines(aliases, (name, target) => `alias ${name} '${target}'`)
  return [
    '# mo shell integration script',
    'function mo',
    '  if test (count $argv) -gt 0; and begin; test "$argv[1]" = "cd"; or test "$argv[1]" = "d"; end',
    '    set -l mo_cd_target (command mo cd $argv[2..-1])',
    '    or return $status',
    '    set -gx MO_CD_TARGET "$mo_cd_target"',
    '  else',
    '    command mo $argv',
    '    or return $status',
    '  end',
    '',
    '  set -l mo_cd_result (mo-inner cd)',
    '  or return $status',
    '  if test -n "$mo_cd_result"; and test "$mo_cd_result" != "."',
    '    cd "$mo_cd_result"',
    '    or return $status',
    '  end',
    '',
    '  set -e MO_CD_TARGET',
    'end',
    ...lines,
    '',
  ].join('\n')
}

function isValidShell(shell: string): shell is SupportedShell {
  return supportedShells.includes(shell as SupportedShell)
}

function loadAliasConfig(): CommandAliasConfig {
  const configPath = getDefaultConfigPath()
  if (!existsSync(configPath)) {
    return {}
  }

  try {
    const config = loadConfig()
    return config.alias ?? {}
  } catch {
    return {}
  }
}
