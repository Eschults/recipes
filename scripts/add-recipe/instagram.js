/**
 * Post URL in, caption out.
 *
 * Instagram does not let a phone copy a caption, so the issue form asks for
 * the link alone and Gemini reads the post through its URL context tool. The
 * retrieval status is checked before the answer is trusted: when the fetch
 * fails, a model asked for a caption will happily write a plausible one.
 */
import { GoogleGenAI, UrlRetrievalStatus } from '@google/genai'
import { MODEL, reportUsage } from './extract.js'

const PROMPT = `Lis la publication Instagram à cette adresse et renvoie uniquement un objet JSON de la forme {"handle": "...", "caption": "..."}.

- "caption" est la légende complète, recopiée mot pour mot, sans rien résumer, traduire ni corriger.
- "handle" est le nom du compte qui a publié, sans le @.
- Si la page ne montre pas la légende, renvoie une chaîne vide pour "caption". N'écris jamais une légende de mémoire.

Adresse: `

export function parseCaptionAnswer(text) {
  const json = String(text ?? '').match(/\{[\s\S]*\}/)
  if (!json) return { caption: '', handle: '' }

  try {
    const { caption, handle } = JSON.parse(json[0])
    return {
      caption: typeof caption === 'string' ? caption.trim() : '',
      handle: typeof handle === 'string' ? handle.trim().replace(/^@/, '') : ''
    }
  } catch {
    return { caption: '', handle: '' }
  }
}

function retrievalFailure(response, url) {
  const retrievals = response.candidates?.[0]?.urlContextMetadata?.urlMetadata ?? []
  if (retrievals.some(entry => entry.urlRetrievalStatus === UrlRetrievalStatus.URL_RETRIEVAL_STATUS_SUCCESS)) {
    return null
  }

  const statuses = retrievals.map(entry => entry.urlRetrievalStatus).join(', ')
  return `Gemini could not read ${url} (${statuses || 'no retrieval attempted'})`
}

export async function fetchCaption({ url, client }) {
  if (!url) throw new Error('The issue gives no post URL, so there is no caption to read')

  if (!client && !process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set. Put it in .env (see .env.example), or set it in the environment.')
  }

  const genai = client ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: PROMPT + url,
    config: { tools: [{ urlContext: {} }] }
  })

  reportUsage(response)

  const failure = retrievalFailure(response, url)
  if (failure) throw new Error(failure)

  const answer = parseCaptionAnswer(response.text)
  if (!answer.caption) throw new Error(`Gemini read ${url} but found no caption on it`)

  return answer
}

/** A caption given by hand wins, so the command line still works for a post Gemini cannot read. */
export async function withCaption(request, { fetch = fetchCaption } = {}) {
  if (request.caption) return request

  const fetched = await fetch({ url: request.url })
  return { ...request, caption: fetched.caption, handle: request.handle || fetched.handle }
}
