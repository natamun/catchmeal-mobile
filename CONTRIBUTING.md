# Contributing

Work is committed directly on `main`. Run `make check` before pushing: it runs the same checks as CI (format, lint, build, unit tests).

## Commits

Format: `type: short description in English`

| Type        | When                                      |
| ----------- | ------------------------------------------|
| `feat:`     | new feature                               |
| `fix:`      | bug fix                                   |
| `ci:`       | pipeline, GitHub Actions                  |
| `refactor:` | reorganization without changing behavior  |
| `docs:`     | README, comments                          |
| `test:`     | test scripts                              |
| `chore:`    | Makefile, .gitignore, config              |

Examples:

```
feat: add user authentication
fix: handle null pointer on early exit
refactor: extract parsing logic into separate class
docs: update README with installation steps
```

Each commit should represent one complete, logical change, not more, not less. If a change touches several independent pieces (e.g. multiple pages, or a feature plus unrelated config), split it into separate commits, one per piece.
