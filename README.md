# OrgHub

Open-source self-hosted employee portal. News feed, events calendar, wiki pages, and a full-featured CMS for your intranet.

## Features

**Content**
- News feed with categories, full-text search, pagination, and pinned hero cards
- Rich text article editor (Tiptap): headings, lists, code blocks, inline images
- Cover images, excerpts, and per-article "Important" flag
- Article reactions (likes) and threaded comments
- Unique view tracking: per-user read counts, view counter on the article page
- Events calendar: monthly grid, sidebar widget, article reader banner, and feed integration
- Site-wide announcement banners with configurable schedule, colour, and call-to-action link
- CMS-managed static pages with one-level parent/child hierarchy and dropdown navigation

**Appearance**
- Branding: site name, two logo slots (header and sign-in screen), live preview
- Brand colour picker: 8 presets plus custom hex input, live preview
- Portal width: narrow (1024 px), default (1152 px), wide (1280 px)
- Feed layout: content only, right sidebar, left sidebar, or both sidebars
- Feed card style: title only, title with description, or with thumbnail preview
- Configurable articles-per-page: 5 / 10 / 15 / 20 / 25 / 30
- Sidebar widget placement with separate left and right columns

**Admin**
- Dashboard with stats: total articles, reactions, comments, views, and most-read articles
- Full CRUD for articles, pages, categories, quick links, navigation, announcements, users
- Audit log for all content and settings changes, with filter tabs
- Module system: events and pages can be toggled on/off per instance
- Auth providers page: shows Okta configuration and local password status
- Skeleton loading states on all admin routes; error boundaries in portal and admin shells

**Access and deployment**
- Role-based access: admin, editor, viewer
- Local password auth with bcrypt and timing-safe login
- Active Directory / LDAP auth via service-account bind + user-bind verify
- SSO via Okta, Google, or any OIDC provider
- Self-hosted with Docker Compose
- Health endpoint at `/api/health` for Kubernetes liveness/readiness probes
- PWA: installable on mobile

## Quick start

```bash
cp .env.example .env
# Edit .env: DATABASE_URL, NEXTAUTH_SECRET, and optional SSO settings

docker compose up -d
```

App runs at http://localhost:3000. Default admin: `admin@orghub.dev` / `admin`.

## Development

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Tech stack

- [Next.js 16](https://nextjs.org) with App Router and React Server Components
- [Prisma 7](https://prisma.io) + PostgreSQL
- [Auth.js v5](https://authjs.dev)
- [Tiptap v3](https://tiptap.dev)
- [Tailwind CSS v4](https://tailwindcss.com)

## License

[AGPL-3.0](LICENSE)
