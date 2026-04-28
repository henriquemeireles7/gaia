import type { VNode } from 'preact'
import { renderToString } from 'preact-render-to-string'

interface PageOptions {
  title?: string
  description?: string
  ogImage?: string
  ogTitle?: string
  ogType?: 'website' | 'article'
  canonical?: string
  keywords?: string[]
  posthogKey?: string
  posthogHost?: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/</g, '&lt;')

const escJs = (s: string) =>
  JSON.stringify(s).slice(1, -1).replace(/</g, '\\u003c').replace(/>/g, '\\u003e')

// CUSTOMIZE: Update app name, fonts, and body classes
export function renderPage(component: VNode, options: PageOptions = {}): string {
  const html = renderToString(component)
  const title = options.title || 'My App'
  const desc = options.description || ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta property="og:title" content="${esc(options.ogTitle || title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  ${options.ogImage ? `<meta property="og:image" content="${esc(options.ogImage)}" />\n  <meta name="twitter:card" content="summary_large_image" />\n  <meta name="twitter:image" content="${esc(options.ogImage)}" />` : ''}
  <meta property="og:type" content="${options.ogType ?? 'website'}" />
  ${options.canonical ? `<link rel="canonical" href="${esc(options.canonical)}" />` : ''}
  ${options.keywords?.length ? `<meta name="keywords" content="${esc(options.keywords.join(', '))}" />` : ''}
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 px-4 py-2 rounded">Skip to content</a>
  <main id="main-content">
    ${html}
  </main>
  ${
    options.posthogKey
      ? `<script>
    window.addEventListener('load', function() {
      var s = document.createElement('script');
      s.src = 'https://us-assets.i.posthog.com/static/array.js';
      s.onload = function() {
        posthog.init('${escJs(options.posthogKey)}', {
          api_host: '${escJs(options.posthogHost || 'https://us.i.posthog.com')}',
          autocapture: true,
          capture_pageview: true,
          capture_pageleave: true,
          session_recording: { maskAllInputs: true, maskTextSelector: '[data-ph-mask]' }
        });
        window.onerror = function(msg, src, line, col, err) {
          posthog.capture('client_error_occurred', {
            message: String(msg), source: src, line: line, column: col,
            stack: err && err.stack, path: location.pathname
          });
        };
        window.onunhandledrejection = function(e) {
          posthog.capture('client_error_occurred', {
            message: e.reason && e.reason.message || String(e.reason),
            stack: e.reason && e.reason.stack, path: location.pathname
          });
        };
      };
      document.head.appendChild(s);
    });
  </script>`
      : ''
  }
</body>
</html>`
}
