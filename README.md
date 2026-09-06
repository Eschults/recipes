# Recipes

My personal collection of recipes, written in [RecipeMD](https://recipemd.org/specification.html) —
a plain-text Markdown format for recipes that both humans and machines can read.

Each recipe lives in its own directory under `recipes/` and is served, browsed and turned
into a shopping list by [**Cookbook**](https://github.com/ssaunier/cookbook), a small
read-only web app of mine hosted at [cookbook.saunier.me](https://cookbook.saunier.me).
Cookbook reads this repository straight from the GitHub API — there is no build step or
sync between the two: push a recipe here and it shows up there.

## Structure

```
recipes/
  crepes/
    recipe.md
  pate-a-tartiner/
    recipe.md
  ...
```

One directory per recipe, each containing a single `recipe.md` file written in RecipeMD.
The directory name becomes the recipe's slug/URL in Cookbook, so keep it short and
lowercase-with-dashes.

A recipe looks like this:

```markdown
# Pâte à tartiner

Imitation Nutella, recette du chef Christophe Michalak

**600g de pâte**

---

- *270 g* noisettes
- *150 g* sucre glace
- *120 g* sucre

---

1. Torréfier les noisettes à 170 degrés - 15 minutes
1. Faire un caramel à sec avec le sucre en poudre blanc

Source:
- [Blog Article](https://encoreungateau.com/pate-tartiner-michalak/)
```

Amounts are wrapped in `*emphasis*` — this is what lets both RecipeMD parsers and
Cookbook's shopping-list scaler pick them out. See the
[RecipeMD specification](https://recipemd.org/specification.html) for the full format
(ingredient groups, fractions, yield, etc.).

A GitHub Actions workflow ([`.github/workflows/validate.yml`](.github/workflows/validate.yml))
validates every `recipes/**/recipe.md` file on push and pull request using the
[`recipemd`](https://pypi.org/project/recipemd/) Python package, so a malformed recipe
fails CI instead of silently breaking Cookbook.

## Using this with your own Cookbook

This repository and [Cookbook](https://github.com/ssaunier/cookbook) are independent:
Cookbook just points at a GitHub repo, directory and branch, and reads whatever RecipeMD
files it finds there. To use it for your own recipes:

1. **Create your own recipes repository.** Forking this one is the fastest way to get
   the structure and CI validation for free — then delete the recipes under `recipes/`
   and replace them with your own, following the format above. The repository must be
   **public**, since Cookbook calls the GitHub API from the browser without a token.

2. **Fork [`ssaunier/cookbook`](https://github.com/ssaunier/cookbook)** and point it at
   your repository by editing `src/config.js`:

   ```js
   export const recipesRepo = {
     owner: 'your-github-username',
     repo: 'your-recipes-repo',
     branch: 'main',
     directory: 'recipes'
   }
   ```

3. **Deploy your Cookbook fork to GitHub Pages** — see the "Deploying your fork" section
   of [its README](https://github.com/ssaunier/cookbook#deploying-your-fork) for the two
   things to change (`public/CNAME` and `base` in `vite.config.js`).

From there, adding a recipe is just adding a directory with a `recipe.md` file and
pushing — Cookbook picks it up on the next load.

## License

Code (the validation workflow) is [MIT](LICENSE) © Sébastien Saunier. The recipes
themselves are mine to cook, not necessarily to redistribute — check with me first if
you'd like to reuse one beyond personal use.
