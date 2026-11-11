---
name: release
description: Publishes a new version of CatCHMeal to the user's daily app on the phone. Version bump, changelog, signed build, signature check, install as an update. Use it when the user wants to release, ship, or put a new version on their real app.
argument-hint: "[patch|minor|major]"
---

Release a new version ($ARGUMENTS, default `patch`). Everything was tried in CatCHMeal dev first.

1. Check that `git status` is clean and `make check` passes (via the `verifier` subagent).
2. Look at the migrations added since the last `build: release` commit. If one converts existing data (not only adds tables or columns), ask the user to save a backup from the real app first, and wait. Claude cannot copy the release app's database.
3. `npm version $ARGUMENTS --no-git-tag-version`.
4. Turn `## [Unreleased]` in CHANGELOG.md into the version's entry (version and date), after checking it against the commits since the last release and adding what is missing. Show it to the user.
5. Ask the user for the go to install on the real app. Without it, stop here.
6. Delegate to the `android-builder` subagent: `make release`, signature check, `make installRelease`, `firstInstallTime` unchanged, app starts.
7. Commit `package.json`, `package-lock.json` and `CHANGELOG.md` as `build: release <version>`.
8. Give the user, without running them: `git push`, then `gh release create v<version> release/catchmeal-<version>.apk --title "CatCHMeal <version>" --notes "<changelog entry>"`.

If `project_release_1_0` is still in memory and this is 1.0.0, remind the user of its list.
