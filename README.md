# OrgHub

Open source self-hosted employee portal. News, announcements, and pages for your company.

## Features

- News feed with categories
- Rich text article editor (Tiptap)
- Static pages (CMS-managed)
- Role-based access: admin, editor, viewer
- SSO via Okta, Google, or any OIDC provider
- PWA: installable on mobile, works offline
- Self-hosted with Docker Compose

## Quick start

```bash
cp .env.example .env
# Edit .env with your settings

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

- [Next.js 14](https://nextjs.org) (App Router)
- [Prisma](https://prisma.io) + PostgreSQL
- [Auth.js v5](https://authjs.dev)
- [Tiptap](https://tiptap.dev)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS

## License

[AGPL-3.0](LICENSE)
