/**
 * The collection is the fixture set.
 *
 * Rendering has to be the inverse of parsing: whatever the model produces is
 * written by `render.js` and read back by the cookbook, and if those two
 * disagree a recipe silently loses an ingredient or a whole step group. Every
 * committed recipe is therefore parsed, re-rendered and parsed again, and the
 * two readings must be identical. Byte equality is deliberately not the test
 * - the collection mixes `##` with `###` and `Source:` with `Sources:` - but
 * nothing the cookbook displays is allowed to change.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseToData } from '../scripts/add-recipe/parse.js'
import { renderRecipeMD } from '../scripts/add-recipe/render.js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const recipesDir = path.join(repoRoot, 'recipes')

const slugs = readdirSync(recipesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

test('the collection is not empty', () => {
  assert.ok(slugs.length > 0, 'expected at least one recipe to test against')
})

for (const slug of slugs) {
  test(`${slug} survives a render round-trip`, () => {
    const original = readFileSync(path.join(recipesDir, slug, 'recipe.md'), 'utf8')

    const data = parseToData(original)
    const rendered = renderRecipeMD(data)

    assert.deepEqual(parseToData(rendered), data)
  })
}
