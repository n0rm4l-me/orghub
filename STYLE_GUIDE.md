# OrgHub UI Style Guide

Reference for AI agents and contributors. Follow these patterns exactly — do not introduce new ones without updating this file.

---

## Admin tables

### Column alignment

| Column type | Header | Cell |
|---|---|---|
| Primary text (title, message, name) | `text-left` | default (left) |
| Descriptive text (What, Path) | `text-left` | default (left) |
| Dates (date, timestamp — may be multi-line) | `text-left` | default (left) |
| Short metadata (status, category, role, provider, count, yes/no) | `text-center` | `text-center` on `<td>` |
| Icon-only header (views, pin, star) | `text-center` + `mx-auto` on icon | `text-center` on `<td>` |
| Actions | `text-right` | flex container (see below) |

### Actions cell

Always use a flex container — never `text-right` directly on `<td>`:

```tsx
<td className="px-5 py-3">
  <div className="flex items-center justify-end gap-1.5">
    <Link href="..." aria-label="Edit ..." className="grid size-7 place-items-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700">
      <Pencil className="size-3.5" aria-hidden />
    </Link>
    <DeleteButton entity="..." name={...} onDelete={...} variant="icon" />
  </div>
</td>
```

### colgroup — every column must have a `<col>` entry

With `table-fixed`, unspecified columns share remaining width with other auto columns. Always declare every column, including Actions:

```tsx
<colgroup>
  <col />              {/* title — auto (takes remaining space) */}
  <col className="w-44" />   {/* date */}
  <col className="w-36" />   {/* location */}
  <col className="w-28" />   {/* status */}
  <col className="w-20" />   {/* actions */}
</colgroup>
```

A missing `<col>` for the Actions column causes it to steal width from auto columns and makes the gap between the last data column and the action icons appear oversized.

### Location / long text cells

Use a block flex container so `truncate` has a fixed parent width to measure against. `inline-flex` is not constrained by the cell width and may not truncate reliably:

```tsx
<td className="px-5 py-3">
  <span className="flex min-w-0 items-center gap-1 text-xs text-gray-500">
    <Icon className="size-3 shrink-0" aria-hidden />
    <span className="truncate" title={fullText}>{fullText}</span>
  </span>
</td>
```

### Table wrapper

```tsx
<div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
  <table className="w-full table-fixed">
    <colgroup>...</colgroup>
    <thead>
      <tr className="border-b border-gray-100 text-xs font-semibold tracking-wide text-gray-400 uppercase">
        ...
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-100 [&_td]:align-top">
      {items.map(item => (
        <tr key={item.id} className="group transition-colors hover:bg-gray-50/70">
          ...
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

`[&_td]:align-top` is required on every `<tbody>`. Without it, icon-only cells (pin, star, actions) in a multi-line row vertically center relative to the full row height, making them appear misaligned with the first line of text.

### Cell padding

Standard: `px-5 py-3`. Icon-only columns (pin, star): `px-1 py-3`.

### Status badges / StatusToggle

`StatusToggle` is centered with `text-center` on the `<td>`. It renders as an inline element.

### Row hover

Always `hover:bg-gray-50/70` on `<tr>` with `transition-colors`. Add `group` when child elements react to row hover.

---

## Forms and settings panels

### Section heading

```tsx
<h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
  Section name
</h2>
```

### Panel (bordered card for a single setting)

```tsx
<Panel>
  <div className="flex items-center justify-between gap-6">
    <div>
      <p className="text-sm font-medium text-gray-900">Setting name</p>
      <p className="mt-0.5 text-xs text-gray-500">Description.</p>
    </div>
    <ToggleOrControl />
  </div>
</Panel>
```

### Settings page layout

Wrap the entire page (including `<PageHeader>`) in `max-w-3xl space-y-10`. Do not create nested width containers — all sections sit at the same level.

```tsx
<div className="max-w-3xl space-y-10">
  <PageHeader title="..." description="..." />
  <section>...</section>
  <section>...</section>
</div>
```

---

## Buttons

### Primary action (CTA in PageHeader)

```tsx
<Link
  href="/admin/.../new"
  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-medium text-white transition hover:brightness-95 active:brightness-90"
>
  <Plus className="size-4" aria-hidden />
  New item
</Link>
```

### Secondary action (outline)

```tsx
<Link
  href="..."
  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
>
  Label
</Link>
```

### Icon button (in Actions cell)

```tsx
<button
  aria-label="Action description"
  className="grid size-7 place-items-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
>
  <Icon className="size-3.5" aria-hidden />
</button>
```

---

## Typography

| Use | Class |
|---|---|
| Page title | `PageHeader` component |
| Section heading | `text-sm font-semibold uppercase tracking-wide text-gray-400` |
| Table header | `text-xs font-semibold tracking-wide text-gray-400 uppercase` (on `<tr>`) |
| Primary cell text | `text-sm font-medium text-gray-900` |
| Secondary cell text | `text-xs text-gray-400` |
| Monospace (paths, IPs) | `font-mono text-xs text-gray-400` |
| Truncated cell | `truncate` on `<td>` or inner element |

---

## Colors

All brand-color references use `bg-brand`, `text-brand`, `ring-brand`, `focus:ring-brand/20`. Never hardcode hex in JSX — use the CSS variable set by `--brand` in `<style>` from settings.

Status colors:
- Active / Published: `bg-emerald-500` dot, `text-gray-600`
- Disabled / Draft: `bg-red-400` dot, `text-red-600`
- Pending / Scheduled: `bg-amber-400` dot, `text-gray-600`

---

## Icons

Library: `lucide-react`. Always add `aria-hidden` to decorative icons. Use `aria-label` on icon-only buttons. Standard sizes:

| Context | Class |
|---|---|
| Button icon | `size-4` |
| Cell icon button | `size-3.5` |
| Table header icon | `size-3.5` |
| Inline indicator | `size-3` |
| Avatar fallback | — |

---

## Empty states

```tsx
<EmptyState
  icon={IconComponent}
  title="No items yet"
  description="Short explanation of what items are for."
  action={{ label: "Create first item", href: "/admin/.../new" }}
/>
```

When filtering is active and returns nothing:

```tsx
<EmptyState
  icon={IconComponent}
  title="Nothing matched"
  description="Try a different search term or clear the status filter."
  action={{ label: "Show all items", href: "/admin/..." }}
/>
```

---

## Page structure (admin list pages)

```tsx
export default async function AdminXxxPage({ searchParams }) {
  await requireRole("EDITOR")  // or "ADMIN"
  // ...data fetching...
  return (
    <div>
      <PageHeader title="..." description="N published · M drafts" action={<NewButton />} />
      <AdminFilters basePath="/admin/..." query={query} status={status} placeholder="Search ..." />
      {total === 0 ? (
        <EmptyState ... />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table>...</table>
        </div>
      )}
      {total > PER_PAGE && <TablePagination ... />}
    </div>
  )
}
```

Settings pages use `max-w-3xl space-y-10` wrapper instead of `<div>`.
