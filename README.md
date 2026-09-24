# OrgHub

[![Build](https://github.com/n0rm4l-me/orghub/actions/workflows/docker.yml/badge.svg)](https://github.com/n0rm4l-me/orghub/actions/workflows/docker.yml)
[![License: AGPL v3](https://img.shields.io/badge/license-AGPL--3.0-blue.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org)

Self-hosted employee portal for teams that want to own their intranet. News, events, polls, kudos, suggestions, and dining, in one app you run yourself.

## Contents

- [What's included](#whats-included)
- [Quick start](#quick-start)
- [Development](#development)
- [Stack](#stack)
- [Roadmap](#roadmap)
- [License](#license)

## What's included

**News and content**  
Rich text article editor, categories, pinned posts, reactions, threaded comments, view tracking.

**Events**  
Monthly calendar grid, upcoming events sidebar widget, event articles.

**Polls**  
Multiple-choice polls, embeddable in articles or standalone.

**Kudos**  
Employee recognition with a coin budget. Employees send kudos with a value tag; admin manages redemption types and a webhook-backed fulfilment flow.

**Suggestions**  
Anonymous or attributed suggestion box. Voting, threaded comments, status workflow, admin moderation.

**Dining**  
Multi-location cafeteria menus: weekly grid editor, dish library, fixed menus with modifier groups, nutrition params, allergen tags, operating hours.

**Notifications**  
Web Push (VAPID) for article and kudos events. In-app bell with unread badge.

**Translation**  
On-demand article translation via Hugging Face Inference API, DeepL, or MyMemory. Results cached in the database.

**Media**  
S3-compatible image library (MinIO or AWS S3). Images are reusable across all content.

**Admin**  
Dashboard, full CRUD for all content types, audit log, module toggles, user management, auth providers, appearance settings (brand colour, logo, layout, dark mode).

**Mobile REST API**  
JWT auth, article feed and detail, events, dining, translation.

**Access**  
Roles: admin, editor, viewer. Local passwords, LDAP/Active Directory, or Okta SSO. Rate limiting on auth endpoints. Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).

## Quick start

```bash
cp .env.example .env
# Set DATABASE_URL, AUTH_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD

docker compose up -d
```

Runs at `http://localhost:3000`. On first launch, run `npx prisma db seed` to create the admin account, then sign in and change the seeded password right away, it is not rotated automatically.

## Development

```bash
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

## Stack

Next.js 16, Prisma 7, PostgreSQL, Auth.js v5, Tiptap v3, Tailwind CSS v4.

## Roadmap

Known gaps, in-progress work, and planned improvements are tracked in [ROADMAP.md](ROADMAP.md).

## License

[AGPL-3.0](LICENSE)
