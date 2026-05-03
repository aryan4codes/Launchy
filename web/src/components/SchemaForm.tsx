/**
 * Lightweight JSON Schema (Pydantic v2 shapes) → form fields renderer.
 */

import type { ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'

import { EasyTemplateField } from '@/components/EasyTemplateField'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { NodeCatalogEntry } from '@/lib/nodeCatalog'
import { cn } from '@/lib/utils'

type JsonObj = Record<string, unknown>

function cloneConst<T>(x: T): T {
  if (x === null || typeof x !== 'object') return x
  try {
    return JSON.parse(JSON.stringify(x)) as T
  } catch {
    return x
  }
}

export interface SchemaFormProps {
  wfType: string
  catalog: NodeCatalogEntry
  schemaRaw: unknown
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  idPrefix?: string
}

function unwrapSchemaRoot(schemaRaw: unknown): JsonObj {
  if (!schemaRaw || typeof schemaRaw !== 'object') return {}
  const s = schemaRaw as JsonObj
  const { properties, type } = s
  if (type === 'object' && properties && typeof properties === 'object') return s
  return s
}

function resolveAnyOf(prop: JsonObj): { inner: JsonObj; nullable: boolean } {
  const anyOf = prop.anyOf as JsonObj[] | undefined
  if (!Array.isArray(anyOf) || anyOf.length === 0) return { inner: prop, nullable: false }

  const nullable = anyOf.some((b) => b && (b as JsonObj).type === 'null')
  const meaningful = anyOf.filter((b) => b && (b as JsonObj).type !== 'null')

  let inner: JsonObj = meaningful.length ? (meaningful[0] as JsonObj) : (anyOf[0] as JsonObj)
  const str = meaningful.find((b) => (b as JsonObj).type === 'string')
  const arr = meaningful.find((b) => (b as JsonObj).type === 'array')
  if ((inner as JsonObj).type === 'null' && str) inner = str as JsonObj
  if (arr && (inner.type === 'string' || inner.type === undefined)) inner = arr as JsonObj

  return { inner, nullable }
}

function propMeta(propUnknown: unknown): {
  inner: JsonObj
  nullable: boolean
  title: string
  enumVals: string[] | null
  type: string | undefined
} {
  const obj = propUnknown && typeof propUnknown === 'object' ? (propUnknown as JsonObj) : {}
  const { inner, nullable } = resolveAnyOf(obj)
  const title =
    typeof obj.title === 'string'
      ? obj.title
      : typeof inner.title === 'string'
        ? (inner.title as string)
        : ''
  let enumVals: string[] | null = null
  if (Array.isArray(inner.enum) && inner.enum.every((x) => typeof x === 'string'))
    enumVals = inner.enum as string[]
  let t: string | undefined
  const ty = inner.type
  if (typeof ty === 'string') t = ty
  return { inner, nullable, title, enumVals, type: t }
}

export function defaultsFromSchema(schemaRaw: unknown): Record<string, unknown> {
  const root = unwrapSchemaRoot(schemaRaw)
  const props = (root.properties as JsonObj | undefined) ?? {}
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(props)) {
    const p = props[key]
    const { inner, nullable, type } = propMeta(p)
    const d = inner.default
    if (d !== undefined) {
      out[key] = cloneConst(d as unknown)
    } else if (nullable && type === 'array') out[key] = null
    else if (type === 'boolean') out[key] = false
    else if (type === 'array') out[key] = []
    else if (type === 'string' && nullable) out[key] = ''
  }
  return out
}

export function mergedParams(
  schemaRaw: unknown,
  stored: Record<string, unknown>,
): Record<string, unknown> {
  return { ...defaultsFromSchema(schemaRaw), ...stored }
}

function TemplateHint({ fieldKey, catalog }: { fieldKey: string; catalog: NodeCatalogEntry }) {
  const templ = catalog.templateKeys?.includes(fieldKey)
  if (!templ) return null
  return (
    <span
      className="inline-flex shrink-0 text-muted-foreground"
      title="Composer steps can pull from your Topic or upstream blocks. Guided fields hide the syntax."
    >
      <HelpCircle className="h-3 w-3" aria-hidden />
    </span>
  )
}

