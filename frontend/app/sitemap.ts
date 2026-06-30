// NOTE: Update this sitemap generator to include dynamic product/post routes.
// Next.js `app/sitemap.ts` should export a default function that returns an array
// of objects with `url` and optional `lastModified`.
export default async function sitemap() {
  const base = "https://yourdomain.com"

  // TODO: fetch dynamic routes (products, posts) and map to objects below
  const staticRoutes = [
    { url: `${base}/` },
    { url: `${base}/login` },
    { url: `${base}/register` },
    { url: `${base}/products` },
    { url: `${base}/posts` },
  ]

  return staticRoutes
}
