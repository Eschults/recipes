/**
 * Everything that reads a recipe is the cookbook's, not ours.
 *
 * Vendoring a copy would let the two drift apart silently, and a recipe that
 * reads correctly here but not there is exactly the bug this tooling exists to
 * prevent. CI checks the cookbook out next to this repository; locally, the
 * sibling checkout is the default and COOKBOOK_DIR overrides it.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

const cookbookDir = process.env.COOKBOOK_DIR
  ? path.resolve(process.env.COOKBOOK_DIR)
  : path.resolve(repoRoot, '../cookbook')

function load(relativePath) {
  const file = path.join(cookbookDir, relativePath)

  if (!existsSync(file)) {
    throw new Error(
      `Could not find ${relativePath} at ${file}. ` +
      'Check out Eschults/cookbook beside this repository, or set COOKBOOK_DIR.'
    )
  }

  return import(pathToFileURL(file).href)
}

/** The RecipeMD parser: the specification, and nothing above it. */
export const { parseRecipe, RecipeMDError } = await load('src/services/recipemd.js')

/**
 * How the cookbook reads a parsed recipe into what it displays: step groups
 * and a trailing source list out of the raw instructions block, which the
 * specification says nothing about.
 */
export const { toRecipe } = await load('src/services/github.js')
