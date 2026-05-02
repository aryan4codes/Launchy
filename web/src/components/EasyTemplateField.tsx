import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { EasyInspectorField } from '@/lib/nodeCatalog'
import {
  buildRedditSubreddits,
  buildSearchQueryParts,
  buildUrlTemplate,
  parseRedditSubreddits,
  parseSearchQueryParts,
  parseUrlTemplate,
} from '@/lib/templateCodec'
import { cn } from '@/lib/utils'

const PRESET_INPUT_KEYS = ['niche', 'subreddits', 'platforms', 'topic', 'query', 'url', 'hook', 'angle'] as const

function selectClass() {
  return cn(
    'flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
  )
}

function GeneratedSnippet({ value }: { value: string }) {
  return (
    <details className="rounded-md border border-border/80 bg-muted/20 px-2 py-1.5 text-[10px] text-muted-foreground">
      <summary className="cursor-pointer select-none font-medium text-foreground/80">Saved value (auto-built)</summary>
      <code className="mt-1 block whitespace-pre-wrap break-all font-mono text-[10px] text-emerald-800 dark:text-emerald-400/90">{value || '—'}</code>
    </details>
  )
}

function RedditEasy({ value, onChange, idPrefix }: { value: string; onChange: (s: string) => void; idPrefix: string }) {
  const parsed = useMemo(() => parseRedditSubreddits(value), [value])
  const listId = `${idPrefix}-reddit-list`
  const keySel = `${idPrefix}-reddit-key`
  const fallbackId = `${idPrefix}-reddit-fallback`
  const customKeyId = `${idPrefix}-reddit-custom-key`

  const inputKey = parsed.mode === 'input' ? parsed.key : 'niche'
  const isPreset = PRESET_INPUT_KEYS.includes(inputKey as (typeof PRESET_INPUT_KEYS)[number])
  const displayKey = isPreset ? inputKey : 'custom'
  const customKeyValue = isPreset ? '' : inputKey

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Use a comma-separated list of subreddits, <span className="text-foreground/90">or</span> bind to whatever you type when you run the workflow (e.g. the &quot;subreddits&quot; field).
      </p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/30 p-1">
        <Button
          type="button"
          size="sm"
          variant={parsed.mode === 'fixed' ? 'secondary' : 'ghost'}
          className="h-8 flex-1 text-xs"
          onClick={() =>
            onChange(
              buildRedditSubreddits({
                mode: 'fixed',
                text: parsed.mode === 'fixed' ? parsed.text : 'Entrepreneur, SaaS, technology',
              }),
            )
          }
        >
          Fixed list
        </Button>
        <Button
          type="button"
          size="sm"
          variant={parsed.mode === 'input' ? 'secondary' : 'ghost'}
          className="h-8 flex-1 text-xs"
          onClick={() =>
            onChange(
              buildRedditSubreddits({
                mode: 'input',
                key: parsed.mode === 'input' ? parsed.key : 'subreddits',
                fallback: parsed.mode === 'input' ? parsed.fallback : 'Entrepreneur,SaaS,technology',
              }),
            )
          }
        >
          From run inputs
        </Button>
      </div>

      {parsed.mode === 'fixed' ? (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor={listId}>
            Subreddit names
          </label>
          <Input
            id={listId}
            placeholder="e.g. SaaS, Entrepreneur, startups"
            value={parsed.text}
            onChange={(e) =>
              onChange(buildRedditSubreddits({ mode: 'fixed', text: e.target.value }))
            }
          />
          <p className="text-[10px] text-muted-foreground">No special syntax needed — we save this exactly as typed.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor={keySel}>
              Which run input holds the subreddit list?
            </label>
            <select
              id={keySel}
              className={selectClass()}
              value={displayKey}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'custom') {
                  onChange(
                    buildRedditSubreddits({
                      mode: 'input',
                      key: customKeyValue || 'my_input',
                      fallback: parsed.mode === 'input' ? parsed.fallback : '',
                    }),
                  )
                  return
                }
                onChange(
                  buildRedditSubreddits({
                    mode: 'input',
                    key: v,
                    fallback: parsed.mode === 'input' ? parsed.fallback : '',
                  }),
                )
              }}
            >
              <option value="subreddits">subreddits (recommended)</option>
              <option value="niche">niche</option>
              <option value="platforms">platforms</option>
              <option value="topic">topic</option>
              <option value="query">query</option>
              <option value="url">url</option>
              <option value="hook">hook</option>
              <option value="angle">angle</option>
              <option value="custom">Custom key…</option>
            </select>
          </div>

          {(displayKey === 'custom' || !isPreset) && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor={customKeyId}>
                Custom input name
              </label>
              <Input
                id={customKeyId}
                placeholder="letters, numbers, underscore"
                className="font-mono text-xs"
                value={customKeyValue || (parsed.mode === 'input' ? parsed.key : '')}
                onChange={(e) => {
                  const k = e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                  onChange(
                    buildRedditSubreddits({
                      mode: 'input',
                      key: k || 'input',
                      fallback: parsed.mode === 'input' ? parsed.fallback : '',
                    }),
                  )
                }}
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor={fallbackId}>
              If that input is empty at run time, use this list instead
            </label>
            <Input
              id={fallbackId}
              placeholder="e.g. AskReddit"
              value={parsed.mode === 'input' ? parsed.fallback : ''}
              onChange={(e) =>
                onChange(
                  buildRedditSubreddits({
                    mode: 'input',
                    key: parsed.mode === 'input' ? parsed.key : 'subreddits',
                    fallback: e.target.value,
                  }),
                )
              }
            />
          </div>
        </div>
      )}

      <GeneratedSnippet value={value} />
    </div>
  )
}

