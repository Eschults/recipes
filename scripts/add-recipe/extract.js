/**
 * Turn a pasted caption into structured recipe data.
 *
 * The model never writes RecipeMD. It fills in a schema, and render.js turns
 * that into markdown, so a malformed document is not a failure mode the model
 * can reach - only wrong content is, and wrong content is reviewable in a
 * pull request.
 */
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

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
 * @param {{caption: string, handle?: string, existingTags?: string[],
 *   previousError?: string, client?: Anthropic}} options
 */
export async function extractRecipe({ caption, handle = '', existingTags = [], previousError = '', client }) {
  if (!caption.trim()) throw new Error('The caption is empty, so there is nothing to extract')

  const anthropic = client ?? new Anthropic()

  const response = await anthropic.messages.parse({
    model: 'claude-opus-5',
    max_tokens: 16000,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'medium',
      format: zodOutputFormat(RecipeSchema)
    },
    messages: [{ role: 'user', content: buildUserMessage({ caption, handle, existingTags, previousError }) }]
  })

  if (response.stop_reason === 'refusal') {
    throw new Error(`The model declined to process this caption (${response.stop_details?.category ?? 'unknown'})`)
  }
  if (!response.parsed_output) {
    throw new Error('The model returned no structured output')
  }

  return response.parsed_output
}
