import type { CommandAliasConfig } from '../utils/alias.ts'
import { buildAliasLines } from '../utils/alias.ts'
import type { SupportedShell } from '../utils/config.ts'
import { getDefaultConfigPath, loadConfig, supportedShells } from '../utils/config.ts'
import { error } from '../utils/error.ts'
import { pathExists } from '../utils/fs.ts'
import { innerBinName, shellIntegrationEnvName, userBinName } from '../utils/runner.ts'

export async function generateShellIntegration(shell: string): Promise<string> {
  if (!isValidShell(shell)) {
    error(`Invalid shell "${shell}". Supported: ${supportedShells.join(', ')}`)
  }

  const config = await loadShellConfig()
  if (shell === 'bash' || shell === 'zsh') {
    return generateBashZshIntegration(shell, config.alias, config.compositionAlias)
  }
  return generateFishIntegration(config.alias, config.compositionAlias)
}

function generateBashZshIntegration(
  shell: 'bash' | 'zsh',
  aliases: CommandAliasConfig,
  compositionAlias: boolean
): string {
  const lines = buildAliasLines(
    aliases,
    compositionAlias,
    (name, target) => `alias ${name}='${target}'`
  )
  return [
    '# mo shell integration script',
    `${userBinName}() {`,
    `  ${innerBinName} actions-clear >/dev/null 2>&1 || true`,
    `  ${shellIntegrationEnvName}=1 command ${userBinName} "$@" || return $?`,
    `  local ${userBinName}_actions`,
    `  ${userBinName}_actions="$(${innerBinName} actions ${shell})" || return $?`,
    `  if [ -n "$${userBinName}_actions" ]; then`,
    `    eval "$${userBinName}_actions" || return $?`,
    '  fi',
    '}',
    ...lines,
    ''
  ].join('\n')
}

function generateFishIntegration(aliases: CommandAliasConfig, compositionAlias: boolean): string {
  const lines = buildAliasLines(
    aliases,
    compositionAlias,
    (name, target) => `alias ${name} '${target}'`
  )
  return [
    '# mo shell integration script',
    `function ${userBinName}`,
    `  ${innerBinName} actions-clear >/dev/null 2>&1; or true`,
    `  env ${shellIntegrationEnvName}=1 command ${userBinName} $argv`,
    '  or return $status',
    `  ${innerBinName} actions fish | source`,
    '  or return $status',
    'end',
    ...lines,
    ''
  ].join('\n')
}

function isValidShell(shell: string): shell is SupportedShell {
  return supportedShells.includes(shell as SupportedShell)
}

async function loadShellConfig(): Promise<{
  alias: CommandAliasConfig
  compositionAlias: boolean
}> {
  const configPath = getDefaultConfigPath()
  if (!(await pathExists(configPath))) {
    return { alias: {}, compositionAlias: false }
  }

  try {
    const config = await loadConfig()
    return { alias: config.alias ?? {}, compositionAlias: config.compositionAlias }
  } catch {
    return { alias: {}, compositionAlias: false }
  }
}
