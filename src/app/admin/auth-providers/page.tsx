import { db } from "@/lib/db"
import { ShieldCheck, KeyRound, CheckCircle2, XCircle } from "lucide-react"
import { requireRole } from "@/lib/rbac"
import { PageHeader } from "@/components/ui/page-header"
import { Panel } from "@/components/ui/field"
import { getSettings } from "@/lib/settings"
import { LocalAuthToggle } from "@/components/local-auth-toggle"

export const metadata = { title: "Authentication" }

const OKTA_VARS = ["AUTH_OKTA_ID", "AUTH_OKTA_ISSUER", "AUTH_OKTA_SECRET"] as const
const LDAP_VARS = [
  "LDAP_URL",
  "LDAP_BIND_DN",
  "LDAP_BIND_PASSWORD",
  "LDAP_USER_SEARCH_BASE",
  "LDAP_USER_SEARCH_FILTER",
  "LDAP_TIMEOUT",
] as const

export default async function AuthProvidersPage() {
  await requireRole("ADMIN")

  const oktaConfigured = Boolean(
    process.env.AUTH_OKTA_ID && process.env.AUTH_OKTA_SECRET && process.env.AUTH_OKTA_ISSUER
  )
  const ldapConfigured = Boolean(
    process.env.LDAP_URL && process.env.LDAP_BIND_DN && process.env.LDAP_BIND_PASSWORD
  )
  const ldapDevMode = process.env.LDAP_DEV_MODE === "true"

  const [withPassword, ssoOnly, settings] = await Promise.all([
    db.user.count({ where: { active: true, passwordHash: { not: null } } }),
    db.user.count({ where: { active: true, passwordHash: null } }),
    getSettings(),
  ])

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Authentication"
        description="How people sign in. Configured through environment variables, not this screen."
      />

      <div className="space-y-4">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gray-100">
                <KeyRound className="size-4 text-gray-500" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Email and password</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Passwords are stored as bcrypt hashes. Disable once all users are on SSO or AD.
                </p>
              </div>
            </div>
            <LocalAuthToggle initialEnabled={settings.localAuthEnabled} />
          </div>

          {!settings.localAuthEnabled && process.env.NODE_ENV === "development" && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
              Password login is disabled, but the sign-in form remains visible in development mode
              to prevent lockouts. It will be hidden in production.
            </p>
          )}

          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
            <div>
              <dt className="text-xs text-gray-400">Accounts with a password</dt>
              <dd className="text-sm font-medium tabular-nums text-gray-900">{withPassword}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Provider-only accounts</dt>
              <dd className="text-sm font-medium tabular-nums text-gray-900">{ssoOnly}</dd>
            </div>
          </dl>

          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
            Accounts without a password hash cannot use this form: they must sign in through an
            identity provider. Set an initial password by running the seed script with{" "}
            <code className="rounded bg-white px-1 font-mono">SEED_ADMIN_PASSWORD</code>.
          </p>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10">
                <ShieldCheck className="size-4 text-brand" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Okta OIDC</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Enterprise single sign-on over OpenID Connect.
                </p>
              </div>
            </div>
            <Badge active={oktaConfigured}>
              {oktaConfigured ? "Active" : "Not configured"}
            </Badge>
          </div>

          <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {OKTA_VARS.map((name) => {
              const raw = process.env[name]
              // Secrets are never echoed, and the client ID is truncated: this page
              // is behind admin auth but the values still do not belong in a DOM.
              const shown = !raw
                ? null
                : name === "AUTH_OKTA_SECRET"
                  ? "••••••••"
                  : name === "AUTH_OKTA_ID"
                    ? `${raw.slice(0, 6)}…`
                    : raw

              return (
                <li key={name} className="flex items-center gap-3 text-xs">
                  <span className="w-40 shrink-0 font-mono text-gray-500">{name}</span>
                  {shown ? (
                    <span className="truncate rounded bg-gray-50 px-2 py-0.5 font-mono text-gray-800">
                      {shown}
                    </span>
                  ) : (
                    <span className="text-amber-600">not set</span>
                  )}
                </li>
              )
            })}
          </ul>

          {!oktaConfigured && (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
              Set all three variables in your environment and restart the app. The Okta button then
              appears on the sign-in page automatically.
            </p>
          )}
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand/10">
                <ShieldCheck className="size-4 text-brand" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Active Directory / LDAP</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Corporate directory authentication via service-account bind and user verify.
                </p>
              </div>
            </div>
            <Badge active={ldapConfigured || ldapDevMode}>
              {ldapDevMode ? "Dev mode" : ldapConfigured ? "Active" : "Not configured"}
            </Badge>
          </div>

          <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
            {LDAP_VARS.map((name) => {
              const raw = process.env[name]
              const shown = !raw
                ? null
                : name === "LDAP_BIND_PASSWORD"
                  ? "••••••••"
                  : raw

              return (
                <li key={name} className="flex items-center gap-3 text-xs">
                  <span className="w-52 shrink-0 font-mono text-gray-500">{name}</span>
                  {shown ? (
                    <span className="truncate rounded bg-gray-50 px-2 py-0.5 font-mono text-gray-800">
                      {shown}
                    </span>
                  ) : (
                    <span className="text-amber-600">not set</span>
                  )}
                </li>
              )
            })}
          </ul>

          {!ldapConfigured && !ldapDevMode && (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
              Set <code className="rounded bg-white px-1 font-mono">LDAP_URL</code>,{" "}
              <code className="rounded bg-white px-1 font-mono">LDAP_BIND_DN</code>, and{" "}
              <code className="rounded bg-white px-1 font-mono">LDAP_BIND_PASSWORD</code> in your
              environment. The AD login form appears on the sign-in page automatically.
            </p>
          )}
          {ldapDevMode && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
              Dev mode is on — real LDAP is bypassed. Any username with password{" "}
              <code className="rounded bg-white px-1 font-mono">devpass</code> will sign in.
              Set <code className="rounded bg-white px-1 font-mono">LDAP_DEV_MODE=false</code> in
              production.
            </p>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Badge({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs
        font-medium ${
          active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
        }`}
    >
      {active ? (
        <CheckCircle2 className="size-3.5" aria-hidden />
      ) : (
        <XCircle className="size-3.5" aria-hidden />
      )}
      {children}
    </span>
  )
}
