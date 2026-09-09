# Recipes

My collection of recipes in [RecipeMD](https://recipemd.org/specification.html), forked from [ssaunier/recipes](https://github.com/ssaunier/recipes). The recipe format, the repository layout and the validation workflow are unchanged here, and [the upstream README](https://github.com/ssaunier/recipes#readme) documents all three.

They are served at [cookbook.eschults.org](https://cookbook.eschults.org) by [Eschults/cookbook](https://github.com/Eschults/cookbook), which reads this repository straight from the GitHub API: push a recipe here and it shows up there.

Everything below is specific to this fork.

## Adding a recipe from a caption

Most recipes here start life as a post someone wrote for Instagram. Rather than reformat one by hand, open an [**Ajouter une recette**](../../issues/new?template=add-recipe.yml) issue, paste the caption, and a pull request appears with the recipe in RecipeMD.

| Field | |
| --- | --- |
| **Caption** | The post text, pasted as-is. Promotional lines, hashtags and mentions are dropped for you. |
| **Source URL** | Optional. Tracking parameters are stripped before it becomes the recipe's source line. |
| **Instagram handle** | Optional, and appended to the directory name: `louloukitchen_` turns `poulet-roti` into `poulet-roti-louloukitchen`. Instagram share links do not carry the handle, which is why it needs its own field. |

The model never writes RecipeMD. It fills in a schema, and [`scripts/add-recipe/render.js`](scripts/add-recipe/render.js) turns that into markdown, so a malformed document is not a failure mode it can reach. The result is parsed back with Cookbook's own parser and re-rendered; if those two disagree the run fails rather than committing a recipe that quietly lost an ingredient. The reference Python parser then checks it once more before the pull request opens.

Nothing reaches the collection unreviewed: the workflow only ever opens a pull request.

Running it locally needs `ANTHROPIC_API_KEY` and a checkout of [Cookbook](https://github.com/Eschults/cookbook) beside this repository, or `COOKBOOK_DIR` pointing at one:

```bash
npm install
npm test
npm run add-recipe -- --body-file request.md --dry-run
```

`npm test` is the part worth knowing about: it parses every recipe in the collection, re-renders it and parses it again, so a change to the renderer that would corrupt an existing recipe fails before it can be used to write a new one.

## License

[MIT](LICENSE) © Sébastien Saunier, which is what lets this fork exist and covers the tooling added to it. The recipes themselves are not necessarily mine to redistribute: check with [ssaunier](https://github.com/ssaunier) first if you would like to reuse one beyond personal use.
