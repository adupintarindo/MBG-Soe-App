# Caching & ISR Policy

Kenapa sebagian besar route di-set `export const dynamic = "force-dynamic"`, bukan ISR?

## Context

App ini **auth-gated** — tiap page SSR-nya butuh Supabase session dari cookies. Next.js App Router **tidak bisa** static-render page yang baca cookies/headers; mencoba ISR (`revalidate = N`) di page tersebut akan otomatis turun jadi dynamic. Jadi `revalidate` cuma efektif untuk page yang bisa di-prerender tanpa per-user data.

## Rules

| Route pattern                  | Cache config                              | Alasan                          |
|--------------------------------|-------------------------------------------|---------------------------------|
| `/login`                       | default (client component, CSR)           | Form login, no server data      |
| `/offline`                     | `dynamic = "force-static"`                | Truly static PWA offline page   |
| `/dashboard`, `/menu`, dll     | `dynamic = "force-dynamic"`               | Auth + per-role data            |
| `/api/suppliers/[id]/lta`      | `dynamic = "force-dynamic"`               | Signed URL, per-request         |
| Static assets (`/public/*`)    | default Vercel edge cache                 | Immutable hashed                |

## Client-side Caching

Untuk mempercepat navigation tanpa ganggu freshness:

1. **SWR pattern** — kalau ada komponen client yang poll data (notification bell), gunakan interval 60-120s dan `revalidateOnFocus: false`.
2. **`router.refresh()`** — dipanggil setelah server action sukses, invalidate RSC cache tapi browser tidak reload.
3. **Prefetch** — `<Link prefetch>` default, jangan matikan kecuali halaman berat.

## Saat ISR Masuk Akal (Future)

Kalau nanti ada halaman publik seperti:

- `/about`, `/pricing` (marketing)
- `/status` (public health page)
- `/schools/directory` (public read-only)

Terapkan:

```tsx
export const revalidate = 300;   // 5 menit
// JANGAN pakai cookies/headers di halaman ini
```

## CDN Cache (Vercel)

Default Vercel cache 1 tahun untuk `_next/static/*`. Jangan override.

Untuk API responses yang bisa di-cache singkat (mis. `/api/price-list/public`):

```ts
return new Response(body, {
  headers: {
    "cache-control": "public, s-maxage=60, stale-while-revalidate=300"
  }
});
```

## DB Query Cache

Server-side `fetch()` ke external API otomatis di-cache Next.js. Supabase SDK **tidak** pakai `fetch`, jadi tiap query round-trip DB. Kalau perlu cache query berat:

```ts
import { unstable_cache } from "next/cache";

const getLeaderboard = unstable_cache(
  async () => {
    const { data } = await supabase.rpc("top_suppliers");
    return data;
  },
  ["leaderboard-top-suppliers"],
  { revalidate: 300, tags: ["suppliers"] }
);

// Invalidate manual setelah mutation:
// revalidateTag("suppliers");
```

## Verifikasi

```bash
# Build + inspect route types
pnpm build
# Output menampilkan: λ (dynamic), ○ (static), ● (ISR), ƒ (Edge)
# Semua route auth-gated harus λ. Marketing/static harus ○ atau ●.
```
