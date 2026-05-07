---
name: launchy-marketing-surfaces
description: >-
  Launchy marketing and creator-facing web: landing hero, Digital Twin copy,
  /campaigns parity, and README screenshot outputs/landing.png. Use when
  editing LandingPage, Campaign* pages, navbar/CTAs, or docs that show the
  product UI.
---

# Launchy marketing surfaces

## When this applies

- Editing **`web/src/pages/LandingPage.tsx`** (marketing `/`).
- Editing **`web/src/pages/CampaignLandingPage.tsx`** or **`CampaignPage.tsx`** (`/campaigns`).
- Updating **README** or **screenshots** for the product funnel.
- Choosing **user-facing wording** (Digital Twin vs internal `avcm` / pipeline terms).

## Canonical references

- **Hero screenshot**: [`outputs/landing.png`](../../../outputs/landing.png) — keep README in sync when the hero changes materially.
- **Routes**: Primary creator CTA → **`/campaigns`**; Workflow Studio → **`/studio`**; marketing home **`/`**.
- **Language**: Prefer **Digital Twin** on marketing and creator flows; CLI/API filenames and `RunConfig` stay as-is.

## Visual consistency

- Match **LandingPage** tokens: warm `#fdf7ee` (light), `dark:bg-background`, gradient primary CTA, pills/chips, **`ThemeToggle`**, Studio link in header.
- See `.cursor/rules/creator-surfaces.mdc` for API rules (`POST /creator-runs`, no raw `workflow_id` from creator pages).

## Do not

- Surface raw workflow JSON on creator paths (guided fields only).
- Introduce duplicate entry routes for “starting” a creator run aside from **`/campaigns`**.
