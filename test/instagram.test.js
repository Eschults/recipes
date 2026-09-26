import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchCaption, parseCaptionAnswer, withCaption } from '../scripts/add-recipe/instagram.js'

const url = 'https://www.instagram.com/reel/Dc3tBCdhTuX/'

function fakeClient({ text, status = 'URL_RETRIEVAL_STATUS_SUCCESS' }) {
  const calls = []
  const client = {
    models: {
      async generateContent(request) {
        calls.push(request)
        return {
          text,
          candidates: [{ urlContextMetadata: { urlMetadata: status ? [{ retrievedUrl: url, urlRetrievalStatus: status }] : [] } }]
        }
      }
    }
  }
  return { client, calls }
}

test('fetchCaption reads the caption and the author through URL context', async () => {
  const { client, calls } = fakeClient({ text: '{"handle": "@louloukitchen_", "caption": "Ingrédients :\\n• 3 carottes"}' })

  assert.deepEqual(await fetchCaption({ url, client }), {
    caption: 'Ingrédients :\n• 3 carottes',
    handle: 'louloukitchen_'
  })
  assert.deepEqual(calls[0].config.tools, [{ urlContext: {} }])
  assert.ok(calls[0].contents.endsWith(url))
})

test('fetchCaption refuses an answer when the post could not be retrieved', async () => {
  const { client } = fakeClient({
    text: '{"handle": "someone", "caption": "A caption the model made up"}',
    status: 'URL_RETRIEVAL_STATUS_ERROR'
  })

  await assert.rejects(fetchCaption({ url, client }), /could not read .*URL_RETRIEVAL_STATUS_ERROR/)
})

test('fetchCaption refuses an answer when no retrieval was attempted', async () => {
  const { client } = fakeClient({ text: '{"handle": "someone", "caption": "Made up"}', status: null })

  await assert.rejects(fetchCaption({ url, client }), /no retrieval attempted/)
})

test('fetchCaption fails when the page showed no caption', async () => {
  const { client } = fakeClient({ text: '{"handle": "louloukitchen_", "caption": ""}' })

  await assert.rejects(fetchCaption({ url, client }), /found no caption/)
})

test('fetchCaption needs a URL', async () => {
  await assert.rejects(fetchCaption({ url: '', client: {} }), /no post URL/)
})

test('parseCaptionAnswer tolerates a fenced answer and rejects anything else', () => {
  assert.deepEqual(parseCaptionAnswer('```json\n{"handle": "a", "caption": "b"}\n```'), { handle: 'a', caption: 'b' })
  assert.deepEqual(parseCaptionAnswer('Je ne peux pas lire cette page.'), { handle: '', caption: '' })
  assert.deepEqual(parseCaptionAnswer('{not json}'), { handle: '', caption: '' })
})

test('withCaption fetches only when the request carries no caption', async () => {
  const fetch = async () => ({ caption: 'fetched', handle: 'fetched_handle' })

  assert.deepEqual(await withCaption({ caption: '', url, handle: '' }, { fetch }), {
    caption: 'fetched', url, handle: 'fetched_handle'
  })
  assert.deepEqual(await withCaption({ caption: 'pasted', url, handle: '' }, { fetch: () => assert.fail('fetched') }), {
    caption: 'pasted', url, handle: ''
  })
  assert.equal((await withCaption({ caption: '', url, handle: 'given' }, { fetch })).handle, 'given')
})
