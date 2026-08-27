import { Client } from "ldapts"

interface LdapUser {
  email: string
  name: string
  department?: string
}

/**
 * Authenticates against LDAP / Active Directory.
 *
 * Callers pass the full email address the user typed. There is deliberately no
 * "username plus configured domain" mode: appending a domain hardcodes one
 * organisation's mail suffix into the app, and a self-hosted portal has no business
 * assuming it.
 */
export async function authenticateLdap(
  email: string,
  password: string,
): Promise<LdapUser | null> {
  if (process.env.LDAP_DEV_MODE === "true") {
    if (password === "devpass") {
      return { email, name: email }
    }
    return null
  }

  if (!process.env.LDAP_URL || !process.env.LDAP_BIND_DN || !process.env.LDAP_BIND_PASSWORD) {
    return null
  }

  const url = process.env.LDAP_URL
  const bindDn = process.env.LDAP_BIND_DN
  const bindPassword = process.env.LDAP_BIND_PASSWORD
  const searchBase = process.env.LDAP_USER_SEARCH_BASE!
  // Matches on the mail attribute because the user supplies a full email. Directories
  // that log users in by userPrincipalName should override this.
  const filterTemplate = process.env.LDAP_USER_SEARCH_FILTER ?? "(mail={{email}})"
  const timeout = Number(process.env.LDAP_TIMEOUT) || 5000
  const searchFilter = filterTemplate.replace("{{email}}", email.replace(/[()\\*/\x00]/g, ""))

  const svcClient = new Client({
    url,
    timeout,
    connectTimeout: timeout,
    tlsOptions: { rejectUnauthorized: false },
  })

  try {
    await svcClient.bind(bindDn, bindPassword)

    const { searchEntries } = await svcClient.search(searchBase, {
      scope: "sub",
      filter: searchFilter,
      attributes: ["dn", "displayName", "mail", "department"],
      sizeLimit: 1,
    })

    if (!searchEntries.length) return null

    const entry = searchEntries[0]
    const userDn = entry.dn

    const userClient = new Client({
      url,
      timeout,
      connectTimeout: timeout,
      tlsOptions: { rejectUnauthorized: false },
    })

    try {
      await userClient.bind(userDn, password)
    } catch {
      return null
    } finally {
      try { await userClient.unbind() } catch {}
    }

    // The directory's own mail attribute wins over what was typed: it is the
    // authoritative identity, and it stops two spellings of the same account from
    // upserting into two users.
    const resolvedEmail = (entry.mail as string) || email
    const name = (entry.displayName as string) || resolvedEmail
    const department = entry.department as string | undefined

    return { email: resolvedEmail, name, department }
  } catch (err) {
    console.error("[ldap] authentication error:", err)
    return null
  } finally {
    try { await svcClient.unbind() } catch {}
  }
}
