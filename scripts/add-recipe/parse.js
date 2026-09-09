/**
 * Read a RecipeMD document back into the structured shape `render.js` emits.
 *
 * The RecipeMD parser stops at the second divider and hands back everything
 * after it as one raw string, because the specification says nothing about
 * what instructions look like. The cookbook reads step groups and a trailing
 * source list out of that string to display a recipe; the same reading has to
 * happen here so a rendered document can be compared against the data it came
 * from.
 */
import { parseRecipe } from './cookbook.js'

const LIST_ITEM = /^\s*(?:[-+*]|\d{1,9}[.)])\s+(.*)$/
const HEADING = /^ {0,3}#{1,6}[ \t]+(.*?)[ \t]*#*[ \t]*$/
const DIVIDER = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/
const SOURCES_LABEL = /^\s*sources?\s*:?\s*$/i
const SOURCE_LINK = /^\s*[-+*]\s+\[([^\]]*)\]\(([^)]*)\)\s*$/

/** A line that continues the previous step rather than starting a new one. */
function toSteps(allLines) {
  const lines = allLines.filter(line => !DIVIDER.test(line))
  const steps = []

  for (const line of lines) {
    const item = line.match(LIST_ITEM)
    if (item) steps.push(item[1].trim())
    else if (line.trim() && steps.length) steps[steps.length - 1] += ` ${line.trim()}`
  }

  return steps
}

/** Cut at each heading, then read the steps of every section. */
function toInstructionGroups(lines) {
  const sections = [{ title: null, lines: [] }]

  for (const line of lines) {
    const heading = line.match(HEADING)
    if (heading) sections.push({ title: heading[1].trim(), lines: [] })
    else sections[sections.length - 1].lines.push(line)
  }

  return sections
    .map(section => ({ title: section.title, steps: toSteps(section.lines) }))
    .filter(section => section.steps.length)
}

function toSources(lines) {
  return lines
    .map(line => line.match(SOURCE_LINK))
    .filter(Boolean)
    .map(match => ({ title: match[1].trim(), url: match[2].trim() }))
}

export function splitInstructions(instructions) {
  if (!instructions) return { instructionGroups: [], sources: [] }

  const lines = instructions.split('\n')
  const label = lines.findIndex(line => SOURCES_LABEL.test(line))
  const body = label >= 0 ? lines.slice(0, label) : lines
  const tail = label >= 0 ? lines.slice(label + 1) : []

  return { instructionGroups: toInstructionGroups(body), sources: toSources(tail) }
}

export function parseToData(markdown) {
  const parsed = parseRecipe(markdown)
  const { instructionGroups, sources } = splitInstructions(parsed.instructions)

  return {
    title: parsed.title,
    description: parsed.description,
    tags: parsed.tags,
    yields: parsed.yields,
    ingredients: parsed.ingredients,
    ingredientGroups: parsed.ingredientGroups,
    instructionGroups,
    sources
  }
}
