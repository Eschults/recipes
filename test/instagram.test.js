import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fetchCaption, parseOgDescription, withCaption } from '../scripts/add-recipe/instagram.js'

const url = 'https://www.instagram.com/reel/DdrLS5ON1cI/'

/** Stands in for a Playwright `chromium.launch()` result, down to the calls fetchCaption makes. */
function fakeBrowser(description) {
  const calls = { goto: null, closed: false }
  const browser = {
    async newContext(options) {
      calls.contextOptions = options
      return {
        async newPage() {
          return {
            async goto(target, options) {
              calls.goto = { target, options }
            },
            async $eval(selector, fn) {
              if (description === null) throw new Error('no such element')
              return fn({ content: description })
            }
          }
        }
      }
    },
    async close() {
      calls.closed = true
    }
  }
  return { launch: async () => browser, calls }
}

test('fetchCaption reads the caption and handle from og:description', async () => {
  const { launch, calls } = fakeBrowser(
    '60K likes, 387 comments - louloukitchen_ on September 24, 2026: "Ingrédients :\n• 3 carottes".'
  )

  assert.deepEqual(await fetchCaption({ url, launch }), {
    caption: 'Ingrédients :\n• 3 carottes',
    handle: 'louloukitchen_'
  })
  assert.equal(calls.goto.target, url)
  assert.equal(calls.closed, true)
})

test('fetchCaption closes the browser even when the page has no caption', async () => {
  const { launch, calls } = fakeBrowser(null)

  await assert.rejects(fetchCaption({ url, launch }), /showed no caption/)
  assert.equal(calls.closed, true)
})

test('fetchCaption fails when the description carries no quoted caption', async () => {
  const { launch } = fakeBrowser('louloukitchen_ shared a photo.')

  await assert.rejects(fetchCaption({ url, launch }), /showed no caption/)
})

test('fetchCaption needs a URL', async () => {
  await assert.rejects(fetchCaption({ url: '' }), /no post URL/)
})

test('parseOgDescription handles a caption with no engagement counts', () => {
  assert.deepEqual(
    parseOgDescription('louloukitchen_ on September 24, 2026: "Une légende simple".'),
    { caption: 'Une légende simple', handle: 'louloukitchen_' }
  )
})

test('parseOgDescription keeps quotes that appear inside the caption', () => {
  assert.deepEqual(
    parseOgDescription('1 like, 0 comments - chef on 1 January 2026: "Une recette "spéciale" du jour".'),
    { caption: 'Une recette "spéciale" du jour', handle: 'chef' }
  )
})

test('parseOgDescription returns empty fields for text it cannot parse', () => {
  assert.deepEqual(parseOgDescription('Instagram'), { caption: '', handle: '' })
  assert.deepEqual(parseOgDescription(null), { caption: '', handle: '' })
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
