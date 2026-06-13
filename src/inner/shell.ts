import { existsSync } from 'node:fs'
import type { SupportedShell } from '../utils/config'
import type { CommandAliasConfig } from '../utils/alias'
import { buildAliasLines } from '../utils/alias'
import { getDefaultConfigPath, loadConfig, supportedShells } from '../utils/config'
import { error } from '../utils/error'
import { innerBinName, userBinName, getRestartFlagPath } from '../utils/runner'

export function generateShellIntegration(shell: string): string {
  if (!isValidShell(shell)) {
    error(`Invalid shell "${shell}". Supported: ${supportedShells.join(', ')}`)
  }

  const config = loadShellConfig()
  if (shell === 'bash' || shell === 'zsh') {
    return generateBashZshIntegration(config.alias, config.compositionAlias)
  } else {
    return generateFishIntegration(config.alias, config.compositionAlias)
  }
}

function generateBashZshIntegration(
  aliases: CommandAliasConfig,
  compositionAlias: boolean,
): string {
  const lines = buildAliasLines(
    aliases,
    compositionAlias,
    (name, target) => `alias ${name}='${target}'`,
  )
  const flagPath = getRestartFlagPath()
  return [
    '# mo shell integration script',
    `# Clear restart flag if present (setup completed in previous shell)`,
    `rm -f "${flagPath}" 2>/dev/null || true`,
    `${userBinName}() {`,
    `  command ${userBinName} "$@" || return $?`,
    `  local ${userBinName}_cd_result`,
    `  ${userBinName}_cd_result="$(${innerBinName} cd)" || return $?`,
    `  if [ -n "$${userBinName}_cd_result" ] && [ "$${userBinName}_cd_result" != "." ]; then`,
    `    cd "$${userBinName}_cd_result" || return $?`,
    '  fi',
    '}',
    ...lines,
    '',
  ].join('\n')
}

function generateFishIntegration(aliases: CommandAliasConfig, compositionAlias: boolean): string {
  const lines = buildAliasLines(
    aliases,
    compositionAlias,
    (name, target) => `alias ${name} '${target}'`,
  )
  const flagPath = getRestartFlagPath()
  return [
    '# mo shell integration script',
    '# Clear restart flag if present (setup completed in previous shell)',
    `rm -f "${flagPath}" 2>/dev/null; or true`,
    `function ${userBinName}`,
    `  command ${userBinName} $argv`,
    '  or return $status',
    `  set -l ${userBinName}_cd_result (${innerBinName} cd)`,
    '  or return $status',
    `  if test -n "$${userBinName}_cd_result"; and test "$${userBinName}_cd_result" != "."`,
    `    cd "$${userBinName}_cd_result"`,
    '    or return $status',
    '  end',
    'end',
    ...lines,
    '',
  ].join('\n')
}

function isValidShell(shell: string): shell is SupportedShell {
  return supportedShells.includes(shell as SupportedShell)
}

function loadShellConfig(): { alias: CommandAliasConfig; compositionAlias: boolean } {
  const configPath = getDefaultConfigPath()
  if (!existsSync(configPath)) {
    return { alias: {}, compositionAlias: false }
  }

  try {
    const config = loadConfig()
    return { alias: config.alias ?? {}, compositionAlias: config.compositionAlias ?? false }
  } catch {
    return { alias: {}, compositionAlias: false }
  }
}
