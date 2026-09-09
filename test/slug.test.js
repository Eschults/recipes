import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSlug, normalizeHandle, slugify } from '../scripts/add-recipe/slug.js'

test('slugify matches the conventions the collection already uses', () => {
  assert.equal(slugify('Pâte à tartiner'), 'pate-a-tartiner')
  assert.equal(slugify('Gâteau aux Noix'), 'gateau-aux-noix')
  assert.equal(slugify('Cannelés T45'), 'canneles-t45')
  assert.equal(slugify('Lasagnes Épinards Chèvre'), 'lasagnes-epinards-chevre')
})

test('slugify drops apostrophes rather than turning them into separators', () => {
  assert.equal(slugify("Tarte à l'oignon"), 'tarte-a-loignon')
  assert.equal(slugify('Salade d’été'), 'salade-dete')
})

test('normalizeHandle accepts what people actually paste', () => {
  assert.equal(normalizeHandle('louloukitchen_'), 'louloukitchen')
  assert.equal(normalizeHandle('@Ottolenghi.Kitchen'), 'ottolenghi-kitchen')
  assert.equal(normalizeHandle('https://www.instagram.com/louloukitchen_/'), 'louloukitchen')
  assert.equal(normalizeHandle(''), '')
})

test('buildSlug appends the handle whenever there is one', () => {
  assert.equal(buildSlug('Poulet rôti au paprika fumé', 'louloukitchen_'), 'poulet-roti-au-paprika-fume-louloukitchen')
  assert.equal(buildSlug('Cookies', ''), 'cookies')
})

test('buildSlug refuses a title that produces nothing', () => {
  assert.throws(() => buildSlug('!!!', 'someone'), /does not produce a usable slug/)
})
