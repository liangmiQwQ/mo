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
    '# ghm shell integration script',
    'ghm() {',
    '  if [ "$1" = "cd" ] || [ "$1" = "d" ]; then',
    '    shift',
    '    local ghm_cd_target',
    '    ghm_cd_target="$(command ghm cd "$@")" || return $?',
    '    export GHM_CD_TARGET="$ghm_cd_target"',
    '  else',
    '    command ghm "$@" || return $?',
    '  fi',
    '',
    '  local ghm_cd_result',
    '  ghm_cd_result="$(ghmi cd)" || return $?',
    '  if [ -n "$ghm_cd_result" ] && [ "$ghm_cd_result" != "." ]; then',
    '    cd "$ghm_cd_result" || return $?',
    '  fi',
    '',
    '  unset GHM_CD_TARGET',
    '}',
    ...lines,
    '',
  ].join('\n')
}

function generateFishIntegration(aliases: CommandAliasConfig): string {
  const lines = buildAliasLines(aliases, (name, target) => `alias ${name} '${target}'`)
  return [
    '# ghm shell integration script',
    'function ghm',
    '  if test (count $argv) -gt 0; and begin; test "$argv[1]" = "cd"; or test "$argv[1]" = "d"; end',
    '    set -l ghm_cd_target (command ghm cd $argv[2..-1])',
    '    or return $status',
    '    set -gx GHM_CD_TARGET "$ghm_cd_target"',
    '  else',
    '    command ghm $argv',
    '    or return $status',
    '  end',
    '',
    '  set -l ghm_cd_result (ghmi cd)',
    '  or return $status',
    '  if test -n "$ghm_cd_result"; and test "$ghm_cd_result" != "."',
    '    cd "$ghm_cd_result"',
    '    or return $status',
    '  end',
    '',
    '  set -e GHM_CD_TARGET',
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
