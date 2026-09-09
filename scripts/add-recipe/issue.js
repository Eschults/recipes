/**
 * Reading the issue form.
 *
 * GitHub renders a submitted issue form as markdown: one `### Label` heading
 * per field, followed by the value, with `_No response_` standing in for an
 * empty optional field. There is no structured payload, so the headings are
 * the contract - renaming a field in the form template renames it here.
 */

/** Must match the `label:` values in .github/ISSUE_TEMPLATE/add-recipe.yml. */
const FIELDS = {
  caption: 'Caption',
  url: 'Source URL',
  handle: 'Instagram handle'
}

const NO_RESPONSE = '_No response_'

/**
 * Instagram's share links carry tracking parameters and a share token
 * (`?utm_source=ig_web_copy_link&stkn=...`). None of it identifies the post,
 * and the token is per-share, so a stored URL keeps only the path.
 */
export function cleanSourceUrl(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''

  try {
    const url = new URL(raw)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return raw
  }
}

export function parseIssueBody(body) {
  const sections = new Map()
  let current = null

  for (const line of String(body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^###[ \t]+(.*?)[ \t]*$/)
    if (heading) {
      current = heading[1]
      sections.set(current, [])
    } else if (current) {
      sections.get(current).push(line)
    }
  }

  const read = label => {
    const value = (sections.get(label) ?? []).join('\n').trim()
    return value === NO_RESPONSE ? '' : value
  }

  return {
    caption: read(FIELDS.caption),
    url: cleanSourceUrl(read(FIELDS.url)),
    handle: read(FIELDS.handle)
  }
}
