import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanSourceUrl, parseIssueBody } from '../scripts/add-recipe/issue.js'

const body = [
  '### Caption',
  '',
  'Ligne une',
  'Ligne deux',
  '',
  '### Source URL',
  '',
  'https://www.instagram.com/reel/Dc3tBCdhTuX/?utm_source=ig_web_copy_link&stkn=MzRlODBiNWFlZA==',
  '',
  '### Instagram handle',
  '',
  'louloukitchen_'
].join('\n')

test('a submitted form is read back field by field', () => {
  assert.deepEqual(parseIssueBody(body), {
    caption: 'Ligne une\nLigne deux',
    url: 'https://www.instagram.com/reel/Dc3tBCdhTuX/',
    handle: 'louloukitchen_'
  })
})

test('an unanswered optional field reads as empty', () => {
  const withoutHandle = body.replace('louloukitchen_', '_No response_')
  assert.equal(parseIssueBody(withoutHandle).handle, '')
})

test('cleanSourceUrl keeps a URL it cannot parse', () => {
  assert.equal(cleanSourceUrl('not a url'), 'not a url')
  assert.equal(cleanSourceUrl(''), '')
})
