/**
 * Post URL in, caption out.
 *
 * The caption never appears in the page Instagram sends over the wire: it is
 * filled in by client-side JavaScript once the page has loaded, so a plain
 * HTTP fetch sees an empty shell. A headless browser runs that JavaScript
 * and reads the result, the same way Instagram tells search engines and link
 * previews what the post says: through its `og:description` meta tag, which
 * needs no login and carries the caption whole.
 */
import { chromium } from 'playwright'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Instagram writes this as `12K likes, 34 comments - handle on 24 September
 * 2026: "caption text".` The caption is quoted, so it is read as everything
 * between the first and last quote rather than split on ": ", which the
 * caption itself is free to contain.
 */
export function parseOgDescription(description) {
  const text = String(description ?? '')
  const first = text.indexOf('"')
  const last = text.lastIndexOf('"')
  if (first === -1 || last <= first) return { caption: '', handle: '' }

  const before = text.slice(0, first)
  const handle = before.match(/(\S+)\s+on\s+[^:]+:\s*$/)?.[1] ?? ''

  return { caption: text.slice(first + 1, last).trim(), handle }
}

async function readOgDescription(url, launch) {
  const browser = await launch()

  try {
    const context = await browser.newContext({ userAgent: USER_AGENT })
    const page = await context.newPage()
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
    return await page.$eval('meta[property="og:description"]', element => element.content).catch(() => null)
  } finally {
    await browser.close()
  }
}

export async function fetchCaption({ url, launch = () => chromium.launch() }) {
  if (!url) throw new Error('The issue gives no post URL, so there is no caption to read')

  const description = await readOgDescription(url, launch)
  const answer = parseOgDescription(description)

  if (!answer.caption) throw new Error(`Instagram showed no caption for ${url}`)

  return answer
}

/** A caption given by hand wins, so the command line still works for a post the browser cannot read. */
export async function withCaption(request, { fetch = fetchCaption } = {}) {
  if (request.caption) return request

  const fetched = await fetch({ url: request.url })
  return { ...request, caption: fetched.caption, handle: request.handle || fetched.handle }
}
