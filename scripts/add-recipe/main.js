/**
 * Caption in, `recipes/<slug>/recipe.md` out.
 *
 * Two things are checked before anything is written. The rendered document
 * has to parse, and re-rendering what came back out has to reproduce it
 * byte for byte: if `render` and `parse` disagree, the recipe on disk is not
 * the recipe the model described, and no amount of review would reliably
 * catch a single dropped ingredient. A failure is fed back to the model
 * rather than raised, since the usual cause is content it can fix.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { RecipeMDError } from './cookbook.js'
import { extractRecipe } from './extract.js'
import { parseIssueBody } from './issue.js'
import { parseToData } from './parse.js'
import { renderRecipeMD } from './render.js'
import { buildSlug, normalizeHandle } from './slug.js'

const MAX_ATTEMPTS = 3

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const recipesDir = path.join(repoRoot, 'recipes')

/** Tags the collection already uses, so the model reaches for those first. */
export function collectExistingTags(directory = recipesDir) {
  const tags = new Set()

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const file = path.join(directory, entry.name, 'recipe.md')
    if (!existsSync(file)) continue

    try {
      for (const tag of parseToData(readFileSync(file, 'utf8')).tags) tags.add(tag)
    } catch {
      // A recipe that no longer parses is validate.yml's problem, not ours.
    }
  }

  return [...tags].sort()
}

function sourcesFor(url, handle) {
  if (!url) return []
  const normalized = normalizeHandle(handle)
  return [{ title: normalized ? `Instagram - @${normalized}` : 'Instagram', url }]
}

/**
 * Render, then prove the rendering survives a trip through the parser.
 * @returns {string} the document to write
 */
export function renderAndVerify(data) {
  const markdown = renderRecipeMD(data)
  const rerendered = renderRecipeMD(parseToData(markdown))

  if (rerendered !== markdown) {
    throw new RecipeMDError('The rendered recipe does not survive being parsed back')
  }

  return markdown
}

function readIssueBody(argv) {
  const fileFlag = argv.indexOf('--body-file')
  if (fileFlag !== -1) return readFileSync(argv[fileFlag + 1], 'utf8')
  if (process.env.ISSUE_BODY) return process.env.ISSUE_BODY
  throw new Error('Provide the issue body through ISSUE_BODY or --body-file')
}

export async function run(argv = process.argv.slice(2)) {
  const dryRun = argv.includes('--dry-run')
  const { caption, url, handle } = parseIssueBody(readIssueBody(argv))
  const existingTags = collectExistingTags()

  let markdown = null
  let data = null
  let previousError = ''

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    data = await extractRecipe({ caption, handle, existingTags, previousError })
    try {
      markdown = renderAndVerify({ ...data, sources: sourcesFor(url, handle) })
      break
    } catch (error) {
      if (!(error instanceof RecipeMDError) || attempt === MAX_ATTEMPTS) throw error
      previousError = error.message
    }
  }

  const slug = buildSlug(data.title, handle)
  const target = path.join(recipesDir, slug, 'recipe.md')

  if (existsSync(target)) {
    throw new Error(
      `recipes/${slug}/recipe.md already exists. Rename the recipe, or delete the existing one first.`
    )
  }

  if (dryRun) {
    process.stdout.write(`${markdown}\n`)
    return { slug, markdown, written: false }
  }

  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, markdown, 'utf8')

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `slug=${slug}\ntitle=${data.title}\npath=recipes/${slug}/recipe.md\n`)
  }

  return { slug, markdown, written: true }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch(error => {
    console.error(error.message)
    process.exit(1)
  })
}
