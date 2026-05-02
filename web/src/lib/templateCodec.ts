/**
 * Parse / build Jinja template strings for "easy mode" inspector fields.
 * Plain text without `{{` is stored as-is (Jinja renders it unchanged).
 */

export type RedditSubredditsMode =
  | { mode: 'fixed'; text: string }
  | { mode: 'input'; key: string; fallback: string }

export function parseRedditSubreddits(raw: string): RedditSubredditsMode {
  const s = raw.trim()
  if (!raw.includes('{{')) return { mode: 'fixed', text: raw }

  const bare = /^\{\{\s*(\w+)\s*\}\}$/.exec(s)
  if (bare) return { mode: 'input', key: bare[1], fallback: '' }

  const defSingle = /^\{\{\s*(\w+)\s*\|\s*default\(\s*'([^']*)'\s*\)\s*\}\}$/.exec(s)
  if (defSingle) return { mode: 'input', key: defSingle[1], fallback: defSingle[2] }

  const defDouble =
    /^\{\{\s*(\w+)\s*\|\s*default\(\s*"((?:[^"\\]|\\.)*)"\s*\)\s*\}\}$/.exec(s)
  if (defDouble)
    return {
      mode: 'input',
      key: defDouble[1],
      fallback: defDouble[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\'),
    }

  return { mode: 'fixed', text: raw }
}

export function buildRedditSubreddits(m: RedditSubredditsMode): string {
  if (m.mode === 'fixed') return m.text
  if (!m.fallback.trim()) return `{{ ${m.key} }}`
  return `{{ ${m.key} | default(${JSON.stringify(m.fallback)}) }}`
}

export type SearchQueryMode =
  | { mode: 'literal'; text: string }
  | { mode: 'from_input'; key: string; tail: string }

export function parseSearchQueryParts(raw: string): SearchQueryMode {
  const t = raw.trimEnd()
  const m = /^\{\{\s*(\w+)\s*\}\}(.*)$/s.exec(t)
  if (m) return { mode: 'from_input', key: m[1], tail: m[2] }
  return { mode: 'literal', text: raw }
}

export function buildSearchQueryParts(m: SearchQueryMode): string {
  if (m.mode === 'literal') return m.text
  return `{{ ${m.key} }}${m.tail}`
}

export type UrlTemplateMode =
  | { mode: 'literal'; url: string }
  | { mode: 'input'; key: string }

export function parseUrlTemplate(raw: string): UrlTemplateMode {
  const s = raw.trim()
  const m = /^\{\{\s*(\w+)\s*\}\}$/.exec(s)
  if (m) return { mode: 'input', key: m[1] }
  return { mode: 'literal', url: raw }
}

export function buildUrlTemplate(m: UrlTemplateMode): string {
  if (m.mode === 'literal') return m.url
  return `{{ ${m.key} }}`
}

/** Ends with Topic / Brief wiring used by GPT Image easy-mode. */

const RE_TOPIC_SUFFIX = /\{\{\s*topic\s*\}\}\s*$/
const RE_BRIEF_SUFFIX = /\{\{\s*upstream\['brief'\]\['text'\]\s*\}\}\s*$/

export type ImagePromptSource = 'plain' | 'topic' | 'brief'

export interface ParsedImagePrompt {
  intro: string
  source: ImagePromptSource
}

/** Parse prompt_template — if unrecognized, treats whole string as freeform intro (`plain`). */
export function parseImagePrompt(raw: string): ParsedImagePrompt {
  const trimmed = raw.replace(/\s+$/, '')
  if (RE_BRIEF_SUFFIX.test(trimmed)) {
    const intro = trimmed.replace(RE_BRIEF_SUFFIX, '').trimEnd()
    return { intro, source: 'brief' }
  }
  if (RE_TOPIC_SUFFIX.test(trimmed)) {
    const intro = trimmed.replace(RE_TOPIC_SUFFIX, '').trimEnd()
    return { intro, source: 'topic' }
  }
  return { intro: raw, source: 'plain' }
}

export function buildImagePrompt(parts: ParsedImagePrompt): string {
  const intro = parts.intro.trimEnd()
  const brief = "{{ upstream['brief']['text'] }}"
  if (parts.source === 'brief')
    return intro ? `${intro}\n${brief}` : brief
  if (parts.source === 'topic') return intro ? `${intro}\n{{ topic }}` : '{{ topic }}'
  return parts.intro
}
