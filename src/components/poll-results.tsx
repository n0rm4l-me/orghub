interface Option {
  id: string
  text: string
  voteCount: number
}

interface Voter {
  optionId: string
  name: string
}

interface Props {
  options: Option[]
  totalVotes: number
  anonymous: boolean
  voters?: Voter[]
}

export function PollResults({ options, totalVotes, anonymous, voters = [] }: Props) {
  const votersByOption = voters.reduce<Record<string, string[]>>((acc, v) => {
    if (!acc[v.optionId]) acc[v.optionId] = []
    acc[v.optionId]!.push(v.name)
    return acc
  }, {})

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-sm font-semibold text-gray-700">
        Results — {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        {anonymous && (
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-400">
            Anonymous
          </span>
        )}
      </h2>
      <div className="space-y-4">
        {options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0
          const names = votersByOption[opt.id] ?? []
          return (
            <div key={opt.id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm text-gray-700">{opt.text}</span>
                <span className="shrink-0 text-xs font-semibold text-gray-900">
                  {pct}% <span className="font-normal text-gray-400">({opt.voteCount})</span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-brand transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!anonymous && names.length > 0 && (
                <p className="mt-1.5 text-[11px] text-gray-400 leading-relaxed">
                  {names.join(", ")}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {totalVotes === 0 && (
        <p className="mt-4 text-sm text-gray-400">No votes yet.</p>
      )}
    </div>
  )
}
