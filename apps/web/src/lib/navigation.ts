/**
 * Full-page navigation for session changes. The client router may hold a
 * prefetched proxy redirect from before sign-in (or pages from before
 * sign-out); a document load drops that cache so the proxy sees the new cookie.
 */
export function navigateHard(path: string) {
  window.location.replace(path)
}
