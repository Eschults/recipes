/**
 * Slugs. The directory name under `recipes/` is the slug, and the cookbook
 * turns it straight into a URL (`recipes/cookies/recipe.md` serves at
 * `/r/cookies`), so this is a user-facing string, not an internal key.
 *
 * When the poster's handle is known it is always appended, which makes the
 * slug a pure function of the title and the handle: nothing has to consult
 * the repository to decide what a recipe is called.
 */

/** Drop accents so "Pâte à tartiner" can become "pate-a-tartiner". */
export function deaccent(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Apostrophes vanish rather than becoming separators, so "d'ail" slugs as
 * "dail" and not "d-ail". Everything else that is not a letter or a digit is
 * a separator.
 */
export function slugify(text) {
  return deaccent(String(text ?? ''))
    .toLowerCase()
    .replace(/['’ʼ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * An Instagram handle, as a slug fragment. Accepts what people actually
 * paste: a bare handle, an @handle, or a full profile URL. Handles allow "."
 * and "_", neither of which belongs in a URL, and a trailing one of either
 * (`louloukitchen_`) must not leave a dangling separator.
 */
export function normalizeHandle(input) {
  const raw = String(input ?? '').trim()
  if (!raw) return ''

  const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([^/?#]+)/i)
  return slugify((fromUrl ? fromUrl[1] : raw).replace(/^@/, ''))
}

/** `("Cookies", "louloukitchen_")` becomes `cookies-louloukitchen`. */
export function buildSlug(title, handle) {
  const base = slugify(title)
  if (!base) throw new Error(`Title "${title}" does not produce a usable slug`)

  const suffix = normalizeHandle(handle)
  return suffix ? `${base}-${suffix}` : base
}
