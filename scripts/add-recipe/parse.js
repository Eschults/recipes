/**
 * Read a RecipeMD document back into the structured shape `render.js` emits.
 *
 * The specification stops at the second divider and leaves everything after it
 * as one opaque string, so step groups and sources are a convention rather than
 * a format. That convention belongs to the cookbook, which is what has to
 * display them, so `toRecipe` does that half and the parser does the rest.
 */
import { parseRecipe, toRecipe } from './cookbook.js'

export function parseToData(markdown) {
  // parseRecipe first: it throws a RecipeMDError naming what is wrong, which
  // is what gets fed back to the model. toRecipe would only return null.
  const parsed = parseRecipe(markdown)
  const displayed = toRecipe(markdown, '')

  return {
    title: parsed.title,
    description: parsed.description,
    tags: parsed.tags,
    yields: parsed.yields,
    ingredients: parsed.ingredients,
    ingredientGroups: parsed.ingredientGroups,
    instructionGroups: displayed.stepGroups,
    sources: displayed.sources
  }
}
