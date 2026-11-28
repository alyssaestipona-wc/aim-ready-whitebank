/**
 * Full-page navigation for session changes. The client router may hold pages
 * or prefetched proxy responses from the previous session (signed out), a
 * document load drops that cache so `proxy.ts` re-checks the route against
 * the new cookie.
 */
export function navigateHard(path: string) {
  window.location.replace(path)
}
