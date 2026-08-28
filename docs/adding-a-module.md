# Adding a new module

Checklist based on the Kudos module implementation. Follow this order to avoid
missing wiring and "Invalid widget placement" / "Invalid nav item" errors.

---

## 1. Prisma schema

- Add new models and relations to `prisma/schema.prisma`
- Add any settings fields to the `SiteSettings` model (e.g. `kudosLayout String @default("content")`)
- Create a migration file: `prisma/migrations/YYYYMMDDHHMMSS_<name>/migration.sql`
- Apply it locally: `DATABASE_URL=... npx prisma migrate deploy`
- Regenerate the client: `npx prisma generate`

## 2. Module registry

`src/lib/modules.ts`: add the module entry:

```ts
myModule: {
  id: "myModule" as const,
  label: "My Module",
  description: "...",
},
```

## 3. Server-action guards (settings.ts)

`src/lib/actions/settings.ts` has three hardcoded sets. Update ALL of them:

| Const | What to add | Error if missing |
|---|---|---|
| `SIDEBAR_BLOCK_IDS` | widget ID (e.g. `"myWidget"`) | "Invalid widget placement" on save |
| `NAV_ITEM_IDS` | module ID (e.g. `"myModule"`) | Module missing from Navigation admin |
| `VALID_LAYOUTS` | already covers all layouts, no change needed |
| `saveLayout` function | add `myModuleLayout` field: read from formData, validate, upsert, audit | Layout not saved |

## 4. Layout

- `prisma/schema.prisma`: add `myModuleLayout String @default("content")` to `SiteSettings`
- `src/components/layout-form.tsx`: add prop + conditional `<LayoutPicker>` (guarded by `enabledModules.has("myModule")`)
- `src/app/admin/appearance/page.tsx`: pass the new prop to `<LayoutForm>`
- Module portal page: read `settings.myModuleLayout`, compute `showLeft`/`showRight`, render with `<SidebarBlocks>` and sidebar fetch (quickLinks, categories, upcomingEvents, activePoll, topKudos as needed)

## 5. Sidebar widget

- `src/components/sidebar-widgets-form.tsx`: add to `ALL_WIDGETS`
- `src/components/sidebar-blocks.tsx`: add the block rendering case
- `src/app/(portal)/page.tsx`: fetch widget data, pass to all `<SidebarBlocks>` calls (there are three: left, right, mobile)

## 6. Navigation

- `src/components/header.tsx`: add to `NAV_META`
- `src/components/admin-nav.tsx`: add `ITEM` const and spread into the nav array
- `src/app/admin/layout.tsx`: fetch `<moduleId>Enabled` and pass to `AdminNav` and `AdminMobileSidebar`
- `src/components/admin-mobile-sidebar.tsx`: add prop and pass through
- `src/app/admin/navigation/page.tsx`: add to `MODULE_META` and `allModuleIds` array

## 7. Admin UI

- `src/app/admin/modules/page.tsx`: add icon to `MODULE_ICONS`
- `src/app/admin/modules/[id]/page.tsx`: add `mod.id === "myModule"` block with settings form and links
- Create `src/app/admin/myModule/page.tsx` (list/management page)
- Create `src/components/myModule-settings-form.tsx` if there are settings

## 8. Portal page

- Create `src/app/(portal)/myModule/page.tsx`
- Guard with `if (!enabled.has("myModule")) notFound()`
- Use `kudosLayout` pattern for sidebar support (see `src/app/(portal)/kudos/page.tsx`)
- Add dark mode variants to all cards: `dark:bg-gray-800 dark:border-gray-700 dark:text-gray-*`

## 9. Audit log

`src/lib/audit.ts`: add action strings (e.g. `"myModule.create"`, `"settings.myModule"`)

---

## Common mistakes

- Forgetting `SIDEBAR_BLOCK_IDS` or `NAV_ITEM_IDS` in `settings.ts`: the UI shows the option but saving fails silently or with a generic error.
- Forgetting `kudosLayout` (or equivalent) in `saveLayout`: the layout dropdown appears but saving ignores the new field.
- Not applying the migration before container start: app crashes with `PrismaClientKnownRequestError: column does not exist`.
- Using `podman build .` instead of tar pipe when the VM can't access host paths.
- Using `orghub:latest` tag: always use a date-based tag like `orghub:YYYYNNN`.
- Running `podman run` without `--network orghub-net`: container starts but cannot reach the database.
