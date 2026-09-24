export function PortalMain({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {children}
    </main>
  )
}

export function HeaderContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-14 max-w-7xl items-center gap-5 px-4 sm:px-6">
      {children}
    </div>
  )
}
