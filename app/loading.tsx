export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="border-b border-ink/10 bg-gradient-to-b from-paper to-white">
        <div className="mx-auto max-w-7xl px-4 pb-3 pt-6 sm:px-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-64 animate-pulse rounded-lg bg-ink/10" />
              <div className="h-4 w-40 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-52 animate-pulse rounded bg-ink/10" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-8 w-28 animate-pulse rounded-full bg-white shadow-card"
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white/70 p-3 shadow-cardlg ring-1 ring-ink/5 backdrop-blur">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-7">
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-white px-3 py-5 ring-1 ring-ink/5"
                >
                  <div className="h-14 w-14 animate-pulse rounded-2xl bg-ink/10" />
                  <div className="h-3 w-16 animate-pulse rounded bg-ink/10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div className="space-y-2">
            <div className="h-6 w-56 animate-pulse rounded bg-ink/10" />
            <div className="h-3 w-80 animate-pulse rounded bg-ink/10" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-white shadow-card"
            />
          ))}
        </div>

        <div className="mt-6 h-96 animate-pulse rounded-2xl bg-white shadow-card" />
      </main>
    </div>
  );
}
