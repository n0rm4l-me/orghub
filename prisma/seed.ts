import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@orghub.dev"
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin"

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

  const admin = await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    // The hash is refreshed on re-seed so rotating SEED_ADMIN_PASSWORD takes effect.
    update: { passwordHash },
    create: {
      email: ADMIN_EMAIL,
      name: "Admin User",
      role: "ADMIN",
      provider: "local",
      passwordHash,
    },
  })

  const engineering = await db.category.upsert({
    where: { slug: "engineering" },
    update: {},
    create: { name: "Engineering", slug: "engineering" },
  })

  const hr = await db.category.upsert({
    where: { slug: "hr" },
    update: {},
    create: { name: "HR", slug: "hr" },
  })

  const announcements = await db.category.upsert({
    where: { slug: "announcements" },
    update: {},
    create: { name: "Announcements", slug: "announcements" },
  })

  const events = await db.category.upsert({
    where: { slug: "events" },
    update: {},
    create: { name: "Events", slug: "events" },
  })

  const articles = [
    {
      title: "New Office Opening in Osaka — Join Us for the Celebration!",
      slug: "osaka-office-opening",
      excerpt: "We're thrilled to announce the opening of our new Osaka office. All employees are invited to the celebration event on September 5th.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "We're thrilled to announce the opening of our new Osaka office. All employees are invited to the celebration event on September 5th." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What to expect" }] },
          { type: "paragraph", content: [{ type: "text", text: "The new office features 3 floors, 200 workstations, 2 large meeting rooms, and a rooftop terrace. The celebration will include a guided tour, refreshments, and a welcome speech from our CEO." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "How to attend" }] },
          { type: "paragraph", content: [{ type: "text", text: "Register through the HR portal by August 30th. Shuttle buses will depart from the Tokyo office at 9am." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-20"),
      categoryId: announcements.id,
    },
    {
      title: "Migrating from HAProxy to Istio: Lessons Learned",
      slug: "haproxy-to-istio-migration",
      excerpt: "After six months of work, our infrastructure team has completed the migration. Here's what we learned and what we'd do differently.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "After six months of work, our infrastructure team has completed the migration from HAProxy to Istio service mesh. Here's what we learned, what broke, and what we'd do differently." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why we migrated" }] },
          { type: "paragraph", content: [{ type: "text", text: "HAProxy served us well for three years, but as our microservices count grew past 80 services, manual config updates became a bottleneck. Every new service required a PR to the Ansible repo, a review, and a deploy cycle." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The passthrough approach" }] },
          { type: "paragraph", content: [{ type: "text", text: "We used a passthrough backend strategy: HAProxy forwards to Istio IngressGateway on port 31900. This let us migrate service by service without a big-bang cutover." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key lessons" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Always test in pre environment first" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "EnvoyFilter for custom headers is complex but powerful" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monitor canary traffic closely during cutover" }] }] },
          ]},
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-25"),
      categoryId: engineering.id,
    },
    {
      title: "Q3 Performance Review Schedule Now Available",
      slug: "q3-performance-review-schedule",
      excerpt: "All performance review sessions are now booked through the HR system. Reminders will be sent one week before each session.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "All Q3 performance review sessions are now scheduled. You should have received a calendar invite. If you haven't, please contact HR." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Schedule overview" }] },
          { type: "paragraph", content: [{ type: "text", text: "Reviews will take place September 8–19. Each session is 60 minutes. Self-assessments are due by September 5th." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-24"),
      categoryId: hr.id,
    },
    {
      title: "Tech Talk: AI in Production — Friday 3PM",
      slug: "tech-talk-ai-in-production",
      excerpt: "Monthly engineering talk series. This month: deploying LLMs to production at scale. Meeting Room B + Zoom.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Join us this Friday at 3PM for our monthly Tech Talk series. This month Yamada Satoshi from the ML Platform team will share how we deploy and serve large language models at scale." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Details" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "When: Friday August 29, 3:00–4:00 PM" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Where: Meeting Room B + Zoom (link in calendar invite)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Q&A session at the end" }] }] },
          ]},
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-23"),
      categoryId: events.id,
    },
    {
      title: "Updated Remote Work Policy Effective September 1",
      slug: "updated-remote-work-policy",
      excerpt: "Following feedback from the all-hands survey, the People team has updated the remote work guidelines for all employees.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Following the results of our Q2 all-hands survey, we've updated our remote work policy. The new policy takes effect September 1st." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key changes" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Up to 3 days per week remote (previously 2)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Core hours 10am–3pm JST regardless of location" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monthly in-person team day required" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Full policy document available on the HR portal." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-22"),
      categoryId: announcements.id,
    },
  ]

  for (const article of articles) {
    const { categoryId, ...data } = article
    await db.article.upsert({
      where: { slug: data.slug },
      update: {},
      create: {
        ...data,
        authorId: admin.id,
        categories: { create: { categoryId } },
      },
    })
  }

  console.log(`Seeded database. Admin: ${ADMIN_EMAIL}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
