---
name: fold-fixes
description: Folds a fix into the unpushed commit that introduced the bug, without git rebase -i. Use it every time you fix a bug the user found while testing commits that are not pushed yet, instead of making a "fix:" commit.
---

The working tree holds fixes for bugs the user found while testing commits not yet pushed. Fold each fix into the commit that introduced the bug, so the history has no `fix:` commit for them. Git here is 2.43 and `rebase -i` is not available: rebuild by hand.

1. `git log --oneline @{u}..HEAD` (or since the last pushed commit) lists the commits that may be rewritten. Never touch a pushed commit: a bug in pushed work stays a real `fix:` commit.
2. For each fix, find its target commit (`git log -L` or `git blame` on the changed lines). If the target is unclear (the fix spans several commits), ask the user; otherwise go on.
3. Save each fix as a patch: `git diff -- <files> > <scratchpad>/fix-N.patch`. Stash anything else.
4. `git switch -c fold <base>` where base is the last pushed commit. Cherry-pick the commits in order; right after each target commit, `git apply` its patch and `git commit --amend --no-edit`.
5. Check that the rebuilt tree equals the old tree plus the fixes: `git diff main fold` must show exactly the patches.
6. Check each amended commit alone in a temporary worktree (`git worktree add <scratchpad>/wt <sha>`, `npm ci`, `make check`), then remove the worktree.
7. `git branch -f main fold`, `git switch main`, delete `fold`, pop the stash. Report the rewritten commits by their message, without SHAs.
