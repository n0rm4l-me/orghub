# OrgHub

Open source self-hosted employee portal. News feed, events calendar, and CMS-managed pages for your company.

## Features

- News feed with categories, search, and pagination
- Rich text article editor (Tiptap)
- Pin one article as the permanent featured story
- Events calendar: monthly grid, sidebar widget, event badges in the feed
- CMS-managed static pages
- Configurable sidebar section order
- Soft-plugin system: optional modules (events) can be toggled on/off per instance
- Role-based access: admin, editor, viewer
- SSO via Okta, Google, or any OIDC provider
- Audit log for all content and settings changes
- PWA: installable on mobile, works offline
- Self-hosted with Docker Compose

## Quick start

```bash
cp .env.example .env
# Edit .env with your database URL and auth settings

docker compose up -d
```

App runs at http://localhost:3000

## Development

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npm run dev
```

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, React Server Components)
- [Prisma](https://prisma.io) + PostgreSQL
- [Auth.js v5](https://authjs.dev)
- [Tiptap](https://tiptap.dev)
- [Tailwind CSS v4](https://tailwindcss.com)

## License

[AGPL-3.0](LICENSE)
