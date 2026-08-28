self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title ?? "OrgHub"
  const options = {
    body: data.body,
    data: { href: data.href ?? "/" },
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const href = event.notification.data?.href ?? "/"
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        const existing = wins.find((w) => w.url.includes(href))
        if (existing) return existing.focus()
        return clients.openWindow(href)
      }),
  )
})
