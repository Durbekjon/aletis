// NOTE: Update this sitemap generator to include dynamic product/post routes.
// Next.js `app/sitemap.ts` should export a default function that returns an array
// of objects with `url` and optional `lastModified`.
export default async function sitemap() {
  const base = "https://www.aletis.me"

  const staticRoutes = [
    { url: `${base}/`, lastModified: new Date().toISOString() },
    { url: `${base}/login`, lastModified: new Date().toISOString() },
    { url: `${base}/register`, lastModified: new Date().toISOString() },
    { url: `${base}/privacy/policy`, lastModified: new Date().toISOString() },
    { url: `${base}/privacy/terms`, lastModified: new Date().toISOString() },
  ]

  return staticRoutes
}
