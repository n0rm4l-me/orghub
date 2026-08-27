import { signIn } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { getSettings } from "@/lib/settings"
import { BrandLogo } from "@/components/brand-logo"
import { SubmitButton } from "@/components/submit-button"
import { inputClass } from "@/components/ui/field"

interface Props {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}

export async function generateMetadata() {
  const settings = await getSettings()
  return { title: `Sign in to ${settings.siteName}` }
}

export default async function LoginPage({ searchParams }: Props) {
  const [settings, params] = await Promise.all([getSettings(), searchParams])
  const oktaEnabled = Boolean(process.env.AUTH_OKTA_ID)
  const ldapEnabled = Boolean(process.env.LDAP_URL) || process.env.LDAP_DEV_MODE === "true"
  const isDev = process.env.NODE_ENV === "development"
  // In dev mode local auth is always available so the seed account is accessible
  // regardless of the localAuthEnabled setting.
  const localEnabled = settings.localAuthEnabled || isDev

  async function handleCredentials(formData: FormData) {
    "use server"
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      })
    } catch (error) {
      if (error instanceof AuthError) redirect("/login?error=invalid")
      throw error
    }
  }

  async function handleLdap(formData: FormData) {
    "use server"
    try {
      await signIn("ldap", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/",
      })
    } catch (error) {
      if (error instanceof AuthError) redirect("/login?error=invalid")
      throw error
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <BrandLogo
            logoUrl={settings.logoUrl}
            logoOnLightUrl={settings.logoOnLightUrl}
            siteName={settings.siteName}
            height={36}
            tone="dark"
          />
          <p className="mt-4 text-sm text-gray-500">Sign in to continue</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Reserved so the card does not grow and shift on a failed attempt. */}
          {params.error && (
            <p
              role="alert"
              className="mb-5 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm
                text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Invalid credentials. Please check your details and try again.
            </p>
          )}

          {oktaEnabled && (
            <>
              <form
                action={async () => {
                  "use server"
                  await signIn("okta", { redirectTo: "/" })
                }}
              >
                <SubmitButton
                  pendingLabel="Redirecting…"
                  className="mb-6 w-full border border-gray-200 bg-white text-gray-700
                    hover:bg-gray-50 hover:brightness-100"
                >
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="12" r="5" fill="#007DC1" />
                    <path
                      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
                      stroke="#007DC1"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                  Continue with Okta SSO
                </SubmitButton>
              </form>
              {(localEnabled || ldapEnabled) && (
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-gray-400">
                      {localEnabled ? "or use your email" : "or sign in with Active Directory"}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {localEnabled && (
            <form action={handleCredentials} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  placeholder="you@company.com"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
              <SubmitButton pendingLabel="Signing in…" className="w-full">
                Sign in
              </SubmitButton>
            </form>
          )}

          {ldapEnabled && (
            <>
              {localEnabled && (
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden>
                    <div className="w-full border-t border-gray-100" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-2 text-xs text-gray-400">
                      or sign in with Active Directory
                    </span>
                  </div>
                </div>
              )}
              <form action={handleLdap} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="ad-email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    id="ad-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className={inputClass}
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="ad-password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="ad-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
                <SubmitButton pendingLabel="Signing in…" className="w-full">
                  Sign in with AD
                </SubmitButton>
              </form>
            </>
          )}

        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          Trouble signing in? Contact your {settings.siteName} administrator.
        </p>
      </div>
    </div>
  )
}
