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
      title: "New Office Opening in Austin — Join Us for the Celebration!",
      slug: "austin-office-opening",
      excerpt: "We're thrilled to announce the opening of our new Austin office. All employees are invited to the celebration event on September 5th.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "We're thrilled to announce the opening of our new Austin office. All employees are invited to the celebration event on September 5th." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What to expect" }] },
          { type: "paragraph", content: [{ type: "text", text: "The new office features 3 floors, 200 workstations, 2 large meeting rooms, and a rooftop terrace. The celebration will include a guided tour, refreshments, and a welcome speech from our CEO." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "How to attend" }] },
          { type: "paragraph", content: [{ type: "text", text: "Register through the HR portal by August 30th. Shuttle buses will depart from the New York office at 9am." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-20"),
      categoryId: announcements.id,
    },
    {
      title: "Cutting Build Times by 70% with Remote Caching",
      slug: "remote-caching-build-times",
      excerpt: "After six months of effort, our platform team cut CI build times from 18 minutes to under 5. Here's the approach and what we'd do differently.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "As our monorepo grew past 200 packages, CI times ballooned to 18 minutes per PR. That's a lot of waiting. After evaluating several approaches, we landed on remote caching and cut times to under 5 minutes." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Why builds were slow" }] },
          { type: "paragraph", content: [{ type: "text", text: "Every CI run was rebuilding packages from scratch, even when only one file changed. With 200+ packages and no shared cache, every PR triggered a full rebuild." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The approach" }] },
          { type: "paragraph", content: [{ type: "text", text: "We set up a shared remote cache that stores build outputs keyed by input hash. If nothing upstream changed, CI downloads the cached result instead of rebuilding. Cache hits are near-instant." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key lessons" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Start with a staging rollout — production cache misses are expensive" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Deterministic builds are a prerequisite — timestamps in output files break caching" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monitor cache hit rate weekly; drops signal a flaky dependency" }] }] },
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
          { type: "paragraph", content: [{ type: "text", text: "Join us this Friday at 3PM for our monthly Tech Talk series. This month Alex Carter from the ML Platform team will share how we deploy and serve large language models at scale." }] },
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
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Core hours 10am–3pm ET regardless of location" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Monthly in-person team day required" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Full policy document available on the HR portal." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-22"),
      categoryId: announcements.id,
    },
    {
      title: "Introducing the New Design System: Sprout",
      slug: "introducing-design-system-sprout",
      excerpt: "Our frontend team has shipped a unified design system used across all products. Say hello to Sprout.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "After 18 months of work, we're proud to announce the official launch of Sprout, our internal design system. Sprout standardises components, tokens, and patterns across all our products." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What's included" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "50+ Figma components synced to a shared library" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "React component library published to our internal npm registry" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Storybook with interactive documentation" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Accessibility guidelines and WCAG 2.1 AA compliance checklists" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Migration guides for existing products are available in the engineering wiki." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-21"),
      categoryId: engineering.id,
    },
    {
      title: "Company All-Hands: September 12, 10AM",
      slug: "all-hands-september-2026",
      excerpt: "Quarterly all-hands meeting. CEO update, product roadmap, and open Q&A. All offices and remote employees invited.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Our next company all-hands is scheduled for September 12 at 10AM ET. All offices will be connected via video conference, and remote employees can join via the usual Zoom link." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Agenda" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "10:00 — CEO update: Q2 results and Q3 focus" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "10:30 — Product roadmap by CPO" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "11:00 — Open Q&A (submit questions in advance via the HR portal)" }] }] },
          ]},
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-19"),
      eventDate: new Date("2026-09-12T10:00:00"),
      eventEndDate: new Date("2026-09-12T11:30:00"),
      eventLocation: "All offices + Zoom",
      categoryId: events.id,
    },
    {
      title: "How We Reduced API Latency by 40% with Query Batching",
      slug: "api-latency-query-batching",
      excerpt: "A deep-dive into how the platform team identified N+1 queries and cut API response times with DataLoader-style batching.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Earlier this quarter our monitoring flagged a 40% increase in p99 API latency under load. After profiling, we traced it to N+1 database queries in our GraphQL resolvers." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The root cause" }] },
          { type: "paragraph", content: [{ type: "text", text: "Each resolver was fetching related records individually — for 50 items in a list that meant 51 round-trips to the database. Classic N+1." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The fix" }] },
          { type: "paragraph", content: [{ type: "text", text: "We implemented a DataLoader-style batching layer. Requests are collected within a single event loop tick and resolved in one query using IN clauses. Result: p99 dropped from 340ms to 190ms." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-18"),
      categoryId: engineering.id,
    },
    {
      title: "Employee Referral Bonus Doubled Through End of Year",
      slug: "employee-referral-bonus-doubled",
      excerpt: "To help fill 30 open engineering and product roles, the referral bonus is increasing to $2,000 per successful hire.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "We're growing fast and need your help. For any candidate you refer who is hired and completes their 90-day probation before December 31, 2026, you'll receive a $2,000 referral bonus — double the usual amount." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Open roles" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "8 Backend Engineers (Go, Kotlin)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "4 Frontend Engineers (React, TypeScript)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "3 Product Managers" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "2 Data Engineers" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Submit referrals through Greenhouse. Questions? Contact your HR business partner." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-17"),
      categoryId: hr.id,
    },
    {
      title: "Platform Team Weekly: Incident Retrospective System",
      slug: "platform-incident-retrospective-system",
      excerpt: "We've standardised our post-mortem process with a new tool that auto-generates retro templates from PagerDuty data.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "After a string of SEV-2 incidents in June, we decided to take our retrospective process more seriously. We've shipped a tool that connects to PagerDuty and auto-generates a structured retro document for any incident." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What it generates" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Timeline with all alert firings and acknowledgements" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Affected services and on-call responders" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Blank sections for root cause, contributing factors, and action items" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "The tool is available at incident-retro.internal. Feedback welcome in the #platform Slack channel." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-15"),
      categoryId: engineering.id,
    },
    {
      title: "New Benefits: Mental Health Stipend and Gym Allowance",
      slug: "new-benefits-mental-health-gym",
      excerpt: "Starting October 1, all full-time employees receive a $200/month wellness stipend covering mental health apps, gym memberships, and more.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "We've heard you. Employee wellbeing is a priority, and we're backing that with real budget. From October 1, every full-time employee will receive a $200 per month wellness stipend." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What's eligible" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Gym memberships and fitness classes" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Mental health apps (Calm, Headspace, Noom)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Online therapy and counselling platforms" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Sports equipment up to $100/year" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Submit receipts through the expense portal by the 25th of each month." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-14"),
      categoryId: hr.id,
    },
    {
      title: "Hack Week 2026: Projects, Winners, and Demos",
      slug: "hack-week-2026-recap",
      excerpt: "60 engineers, 3 days, 18 prototypes. Here's a recap of Hack Week 2026 and the three projects that will ship to production.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Last week 60 engineers put their regular work on pause for three days of Hack Week. Teams formed organically around ideas, built prototypes, and demoed to the whole company on Friday." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Winners" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "1st place: Smart changelog generator — reads git diff and writes readable release notes with Claude API" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "2nd place: Zero-config load testing tool — one command to generate production-like traffic" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "3rd place: Internal Slack bot for on-call briefings — fetches open incidents and recent deploys" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "All three will go through a productionisation sprint in September. Watch this space." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-11"),
      categoryId: engineering.id,
    },
    {
      title: "New York Office Rooftop BBQ — September 6",
      slug: "nyc-rooftop-bbq-september",
      excerpt: "End-of-summer rooftop BBQ at the New York office. Food, drinks, and games. Families welcome.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Join us on the rooftop for our annual end-of-summer BBQ. All New York office employees and their families are welcome. Food and non-alcoholic drinks are provided." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Details" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "When: September 6, 5:00 PM onwards" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Where: New York office rooftop terrace (21F)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "RSVP by September 3 so we can order enough food" }] }] },
          ]},
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-08"),
      eventDate: new Date("2026-09-06T17:00:00"),
      eventLocation: "New York office rooftop (21F)",
      categoryId: events.id,
    },
    {
      title: "Onboarding Redesign: What's New for New Hires",
      slug: "onboarding-redesign-2026",
      excerpt: "We've completely overhauled the new hire experience based on survey feedback. Here's what changes starting September.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "We surveyed 40 employees who joined in the past year and found that 70% felt overwhelmed in their first week and 55% didn't know who to ask for help. The new onboarding program addresses both." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What's changing" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Week 1 is now fully structured: no project work, only orientation, team intros, and tool setup" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Each new hire is assigned a buddy for their first 90 days" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "30/60/90 day check-ins are now mandatory" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Managers of incoming hires will receive a prep guide one week before start dates. Questions to hr@orghub.dev." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-05"),
      categoryId: hr.id,
    },
    {
      title: "Security Reminder: Mandatory Password Rotation This Week",
      slug: "password-rotation-august-2026",
      excerpt: "All employees must rotate their corporate passwords by Friday. IT will be locking accounts that haven't complied.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "As part of our quarterly security compliance cycle, all employees are required to update their corporate account passwords before end of day Friday, August 8." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Requirements" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Minimum 14 characters" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Must include numbers and special characters" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Cannot reuse any of your last 10 passwords" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Accounts that have not rotated by Friday 6PM ET will be locked and require an IT ticket to unlock. Don't leave it to the last minute." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-04"),
      categoryId: announcements.id,
    },
    {
      title: "We Moved to GitHub Actions: What Changes for You",
      slug: "github-actions-migration",
      excerpt: "Jenkins is retired. All CI/CD pipelines now run on GitHub Actions. Here's the quick migration reference for your team.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "As of August 1, Jenkins has been officially decommissioned. All pipelines have been migrated to GitHub Actions. Here's what you need to know to keep shipping." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key changes" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Pipelines are now defined in .github/workflows/ in each repo" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Shared steps live in the platform-actions org repo as reusable workflows" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Secrets are managed in GitHub Environments, not Vault UI" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Migration guide and YAML templates are in the engineering wiki. Ping #platform for help." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-01"),
      categoryId: engineering.id,
    },
    {
      title: "Parental Leave Policy Extended to 6 Months",
      slug: "parental-leave-policy-2026",
      excerpt: "Primary caregivers now receive 6 months of fully paid parental leave. Secondary caregivers get 8 weeks, up from 4.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "We're proud to announce a major update to our parental leave policy, effective immediately for any leave starting after August 1, 2026." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "New policy" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Primary caregiver: 6 months fully paid (previously 3 months)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Secondary caregiver: 8 weeks fully paid (previously 4 weeks)" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Adoption and foster placements are covered on the same terms" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Contact your HR business partner to start the paperwork. We're committed to supporting your family." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-07-31"),
      categoryId: hr.id,
    },
    {
      title: "PostgreSQL 16 Upgrade: Action Required for Service Owners",
      slug: "postgres-16-upgrade",
      excerpt: "All services still running PostgreSQL 14 must complete upgrade testing by September 15. Here's the playbook.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "PostgreSQL 14 reaches end-of-life in November. The DBA team has prepared a migration playbook and will provide per-service support. All service owners must complete testing by September 15." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Migration steps" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Spin up a PG16 instance in staging using the platform CLI" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Run pg_upgrade with the --check flag first" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Run your integration test suite against the new instance" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Schedule production cutover with the DBA team" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Full playbook at db-docs.internal. Reach out to #databases with any questions." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-07-28"),
      categoryId: engineering.id,
    },
    {
      title: "Office Closed September 1 — Labor Day",
      slug: "labor-day-closure-2026",
      excerpt: "All US offices will be closed on Monday September 1 for Labor Day. Remote employees should check local calendars.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "All US-based offices will be closed on Monday, September 1 for Labor Day." }] },
          { type: "paragraph", content: [{ type: "text", text: "Employees based outside the US should follow their local public holiday calendars. On-call schedules remain unchanged — PagerDuty rotations are not affected." }] },
          { type: "paragraph", content: [{ type: "text", text: "Normal business resumes on Tuesday, September 2." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-08-07"),
      categoryId: announcements.id,
    },
    {
      title: "Product Team Offsite Recap: What We Decided",
      slug: "product-offsite-recap-2026",
      excerpt: "The product team spent two days in Lake Tahoe aligning on H2 priorities. Here are the key decisions and what they mean for engineering.",
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Last week the product team held its H2 planning offsite in Lake Tahoe. 24 PMs and designers spent two days pressure-testing roadmap assumptions and aligning on priorities. Here's what came out of it." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Key decisions" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Search gets a dedicated squad for Q3 — it's now a top-3 priority" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Mobile redesign pushed to Q4 to avoid fragmenting focus" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "A new internal tooling budget approved for engineering productivity" }] }] },
          ]},
          { type: "paragraph", content: [{ type: "text", text: "Full notes and decision log shared in the #product Slack channel. Roadmap doc updated in Confluence." }] },
        ],
      },
      published: true,
      publishedAt: new Date("2026-07-25"),
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

  // Seed pages with hierarchy
  const hrPage = await db.page.upsert({
    where: { slug: "hr" },
    update: {},
    create: {
      title: "HR",
      slug: "hr",
      published: true,
      showInNav: true,
      order: 1,
      body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Human Resources resources, policies, and guides. Use the links below to navigate to a specific topic." }] }] },
    },
  })

  await db.page.upsert({
    where: { slug: "hr-onboarding" },
    update: {},
    create: {
      title: "Onboarding",
      slug: "hr-onboarding",
      published: true,
      showInNav: true,
      parentId: hrPage.id,
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Welcome to the team! Here's everything you need to get set up in your first week." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Day 1 checklist" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Collect your badge from reception" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Set up Google Workspace and Slack" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Submit your equipment request form" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Join the #general and #new-hires Slack channels" }] }] },
          ]},
        ],
      },
    },
  })

  await db.page.upsert({
    where: { slug: "hr-benefits" },
    update: {},
    create: {
      title: "Benefits",
      slug: "hr-benefits",
      published: true,
      showInNav: true,
      parentId: hrPage.id,
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "A summary of the benefits available to all full-time employees." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Health" }] },
          { type: "paragraph", content: [{ type: "text", text: "Comprehensive health, dental, and vision insurance for you and your dependents. Enrolment happens within your first 30 days." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Wellness stipend" }] },
          { type: "paragraph", content: [{ type: "text", text: "$200/month for gym memberships, mental health apps, and fitness equipment. Submit receipts through the expense portal." }] },
        ],
      },
    },
  })

  const engineeringPage = await db.page.upsert({
    where: { slug: "engineering" },
    update: {},
    create: {
      title: "Engineering",
      slug: "engineering",
      published: true,
      showInNav: true,
      order: 2,
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Engineering guidelines, runbooks, and internal tooling documentation." }] },
        ],
      },
    },
  })

  await db.page.upsert({
    where: { slug: "engineering-runbooks" },
    update: {},
    create: {
      title: "Runbooks",
      slug: "engineering-runbooks",
      published: true,
      showInNav: true,
      parentId: engineeringPage.id,
      body: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Step-by-step runbooks for common operational tasks and incident response." }] },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "On-call process" }] },
          { type: "bulletList", content: [
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Acknowledge the PagerDuty alert within 5 minutes" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Post an incident notice in #incidents" }] }] },
            { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Escalate to secondary if unresolved after 30 minutes" }] }] },
          ]},
        ],
      },
    },
  })

  console.log(`Seeded database. Admin: ${ADMIN_EMAIL}`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
