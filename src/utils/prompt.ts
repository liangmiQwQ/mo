import { createRequire } from 'node:module'
import prompts from 'prompts'
import { error } from './error'

const require = createRequire(import.meta.url)
const promptFigures = require('prompts/lib/util/figures') as { radioOn?: string; radioOff?: string }

type TextPromptOptions = {
  initial?: string
  validate?: (value: string) => boolean | string | Promise<boolean | string>
}

type AutocompleteChoice<T> = {
  title: string
  value: T
}

const onSetupCancel = () => {
  error('Setup canceled.', 78)
}

export function useSquareMultiselectIndicator(): void {
  promptFigures.radioOn = '■'
  promptFigures.radioOff = '□'
}

export async function promptText(
  message: string,
  name: string,
  options: TextPromptOptions = {},
): Promise<string> {
  const answer = await prompts(
    {
      type: 'text',
      name,
      message,
      ...options,
    },
    {
      onCancel: onSetupCancel,
    },
  )

  const value = answer[name]
  return typeof value === 'string' ? value : ''
}

export async function promptConfirm(message: string, name: string): Promise<boolean> {
  const answer = await prompts(
    {
      type: 'confirm',
      name,
      message,
      initial: true,
    },
    {
      onCancel: onSetupCancel,
    },
  )

  return Boolean(answer[name])
}

export async function promptMultiselect<T extends string>(
  message: string,
  name: string,
  choices: Array<{ title: string; value: T }>,
): Promise<T[]> {
  const answer = await prompts(
    {
      type: 'multiselect',
      name,
      message,
      instructions: false,
      min: 1,
      choices,
    },
    {
      onCancel: onSetupCancel,
    },
  )

  const selected = answer[name]
  return Array.isArray(selected)
    ? selected.filter((value): value is T => typeof value === 'string')
    : []
}

export async function promptAutocomplete<T>(
  message: string,
  name: string,
  choices: AutocompleteChoice<T>[],
  onCancelMessage: string,
): Promise<T | undefined> {
  const answer = await prompts(
    {
      type: 'autocomplete',
      name,
      message,
      choices,
      suggest: async (input: string, options) => {
        const query = input.trim().toLowerCase()
        if (!query) {
          return options
        }

        return options.filter((option) => option.title.toLowerCase().includes(query))
      },
    },
    {
      onCancel: () => {
        error(onCancelMessage, 78)
      },
    },
  )

  return answer[name] as T | undefined
}
