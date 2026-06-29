export default function Head() {
  return (
    <>
      {/* Prevent dashboard/admin pages from being indexed by search engines */}
      <meta name="robots" content="noindex, nofollow" />
    </>
  )
}
