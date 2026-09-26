# Recipes

My collection of recipes in [RecipeMD](https://recipemd.org/specification.html), forked from [ssaunier/recipes](https://github.com/ssaunier/recipes). The recipe format, the repository layout and the validation workflow are unchanged here, and [the upstream README](https://github.com/ssaunier/recipes#readme) documents all three.

They are served at [cookbook.eschults.org](https://cookbook.eschults.org) by [Eschults/cookbook](https://github.com/Eschults/cookbook), which reads this repository straight from the GitHub API: push a recipe here and it shows up there.

Everything below is specific to this fork.

## Adding a recipe from a post

Most recipes here start life as a post someone wrote for Instagram, and Instagram does not let a phone copy a caption. So open an [**Ajouter une recette**](../../issues/new?template=add-recipe.yml) issue, paste the post's link, and a pull request appears with the recipe in RecipeMD.

A headless browser opens the post and reads its caption and the account that posted it straight off the page; Instagram does not require a login to see either. Tracking parameters are stripped from the link before it becomes the recipe's source line, the handle is appended to the directory name (`louloukitchen_` turns `poulet-roti` into `poulet-roti-louloukitchen`), and Gemini drops promotional lines, hashtags and mentions from the caption while turning it into a recipe. If the browser finds no caption on the page, the run fails rather than asking the model to guess one.

For a post the browser cannot read, run the workflow by hand from the Actions tab and paste the caption into its `caption` input: a caption given directly skips the fetch.

The model never writes RecipeMD. It fills in a schema, and [`scripts/add-recipe/render.js`](scripts/add-recipe/render.js) turns that into markdown, so a malformed document is not a failure mode it can reach. The result is parsed back with Cookbook's own parser and re-rendered; if those two disagree the run fails rather than committing a recipe that quietly lost an ingredient. The reference Python parser then checks it once more before the pull request opens.

Nothing reaches the collection unreviewed: the workflow only ever opens a pull request.

Running it locally needs a `GEMINI_API_KEY` in `.env` (copy `.env.example`) and a checkout of [Cookbook](https://github.com/Eschults/cookbook) beside this repository, or `COOKBOOK_DIR` pointing at one. `npm install` also downloads the browser Playwright drives, which only needs doing once. `request.md` holds a request in the same shape the issue form produces (a `### Caption` section skips the fetch), and `--dry-run` prints the recipe instead of writing it:

```bash
npm install
npm test
npm run add-recipe -- --body-file request.md --dry-run
```

`npm test` is the part worth knowing about: it parses every recipe in the collection, re-renders it and parses it again, so a change to the renderer that would corrupt an existing recipe fails before it can be used to write a new one.

## License

[MIT](LICENSE) © Sébastien Saunier, which is what lets this fork exist and covers the tooling added to it. On reusing the recipes themselves, see [the upstream README](https://github.com/ssaunier/recipes#license).
