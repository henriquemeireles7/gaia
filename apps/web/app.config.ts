import { defineConfig } from '@solidjs/start/config'

export default defineConfig({
  ssr: true,
  server: {
    preset: 'bun',
  },
  // @solidjs/router ships a precompiled `dist/index.js` that calls
  // `template()` at module top level. On the server `template()` is the
  // `notSup` stub, so any SSR module-graph load that touches the router
  // throws. Forcing Vite to bundle (`ssr.noExternal`) instead of
  // externalizing routes the import through `vite-plugin-solid`, which
  // resolves the `solid` export condition and compiles the JSX source for
  // SSR. The `conditions: ['solid']` on `resolve` keeps client-side
  // resolution consistent.
  vite: {
    resolve: {
      conditions: ['solid'],
    },
    ssr: {
      noExternal: ['@solidjs/router'],
    },
  },
})
