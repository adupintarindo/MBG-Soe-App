export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <div className="text-6xl">📡</div>
        <h1 className="text-2xl font-black text-primary">Offline</h1>
        <p className="text-sm text-ink2">
          Koneksi terputus. Data yang tersimpan lokal tetap bisa dibuka; perubahan
          baru akan disinkron saat online kembali.
        </p>
        <a
          href="/dashboard"
          className="inline-block rounded-xl bg-ink px-4 py-2 text-sm font-black text-white shadow-card"
        >
          Coba lagi
        </a>
      </div>
    </main>
  );
}
