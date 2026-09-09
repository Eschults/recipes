/**
 * Turn a pasted caption into structured recipe data.
 *
 * The model never writes RecipeMD. It fills in a schema, and render.js turns
 * that into markdown, so a malformed document is not a failure mode the model
 * can reach - only wrong content is, and wrong content is reviewable in a
 * pull request.
 */
import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'

/** The model answered, but not with a recipe. Worth another attempt. */
export class SchemaError extends Error {}

const Amount = z.object({
  factor: z.number().describe('The numeric quantity, e.g. 250 for "250 g".'),
  unit: z.string().nullable().describe('The unit, e.g. "g" or "cuillères à soupe". Null when the ingredient is simply counted.')
})

const Ingredient = z.object({
  amount: Amount.nullable().describe('Null when the caption gives no quantity, e.g. "huile d\'olive".'),
  name: z.string().describe('The ingredient alone, without its quantity and without a leading "de".'),
  link: z.string().nullable().describe('Almost always null. A URL only when the caption links to a specific product.')
})

const IngredientGroup = z.object({
  title: z.string().describe('What this part of the recipe is, e.g. "Pâte sucrée".'),
  ingredients: z.array(Ingredient)
})

const InstructionGroup = z.object({
  title: z.string().nullable().describe('A stage name such as "Préparation" or "Cuisson". Null for a single ungrouped run of steps.'),
  steps: z.array(z.string())
})

const RecipeSchema = z.object({
  title: z.string().describe('Two to four words naming the dish. Not the caption\'s opening sentence.'),
  description: z.string().nullable().describe('One short line of context, or null.'),
  tags: z.array(z.string()),
  yields: z.array(Amount).describe('How much the recipe makes, e.g. factor 4 unit "personnes".'),
  ingredients: z.array(Ingredient).describe('Ungrouped ingredients. Use this and leave ingredientGroups empty unless the recipe genuinely has separate components.'),
  ingredientGroups: z.array(IngredientGroup).describe('Only for recipes with distinct components, e.g. a pastry and a filling.'),
  instructionGroups: z.array(InstructionGroup)
})

// RECIPE_MODEL overrides this, so another model can be tried against a real
// caption without editing code.
const MODEL = process.env.RECIPE_MODEL || 'gemini-3.8-flash'

/**
 * Gemini takes a subset of JSON Schema, so the zod schema above stays the one
 * definition and this is derived from it. Deriving rather than hand-writing a
 * second copy is what stops the two from disagreeing about what a recipe is.
 */
const RESPONSE_SCHEMA = toGeminiSchema(z.toJSONSchema(RecipeSchema))

/**
 * Gemini documents a subset of JSON Schema. Two things zod emits are not in
 * it: the `$schema` key, and a nullable field written as `type: [T, "null"]`.
 * `anyOf` is documented as supported, so the union is rewritten that way
 * rather than left in the array form and hoped for.
 */
function toGeminiSchema(node) {
  if (Array.isArray(node)) return node.map(toGeminiSchema)
  if (!node || typeof node !== 'object') return node

  const out = {}

  for (const [key, value] of Object.entries(node)) {
    if (key === '$schema') continue

    if (key === 'type' && Array.isArray(value)) {
      out.anyOf = value.map(type => ({ type }))
      continue
    }

    out[key] = toGeminiSchema(value)
  }

  return out
}

const SYSTEM = `Tu transformes la légende d'une publication de cuisine en une fiche recette structurée, destinée à une collection personnelle rédigée entièrement en français.

Règles de contenu:
- Écris tout en français. Si la légende est dans une autre langue, traduis-la.
- Le titre nomme le plat en deux à quatre mots. Ce n'est pas la première phrase de la légende.
- Ignore tout ce qui est promotionnel: mentions de marques et de comptes, hashtags, appels à l'action, renvois vers une application ou un site, concours.
- N'invente jamais un ingrédient, une quantité ou une étape absente de la légende. Si la légende ne décrit pas la préparation, écris le minimum fidèle à ce qu'elle dit.

Règles de forme, pour rester cohérent avec la collection existante:
- Un ingrédient compté est au singulier: "3 carottes" devient factor 3, unit null, name "carotte".
- Les unités s'écrivent en toutes lettres: "c. à soupe" devient "cuillères à soupe", "c. à café" devient "cuillère à café". La masse et le volume gardent leurs symboles: g, kg, cL, L.
- L'unité s'accorde avec la quantité: "1 cuillère à soupe", "2 cuillères à soupe".
- Le nom d'un ingrédient ne commence pas par "de" ni "d'": "150g de pois chiches secs" devient factor 150, unit "g", name "pois chiches secs".
- Les étapes sont à l'infinitif: "Couper", "Mélanger", "Enfourner".
- Les rendements courants: "personnes" pour un plat, sinon l'unité produite ("12 cannelés", "6 pitas").`

function buildUserMessage({ caption, handle, existingTags, previousError }) {
  const parts = []

  if (existingTags.length) {
    parts.push(`Étiquettes déjà utilisées dans la collection, à réutiliser en priorité: ${existingTags.join(', ')}.`)
  }
  if (handle) {
    parts.push(`Publication du compte @${handle}.`)
  }
  if (previousError) {
    parts.push(`La tentative précédente a produit une fiche invalide: ${previousError}. Corrige-la.`)
  }

  parts.push('Légende:', caption)
  return parts.join('\n\n')
}

/**
 * The free tier costs nothing, so this reports tokens rather than money. It
 * still matters: the daily quota is counted in requests and tokens, and a
 * caption that suddenly costs ten times as much is worth noticing.
 */
function reportUsage(response) {
  const usage = response.usageMetadata ?? {}
  const thoughts = usage.thoughtsTokenCount ? `, ${usage.thoughtsTokenCount} thinking` : ''

  console.error(
    `${MODEL}: ${usage.promptTokenCount ?? 0} in, ` +
    `${usage.candidatesTokenCount ?? 0} out${thoughts}`
  )
}

/**
 * @param {{caption: string, handle?: string, existingTags?: string[],
 *   previousError?: string, client?: Anthropic}} options
 */
export async function extractRecipe({ caption, handle = '', existingTags = [], previousError = '', client }) {
  if (!caption.trim()) throw new Error('The caption is empty, so there is nothing to extract')

  const genai = client ?? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const response = await genai.models.generateContent({
    model: MODEL,
    contents: buildUserMessage({ caption, handle, existingTags, previousError }),
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_SCHEMA,
      // Extraction from a caption is bounded work; thinking buys nothing here
      // and is billed against the same quota.
      thinkingConfig: { thinkingBudget: 0 }
    }
  })

  reportUsage(response)

  const text = response.text
  if (!text) throw new Error('The model returned no output')

  // Gemini constrains the response to the schema but does not guarantee it the
  // way a strict tool call does, so the shape is checked here rather than
  // trusted. A mismatch reads as a RecipeMDError-shaped retry to the caller.
  const parsed = RecipeSchema.safeParse(JSON.parse(text))
  if (!parsed.success) {
    throw new SchemaError(`the recipe did not fit the schema: ${parsed.error.message}`)
  }

  return parsed.data
}
