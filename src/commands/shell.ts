import type { SupportedShell } from '../config/config'
import { supportedShells } from '../config/config'

export function generateShellIntegration(shell: SupportedShell, binName: string): string {
  switch (shell) {
    case 'bash':
    case 'zsh':
      return generateBashZshIntegration(binName)
    case 'fish':
      return generateFishIntegration(binName)
    default:
      return ''
  }
}

function generateBashZshIntegration(binName: string): string {
  return `# ghm shell integration
# Add this to your .bashrc or .zshrc:
# source <(${binName} shell bash)  # for bash
# source <(${binName} shell zsh)   # for zsh

export GHM_SHELL_LOADED=1

echo "hello world from ghm"
`
}

function generateFishIntegration(binName: string): string {
  return `# ghm shell integration
# Add this to your config.fish:
# ${binName} shell fish | source

set -gx GHM_SHELL_LOADED 1

echo "hello world from ghm"
`
}

export function isValidShell(shell: string): shell is SupportedShell {
  return supportedShells.includes(shell as SupportedShell)
}
