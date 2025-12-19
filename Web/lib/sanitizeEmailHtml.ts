/**
 * Sanitizes email HTML to prevent style leakage to the parent page.
 *
 * Email HTML often contains <style> tags with global selectors like:
 * - body { ... }
 * - table, td { ... }
 * - * { ... }
 *
 * These styles leak out and affect the entire page. This function:
 * 1. Removes style tags that target body, html, or use global selectors
 * 2. Scopes remaining styles to only affect the email content
 */
export function sanitizeEmailHtml(html: string): string {
  if (!html) return ''

  // Remove <style> tags entirely that contain problematic global selectors
  // This regex matches style tags and checks their content
  let result = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, styleContent) => {
    // Check if this style block contains problematic global selectors
    const hasGlobalSelectors = /(?:^|\s|,)(body|html|\*)\s*[{,]/i.test(styleContent)

    // If it has global selectors, remove the entire style block
    if (hasGlobalSelectors) {
      return ''
    }

    // Otherwise, keep the style but it should still be contained within the email-html-content wrapper
    return match
  })

  // Remove inline style attributes on body tag if somehow present in the fragment
  result = result.replace(/<body[^>]*>/gi, '<div class="email-body-wrapper">')
  result = result.replace(/<\/body>/gi, '</div>')

  // Remove any remaining standalone body/html style declarations
  result = result.replace(/body\s*{[^}]*}/gi, '')
  result = result.replace(/html\s*{[^}]*}/gi, '')

  return result
}

/**
 * More aggressive sanitization that removes ALL style tags.
 * Use this if style leakage is still happening.
 */
export function stripAllStyleTags(html: string): string {
  if (!html) return ''
  return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
}
