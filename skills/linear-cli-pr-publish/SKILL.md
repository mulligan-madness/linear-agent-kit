---
name: linear-cli-pr-publish
description: Use when publishing a GitHub pull request tied to one or more Linear issues, especially for stacked branches where Codex should research the best base branch, draft a linked issue-to-commit PR body, ask for one approval covering base branch and PR content, then create the PR, comment on the issues, and move them to Done
---

# Linear CLI PR Publish

## Overview

Use this skill for the combined Linear-plus-GitHub PR publishing flow. It owns branch inspection, issue resolution, base-branch recommendation, exact PR drafting, single approval gating, publish, Linear follow-up comments, and status transitions.

## Allowed Commands

- `git status --short --branch`
- `git branch --show-current`
- `git branch --all --verbose --no-abbrev`
- `git merge-base --is-ancestor <candidate> HEAD`
- `git rev-list --left-right --count <base>...HEAD`
- `git log --reverse --format=... <base>..HEAD`
- `git diff --stat <base>..HEAD`
- `git push -u origin <branch>`
- `gh repo view --json nameWithOwner,defaultBranchRef`
- `gh pr list --state all --head <branch> --base <base> --json ...`
- `gh pr view <number> --json body,title,url`
- `linear team list`
- `linear issue list`
- `linear issue view <issueId> --json --no-download`
- `linear issue url <issueId>`
- `linear issue comment add <issueId> --body-file <path>`
- `linear issue comment list <issueId> --json`
- `linear issue update <issueId> --state Done`

## Workflow

1. Inspect local git state first.
   - Confirm the current branch, remote repository, and whether the worktree contains unrelated changes.
   - Identify candidate base branches by checking which local branches are ancestors of `HEAD`.
   - Compute the unique commit list and commit count for each plausible base candidate.
2. Resolve the included Linear issues before drafting.
   - If the user gave issue IDs, use those directly.
   - If the user gave a project/state instead, discover the issue set from Linear first.
   - Read every included issue with `linear issue view <issueId> --json --no-download` and fetch its Linear URL.
   - If issue content includes images, use the installed `linear-cli-issues` helper workflow to fetch local image files when possible.
   - If the image helper reports download failures, treat that as a blocker on image understanding and report it directly instead of attempting ad hoc shell downloads.
3. Recommend the base branch.
   - Prefer the closest ancestor branch whose diff is limited to the commits relevant to the intended issue set.
   - Treat a broader branch as worse when it would include commits from an already-open prior PR.
   - Fall back to the remote default branch only when no closer ancestor yields a meaningful stacked diff.
4. Draft the PR content before any mutation.
   - Build a concise title.
   - Build a body with `## Summary` and `## Linear Issue to Commit Mapping`.
   - Add stacked-PR context only when the recommended base is not the remote default branch.
   - Add an extra included-commit section only for commits in diff that are not mapped to one of the included Linear issues.
   - Do not include a verification section by default.
5. Present one approval package and stop.
   - Show the recommended base branch.
   - State the branch-diff reasoning briefly, including the unique commit count versus the most relevant alternative.
   - Show the exact PR title and the exact PR body.
   - Do not push, create the PR, comment on issues, or change issue states before the user approves that package.
6. Publish only after approval.
   - Push the branch if needed.
   - Create the PR against the approved base branch. Prefer the GitHub app when available; fall back to `gh` only when needed.
   - Read the saved PR body back from GitHub and confirm the stored markdown matches the approved draft.
7. Perform Linear follow-up after PR creation succeeds.
   - Add one PR-created comment to each included issue with the PR link and explicit head/base branch context.
   - Move each included issue to `Done`.
   - Verify the final issue comments with `linear issue comment list <issueId> --json` and final issue states with a structured issue read.

## Base Branch Recommendation Rule

Apply this rule consistently before showing the approval package:

1. Candidate branches are local branches other than the current branch for which `merge-base --is-ancestor <candidate> HEAD` succeeds.
2. For each candidate, compute the unique commit count and unique commit list in `<candidate>..HEAD`.
3. Prefer the closest ancestor whose diff is limited to the commits relevant to the intended issue set.
4. If a broader branch would include commits from an already-open prior PR, do not recommend that broader branch.
5. Use the remote default branch only when no closer ancestor produces a meaningful stacked diff.

## PR Body Rules

Keep the PR body compact and predictable:

1. Use clickable Linear issue links in the mapping headings.
2. Use clickable GitHub commit links for every mapped commit.
3. Keep the body shape close to the cleaned-up pattern established by PRs `#239` and `#240`.
4. Avoid noisy validation summaries when the linked Linear issues already carry that context.
5. Include only the information needed for review scope, issue mapping, and stacked-branch context.

## Guardrails

1. Never mutate GitHub or Linear state before the combined approval package is explicitly approved.
2. Never silently include unrelated commits or unrelated issues.
3. Never assume the remote default branch is the right base when a closer stacked parent exists.
4. Never rely on inline shell quoting for multi-line issue comments or PR bodies when a temp file is safer.
5. Always read back the saved PR body after creation or edit to confirm the links and markdown rendered as expected.
6. Always verify the PR-link comments and final `Done` states after the writes complete.

## Dry Validation

Validate this skill without creating team-visible artifacts:

1. Run it against a known stacked-branch scenario and confirm the recommended base branch and generated approval package match expectations.
2. Run it against a known direct-to-base branch with multiple issues and confirm the generated PR body shape is correct.
3. Confirm the skill stops at the approval package and performs no GitHub or Linear writes before approval.
4. Treat real PR creation, issue comments, and issue state changes as runtime behavior for actual user-requested publishes, not as validation setup.

## Output

Report the recommended base branch, the exact approval package, and the final verification results once the workflow completes.