function SearchQueryEasy({ value, onChange, idPrefix }: { value: string; onChange: (s: string) => void; idPrefix: string }) {
  const parsed = useMemo(() => parseSearchQueryParts(value), [value])
  const litId = `${idPrefix}-sq-lit`
  const keyId = `${idPrefix}-sq-key`
  const tailId = `${idPrefix}-sq-tail`
  const customKeyId = `${idPrefix}-sq-custom`

  const qKey = parsed.mode === 'from_input' ? parsed.key : 'niche'
  const isPreset = PRESET_INPUT_KEYS.includes(qKey as (typeof PRESET_INPUT_KEYS)[number])
  const displayKey = isPreset ? qKey : 'custom'
  const customKeyVal = isPreset ? '' : qKey

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Type a normal search sentence, or build one from a run field such as <span className="font-mono text-foreground/80">niche</span> plus extra words
        (e.g. &quot; problems and trends&quot;).
      </p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/30 p-1">
        <Button
          type="button"
          size="sm"
          variant={parsed.mode === 'literal' ? 'secondary' : 'ghost'}
          className="h-8 flex-1 text-xs"
          onClick={() =>
            onChange(
              buildSearchQueryParts({
                mode: 'literal',
                text: parsed.mode === 'literal' ? parsed.text : 'AI SaaS trends',
              }),
            )
          }
        >
          Custom text
        </Button>
        <Button
          type="button"
          size="sm"
          variant={parsed.mode === 'from_input' ? 'secondary' : 'ghost'}
          className="h-8 flex-1 text-xs"
          onClick={() =>
            onChange(
              buildSearchQueryParts({
                mode: 'from_input',
                key: parsed.mode === 'from_input' ? parsed.key : 'niche',
                tail: parsed.mode === 'from_input' ? parsed.tail : ' problems and trends',
              }),
            )
          }
        >
          From run input + words
        </Button>
      </div>

      {parsed.mode === 'literal' ? (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor={litId}>
            Search query
          </label>
          <Textarea
            id={litId}
            rows={3}
            className="text-sm"
            value={parsed.text}
            onChange={(e) => onChange(buildSearchQueryParts({ mode: 'literal', text: e.target.value }))}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor={keyId}>
              Run input to insert
            </label>
            <select
              id={keyId}
              className={selectClass()}
              value={displayKey}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'custom') {
                  onChange(
                    buildSearchQueryParts({
                      mode: 'from_input',
                      key: customKeyVal || 'niche',
                      tail: parsed.mode === 'from_input' ? parsed.tail : '',
                    }),
                  )
                  return
                }
                onChange(
                  buildSearchQueryParts({
                    mode: 'from_input',
                    key: v,
                    tail: parsed.mode === 'from_input' ? parsed.tail : '',
                  }),
                )
              }}
            >
              <option value="niche">niche</option>
              <option value="subreddits">subreddits</option>
              <option value="topic">topic</option>
              <option value="query">query</option>
              <option value="platforms">platforms</option>
              <option value="custom">Custom key…</option>
            </select>
          </div>
          {(displayKey === 'custom' || !isPreset) && (
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground" htmlFor={customKeyId}>
                Custom input name
              </label>
              <Input
                id={customKeyId}
                className="font-mono text-xs"
                value={customKeyVal || (parsed.mode === 'from_input' ? parsed.key : '')}
                onChange={(e) => {
                  const k = e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                  onChange(
                    buildSearchQueryParts({
                      mode: 'from_input',
                      key: k || 'niche',
                      tail: parsed.mode === 'from_input' ? parsed.tail : '',
                    }),
                  )
                }}
              />
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground" htmlFor={tailId}>
              Text after that field (spaces matter)
            </label>
            <Input
              id={tailId}
              placeholder=" e.g.  problems and trends"
              value={parsed.mode === 'from_input' ? parsed.tail : ''}
              onChange={(e) =>
                onChange(
                  buildSearchQueryParts({
                    mode: 'from_input',
                    key: parsed.mode === 'from_input' ? parsed.key : 'niche',
                    tail: e.target.value,
                  }),
                )
              }
            />
          </div>
        </div>
      )}

      <GeneratedSnippet value={value} />
    </div>
  )
}

