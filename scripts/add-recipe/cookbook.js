/**
 * The RecipeMD parser lives in the cookbook, not here.
 *
 * Vendoring a copy would let the two drift apart silently, and a recipe that
 * parses here but not there is exactly the bug this tooling exists to prevent.
 * CI checks the cookbook out next to this repository; locally, the sibling
 * checkout is the default and COOKBOOK_DIR overrides it.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

const cookbookDir = process.env.COOKBOOK_DIR
  ? path.resolve(process.env.COOKBOOK_DIR)
  : path.resolve(repoRoot, '../cookbook')

const parserPath = path.join(cookbookDir, 'src/services/recipemd.js')

if (!existsSync(parserPath)) {
  throw new Error(
    `Could not find the RecipeMD parser at ${parserPath}. ` +
    'Check out Eschults/cookbook beside this repository, or set COOKBOOK_DIR.'
  )
}

export const { parseRecipe, RecipeMDError, flattenIngredients } =
  await import(pathToFileURL(parserPath).href)
