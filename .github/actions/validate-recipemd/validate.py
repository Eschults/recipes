"""Parse one RecipeMD document with the reference parser, or fail loudly.

Kept as a file rather than a heredoc so both callers run byte-identical
validation and so it can be run by hand against a recipe.
"""
import sys

from recipemd.data import RecipeParser

filename = sys.argv[1]

try:
    with open(filename, "r", encoding="UTF-8") as handle:
        RecipeParser().parse(handle.read())
except Exception as exc:  # noqa: BLE001 - any parse failure is a failure
    print(f"{filename}: Invalid RecipeMD ({exc})", file=sys.stderr)
    sys.exit(1)