function UrlEasy({ value, onChange, idPrefix }: { value: string; onChange: (s: string) => void; idPrefix: string }) {
  const parsed = useMemo(() => parseUrlTemplate(value), [value])
  const urlId = `${idPrefix}-url-lit`
  const keyId = `${idPrefix}-url-key`
  const customKeyId = `${idPrefix}-url-custom`

  const uKey = parsed.mode === 'input' ? parsed.key : 'url'
  const isPreset = PRESET_INPUT_KEYS.includes(uKey as (typeof PRESET_INPUT_KEYS)[number])
  const displayKey = isPreset ? uKey : 'custom'
  const customKeyVal = isPreset ? '' : uKey

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-snug text-muted-foreground">
        Paste a full https:// link, or pick a run input that will contain the URL when you click Run.
      </p>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/30 p-1">
        <Button
          type="button"
          size="sm"
          variant={parsed.mode === 'literal' ? 'secondary' : 'ghost'}
          className="h-8 flex-1 text-xs"
          onClick={() =>
            onChange(
              buildUrlTemplate({
                mode: 'literal',
                url: parsed.mode === 'literal' ? parsed.url : 'https://example.com',
              }),
            )
          }
        >
          Full URL
        </Button>
        <Button
          type="button"
          size="sm"
          variant={parsed.mode === 'input' ? 'secondary' : 'ghost'}
          className="h-8 flex-1 text-xs"
          onClick={() =>
            onChange(buildUrlTemplate({ mode: 'input', key: parsed.mode === 'input' ? parsed.key : 'url' }))
          }
        >
          From run input
        </Button>
      </div>

      {parsed.mode === 'literal' ? (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor={urlId}>
            Page URL
          </label>
          <Input
            id={urlId}
            className="font-mono text-xs"
            placeholder="https://…"
            value={parsed.url}
            onChange={(e) => onChange(buildUrlTemplate({ mode: 'literal', url: e.target.value }))}
          />
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor={keyId}>
            Run input containing the URL
          </label>
          <select
            id={keyId}
            className={selectClass()}
            value={displayKey}
            onChange={(e) => {
              const v = e.target.value
              if (v === 'custom') {
                onChange(buildUrlTemplate({ mode: 'input', key: customKeyVal || 'url' }))
                return
              }
              onChange(buildUrlTemplate({ mode: 'input', key: v }))
            }}
          >
            <option value="url">url</option>
            <option value="query">query</option>
            <option value="niche">niche</option>
            <option value="topic">topic</option>
            <option value="custom">Custom key…</option>
          </select>
          {(displayKey === 'custom' || !isPreset) && (
            <Input
              id={customKeyId}
              className="font-mono text-xs"
              placeholder="input key"
              value={customKeyVal || (parsed.mode === 'input' ? parsed.key : '')}
              onChange={(e) => {
                const k = e.target.value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                onChange(buildUrlTemplate({ mode: 'input', key: k || 'url' }))
              }}
            />
          )}
        </div>
      )}

      <GeneratedSnippet value={value} />
    </div>
  )
}

export function EasyTemplateField({
  kind,
  value,
  onChange,
  idPrefix,
}: {
  kind: EasyInspectorField
  value: string
  onChange: (next: string) => void
  idPrefix: string
}) {
  if (kind === "reddit_subreddits") return <RedditEasy value={value} onChange={onChange} idPrefix={idPrefix} />
  if (kind === "search_query_parts")
    return <SearchQueryEasy value={value} onChange={onChange} idPrefix={idPrefix} />
  if (kind === "url_or_input") return <UrlEasy value={value} onChange={onChange} idPrefix={idPrefix} />
  return null
}
