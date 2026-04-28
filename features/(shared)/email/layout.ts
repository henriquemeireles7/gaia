/**
 * Shared email layout — branded HTML + plain-text generation.
 * CUSTOMIZE: Update colors, font stacks, brand name, and address.
 */

const FONT_STACK = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const SERIF_STACK = "Georgia, 'Times New Roman', serif"

// CUSTOMIZE: Brand colors
const BG_COLOR = '#FAF8F5'
const CARD_COLOR = '#FFFFFF'
const TEXT_COLOR = '#1A1714'
const CTA_COLOR = '#C4956A'
const MUTED_COLOR = '#A69D91'
const BRAND_NAME = 'My App'

export function emailLayout(
  content: string,
  options?: { preheader?: string },
): { html: string; text: string } {
  const preheaderBlock = options?.preheader
    ? `<div style="display:none;font-size:1px;color:${BG_COLOR};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.preheader}</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:${FONT_STACK};">
${preheaderBlock}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td style="padding:24px 0;text-align:center;">
<span style="font-family:${SERIF_STACK};font-size:24px;color:${TEXT_COLOR};letter-spacing:0.02em;">${BRAND_NAME}</span>
</td></tr>

<!-- Content Card -->
<tr><td style="background-color:${CARD_COLOR};border-radius:12px;padding:32px;color:${TEXT_COLOR};font-size:16px;line-height:1.6;">
${content}
</td></tr>

<!-- Footer -->
<tr><td style="padding:24px 0;text-align:center;color:${MUTED_COLOR};font-size:12px;line-height:1.5;">
${BRAND_NAME}<br>
{PHYSICAL_ADDRESS_PLACEHOLDER}
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const text = generatePlainText(content)

  return { html, text }
}

/** Escape HTML special characters to prevent XSS in email templates. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr><td style="background-color:${CTA_COLOR};border-radius:8px;padding:14px 28px;text-align:center;">
<a href="${url}" style="color:#FFFFFF;font-family:${FONT_STACK};font-size:16px;font-weight:600;text-decoration:none;display:inline-block;">${label}</a>
</td></tr>
</table>`
}

export function stripHtml(html: string): string {
  let text = html
  text = text.replace(/<br\s*\/?>/gi, '\n')
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
  text = text.replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url, inner) => {
    const cleanInner = inner.replace(/<[^>]+>/g, '').trim()
    return `[${cleanInner}](${url})`
  })
  text = text.replace(/<[^>]+>/g, '')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  return text.trim()
}

function generatePlainText(content: string): string {
  const body = stripHtml(content)
  return `${body}\n\n---\n${BRAND_NAME}\n{PHYSICAL_ADDRESS_PLACEHOLDER}`
}
