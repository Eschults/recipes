# Issue → PR

The task for the routine fired by `.github/workflows/claude.yml`.

The `<routine-fire-payload>` block names one GitHub issue that someone labeled `claude`.

1. `.claude/harness-rules.md` and `CLAUDE.md` are loaded for you and bind this run. This file is the procedure, it adds no rules of its own.
2. Read the issue and every comment on it. A specification often continues in the comments, and the body alone will not show it.
3. Reproduce the problem or pin down the feature's scope before writing code.
4. If the change is visible in a UI, screenshot it and commit the images, per the section below. The PR description links them, so they must exist before it does.
5. Open the PR per the three outcomes below, then comment the link on the issue.
6. Review the PR per the section below: ready-for-review PRs only; skip it on a draft, which by definition is not finished.
7. Remove the `claude` label as your last action. The label means "waiting for an agent", so leaving it on a handled issue makes the queue lie.

## The three outcomes

Every run ends in exactly one of these. Pick deliberately; the difference is what a human is being asked to do next.

- **Ready for review**: the default. The change is complete and nothing is left to decide. Open it ready for review, not as a draft.
- **Draft**: the change is real but cannot proceed until a human answers something. State the question in the first line of the description, above everything else, and say what you would do under each answer. Then hand off on the issue, per below.
- **No PR**: there is no useful partial change to show. Comment on the issue explaining what you found and remove `claude`. That is a successful outcome, not a failure.

When the rulebook tells you to stop rather than guess, take **Draft** if you have a real change and one clear question a human can answer, and **No PR** when the doubt goes to the root of the task.

## Handing off a draft

When you open a draft, the issue comment is a handoff rather than a notification. An engineer reading only that comment must be able to act on it. Include exactly two things, in this order:

1. **The blocker, in one or two sentences.** Name concisely the decision you need and what you would do under each answer.
2. **A link to this session, as the place to take over.** Show both the claude.ai Web UI link, and the `claude --teleport` command to take over from a Terminal (rendered as a multi-line code block).

## Screenshots for UI changes

A reviewer cannot run your branch from a PR page, so when the change alters something a user sees, show it to them. Screenshot the main states the change introduces, commit the images on the PR's branch in their own commit, and link each one from the description next to the change it shows. Whatever tooling you need to render the page is for this run only: do not add it to the project's dependencies. The images do not count toward the diff cap.

Say in the description that the images are review-only and come out before merge, so they are not part of the change a human is being asked to accept. The rulebook tells whichever session is running to drop them when the reviewer asks.

## Review

Once the PR is open and ready for review, review your own work before you exit. Nothing runs after you: whatever you leave unexamined ships to a human unexamined.

1. **Run `/code-review <PR number> --fix`.** The skill scopes the diff, ranks findings, and applies the fixes. Do not hand-roll a review in its place, and do not skip it because you feel good about the code — that feeling is exactly what the pass is checking.
2. **Run the full test suite again.** A fix that breaks the build is worse than the finding it resolved.
3. **Commit and push to the PR's branch.** One commit for the review pass. If you fixed nothing, push nothing.
4. **Post the recap as a PR review**, per below.

Apply a fix when it is clearly correct, confined to the PR's own scope, and allowed by the rules. Report instead of fixing when it needs a human decision or is a design question rather than a defect. Never drop a finding silently — anything you chose not to fix goes in the recap with the reason.

Findings belong on the pull request, never in the diff. A finding about one line also goes on that line, and the recap carries every finding either way. Never write a comment into the source to record a finding, justify a fix, or flag something you left.

Track code comments that do not belong in the code, and make them review inline comments instead. Strip them out before handing off your work. 

## The recap review

One PR **Review**, with the **Comment** verdict, carrying inline comments on the lines that earned them. A review, not a comment: it belongs in the PR's review timeline, where a reviewer looks first and where a merge leaves it behind. Never approve, since you cannot be the approval gate, and never request changes, since you already pushed every fix you were going to make. No heading at the top; the review's own frame says what it is.

If the review will not post, say so in the first line of the fallback comment and name the error. A comment passed off as the recap is the one thing this step cannot do.

A reviewer should be able to read only this and know what changed and what still needs them:

1. **What the review found**, grouped by severity, one line each.
2. **What you fixed**, with the commit SHA, and confirmation that the suite passes.
3. **What you left**, each with its reason. This is the part a human has to act on, so do not bury it.
4. **A link to this session**, so the reasoning behind every call above is inspectable. Show both the claude.ai Web UI link, and the `claude --teleport` command to take over from a Terminal (rendered as a multi-line code block).
