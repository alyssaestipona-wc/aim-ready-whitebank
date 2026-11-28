// `@testing-library/jest-dom/vitest`'s own ambient type augmentation (the one
// referenced from tsconfig's `types`) is resolved from jest-dom's own
// node_modules. In this pnpm workspace, `vitest` is deduped into several
// peer-resolved instances that differ only by the `@types/node` version seen
// by whichever package pulled them in, so jest-dom's `declare module 'vitest'`
// can land on a different physical instance than the one this package's test
// files import from — and the augmentation silently fails to merge.
//
// Redeclaring it here, inside this package's own source, resolves both
// `vitest` and `@testing-library/jest-dom/matchers` from this package's own
// node_modules, guaranteeing it augments the same `vitest` instance our tests
// use. Mirrors the upstream declaration in
// `@testing-library/jest-dom/types/vitest.d.ts`.
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging, not a real empty interface
  interface Assertion<R, T> extends TestingLibraryMatchers<T, R> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging, not a real empty interface
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, unknown> {}
}
