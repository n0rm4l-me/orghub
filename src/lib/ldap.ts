import { Client } from "ldapts"

interface LdapUser {
  email: string
  name: string
  department?: string
  username: string
}

export async function authenticateLdap(
  username: string,
  password: string,
): Promise<LdapUser | null> {
  if (process.env.LDAP_DEV_MODE === "true") {
    if (password === "devpass") {
      return { email: `${username}@example.com`, name: username, username }
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
  const filterTemplate = process.env.LDAP_USER_SEARCH_FILTER ?? "(sAMAccountName={{username}})"
  const timeout = Number(process.env.LDAP_TIMEOUT) || 5000
  const searchFilter = filterTemplate.replace("{{username}}", username.replace(/[()\\*/\x00]/g, ""))

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

    const email = (entry.mail as string) || `${username}@example.com`
    const name = (entry.displayName as string) || username
    const department = entry.department as string | undefined

    return { email, name, department, username }
  } catch (err) {
    console.error("[ldap] authentication error:", err)
    return null
  } finally {
    try { await svcClient.unbind() } catch {}
  }
}
