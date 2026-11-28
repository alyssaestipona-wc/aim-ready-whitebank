export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-5 h-7 w-72 animate-pulse rounded-md bg-g-150" />
      <div className="h-64 animate-pulse rounded-xl bg-g-100" />
    </div>
  )
}