export function SchemaForm({
  wfType,
  catalog,
  schemaRaw,
  value,
  onChange,
  idPrefix = 'field',
}: SchemaFormProps) {
  const root = unwrapSchemaRoot(schemaRaw)
  const propsRoot = root.properties as JsonObj | undefined
  const requiredArr = Array.isArray(root.required) ? (root.required as string[]) : []

  if (!propsRoot || Object.keys(propsRoot).length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No schema fields for <code className="text-foreground">{wfType}</code>.
      </p>
    )
  }

  const setKey = (k: string, v: unknown, opts?: { remove?: boolean }) => {
    const next = { ...value }
    if (opts?.remove) {
      delete next[k]
      onChange(next)
      return
    }
    next[k] = v as never
    onChange(next)
  }

  const sortedKeys = Object.keys(propsRoot).sort((a, b) => {
    const req = (k: string) => (requiredArr.includes(k) ? 0 : 1)
    if (req(a) !== req(b)) return req(a) - req(b)
    return a.localeCompare(b)
  })

  const advSet = new Set(catalog.inspectorAdvancedKeys ?? [])
  const primarySorted = sortedKeys.filter((k) => !advSet.has(k))
  const advancedSorted = sortedKeys.filter((k) => advSet.has(k))

  const renderPropField = (key: string): ReactNode => {
    const pid = `${idPrefix}-${key}`
    const propSchemaUnknown = propsRoot[key]
    const { inner, nullable, title, enumVals, type } = propMeta(propSchemaUnknown)

    const labelText = title || key
    const required = requiredArr.includes(key)
    const multiline =
      (catalog.longTextKeys?.includes(key) ?? false) ||
      ['template', 'task_description_template', 'expected_output', 'query_template'].includes(key)

    const curHas = Object.prototype.hasOwnProperty.call(value, key)
    const cur = curHas ? value[key] : inner.default

    const labelCls = 'flex items-center gap-2 text-[11px] font-medium text-muted-foreground'

    if (enumVals && enumVals.length)
      return (
        <div key={key} className="space-y-1.5">
          <div className={labelCls}>
            <label htmlFor={pid}>{labelText}</label>
            {required ? <Badge variant="outline">Required</Badge> : null}
            <TemplateHint fieldKey={key} catalog={catalog} />
          </div>
          <select
            id={pid}
            className={cn(
              'flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
            )}
            value={(cur ?? '') === null ? '' : String(cur ?? '')}
            onChange={(e) => setKey(key, e.target.value === '' && nullable ? null : e.target.value)}
          >
            {required ? (
              <option value="" disabled>
                Choose an option
              </option>
            ) : null}
            {!required && nullable ? <option value="">Default / auto</option> : null}
            {enumVals.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )

    if (type === 'boolean') {
      const checked = Boolean(cur)
      return (
        <label
          key={key}
          className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-card/50 p-2"
        >
          <input
            id={pid}
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input"
            checked={checked}
            onChange={(e) => setKey(key, e.target.checked)}
          />
          <span>
            <span className="text-sm font-medium text-foreground">{labelText}</span>
            <span className="mt-0.5 block text-[11px] text-muted-foreground">
              Toggle this handler option.
            </span>
          </span>
        </label>
      )
    }

    if (type === 'integer' || type === 'number') {
      const min =
        typeof inner.minimum === 'number'
          ? inner.minimum
          : typeof inner.exclusiveMinimum === 'number'
            ? inner.exclusiveMinimum
            : undefined
      const max =
        typeof inner.maximum === 'number'
          ? inner.maximum
          : typeof inner.exclusiveMaximum === 'number'
            ? inner.exclusiveMaximum
            : undefined
      const n = typeof cur === 'number' ? cur : cur === '' || cur === undefined ? '' : Number(cur)
      return (
        <div key={key} className="space-y-1.5">
          <div className={labelCls}>
            <label htmlFor={pid}>{labelText}</label>
            {required ? <Badge variant="outline">Required</Badge> : null}
            <TemplateHint fieldKey={key} catalog={catalog} />
          </div>
          <Input
            id={pid}
            type="number"
            min={min}
            max={max}
            step={type === 'integer' ? 1 : 'any'}
            value={typeof n === 'number' && !Number.isNaN(n) ? n : ''}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '' && !required) {
                setKey(key, null, { remove: true })
                return
              }
              const num = type === 'integer' ? parseInt(raw, 10) : parseFloat(raw)
              if (!Number.isNaN(num)) setKey(key, num)
            }}
          />
        </div>
      )
    }

    const easyKind = catalog.easyInspector?.[key]
    if (easyKind && type === 'string') {
      const strVal = cur === null || cur === undefined ? '' : String(cur)
      return (
        <div key={key} className="space-y-2">
          <div className={labelCls}>
            <span>{labelText}</span>
            {required ? <Badge variant="outline">Required</Badge> : null}
          </div>
          <EasyTemplateField
            kind={easyKind}
            value={strVal}
            idPrefix={pid}
            onChange={(next) => setKey(key, next)}
          />
        </div>
      )
    }

    if (type === 'array') {
      const items = inner.items as JsonObj | undefined
      const itemType = items?.type as string | undefined
      const arr = Array.isArray(cur) ? (cur.filter((x) => typeof x === 'string') as string[]) : []
      const text = arr.join(', ')
      if (itemType === 'string' || items === undefined || items === null)
        return (
          <div key={key} className="space-y-1.5">
            <div className={labelCls}>
              <label htmlFor={pid}>{labelText}</label>
              {required ? <Badge variant="outline">Required</Badge> : null}
              <TemplateHint fieldKey={key} catalog={catalog} />
            </div>
            <Input
              id={pid}
              placeholder="niche, platforms — comma-separated, or leave empty for all inputs"
              value={arr.length === 0 && nullable ? '' : text}
              onChange={(e) => {
                const raw = e.target.value.trim()
                if (raw === '' && nullable) setKey(key, null)
                else setKey(key, raw.split(',').map((x) => x.trim()).filter(Boolean))
              }}
            />
            <p className="text-[10px] text-muted-foreground">
              Empty + optional: pass the full workflow input object downstream.
            </p>
          </div>
        )
      return (
        <div key={key} className="space-y-1">
          <label className={labelCls} htmlFor={pid}>
            {labelText}
          </label>
          <Textarea id={pid} value={JSON.stringify(cur ?? [], null, 2)} readOnly spellCheck={false} />
          <p className="text-[10px] text-muted-foreground">
            This value is kept as saved—there isn&apos;t a guided editor for this shape yet.
          </p>
        </div>
      )
    }

    const sval = cur === null || cur === undefined ? '' : String(cur)
    const FieldEl = multiline ? Textarea : Input
    return (
      <div key={key} className="space-y-1.5">
        <div className={labelCls}>
          <label htmlFor={pid}>{labelText}</label>
          {required ? <Badge variant="outline">Required</Badge> : null}
          <TemplateHint fieldKey={key} catalog={catalog} />
        </div>
        <FieldEl
          id={pid}
          className={cn(multiline && 'min-h-[100px] font-mono text-[12px] leading-relaxed')}
          value={sval}
          onChange={(e) => setKey(key, e.target.value)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {primarySorted.map((key) => renderPropField(key))}
      {advancedSorted.length > 0 ? (
        <details className="rounded-lg border border-border/70 bg-muted/15 px-3 py-2 [&_summary]:select-none">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            {catalog.inspectorAdvancedSummary ?? 'Advanced options'}
          </summary>
          <div className="mt-3 space-y-4 border-t border-border/60 pt-3">
            {advancedSorted.map((key) => renderPropField(key))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
