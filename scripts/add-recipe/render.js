/**
 * Render structured recipe data as a RecipeMD document.
 *
 * The model that reads a caption emits JSON, never markdown: getting the
 * dividers and the emphasis right is a syntax problem, and syntax is what
 * code is good at. That leaves the model responsible only for the content.
 */

/** Fractions worth writing as fractions. Anything else stays decimal. */
const FRACTIONS = [
  [1 / 2, '1/2'],
  [1 / 3, '1/3'],
  [2 / 3, '2/3'],
  [1 / 4, '1/4'],
  [3 / 4, '3/4']
]

/**
 * Whole numbers stay whole, a bare fraction is written as one, and anything
 * else falls back to a decimal. Mixed numbers ("1 1/2") are deliberately not
 * produced: they parse, but the decimal is unambiguous and round-trips.
 */
function formatFactor(value) {
  if (Number.isInteger(value)) return String(value)

  if (Math.abs(value) < 1) {
    for (const [fraction, label] of FRACTIONS) {
      if (Math.abs(Math.abs(value) - fraction) < 1e-9) return value < 0 ? `-${label}` : label
    }
  }

  return String(Number(value.toFixed(4)))
}

function formatAmount(amount) {
  if (!amount) return ''
  return amount.unit ? `${formatFactor(amount.factor)} ${amount.unit}` : formatFactor(amount.factor)
}

function renderIngredient(ingredient) {
  const amount = ingredient.amount ? `*${formatAmount(ingredient.amount)}* ` : ''
  const name = ingredient.link ? `[${ingredient.name}](${ingredient.link})` : ingredient.name
  return `- ${amount}${name}`
}

function renderIngredientGroups(groups, level, lines) {
  for (const group of groups) {
    lines.push('', `${'#'.repeat(level)} ${group.title}`, '')
    for (const ingredient of group.ingredients) lines.push(renderIngredient(ingredient))
    renderIngredientGroups(group.groups ?? [], level + 1, lines)
  }
}

/**
 * Steps are numbered `1.` throughout, matching the existing collection: the
 * renumbering is markdown's job, and a uniform prefix keeps diffs small when
 * a step is inserted.
 */
function renderInstructionGroups(groups, lines) {
  let first = true

  for (const group of groups) {
    if (group.title) {
      lines.push(...(first ? [] : ['']), `## ${group.title}`, '')
    } else if (!first) {
      lines.push('')
    }
    for (const step of group.steps) lines.push(`1. ${step}`)
    first = false
  }
}

export function renderRecipeMD(data) {
  if (!data?.title) throw new Error('A recipe must have a title')

  const lines = [`# ${data.title}`]

  if (data.description) lines.push('', data.description)
  if (data.tags?.length) lines.push('', `*${data.tags.join(', ')}*`)
  if (data.yields?.length) lines.push('', `**${data.yields.map(formatAmount).join(', ')}**`)

  lines.push('', '---', '')

  for (const ingredient of data.ingredients ?? []) lines.push(renderIngredient(ingredient))
  renderIngredientGroups(data.ingredientGroups ?? [], 2, lines)

  const instructionGroups = data.instructionGroups ?? []
  const sources = data.sources ?? []

  if (instructionGroups.length || sources.length) {
    lines.push('', '---', '')
    renderInstructionGroups(instructionGroups, lines)

    if (sources.length) {
      lines.push('', 'Source:')
      for (const source of sources) lines.push(`- [${source.title}](${source.url})`)
    }
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`
}
