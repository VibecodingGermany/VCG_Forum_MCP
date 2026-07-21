# Contributing

## Philosophy

This wrapper is intentionally **thin**. It bakes the VCG forum URL and onboarding, then delegates all MCP logic to the official [`@discourse/mcp`](https://github.com/discourse/discourse-mcp) package.

**Custom forum tools belong upstream**, not in a fork. If you want a new Discourse tool (e.g., `discourse_update_post`, `discourse_list_categories`, etc.), the right place is the official `@discourse/mcp` repository.

## Before you start

- The wrapper is **write-scope limited to `trusted-coders` team members** (see `CODEOWNERS`).
- Code is plain Node ESM with no build step — keep it simple.
- The sole runtime dependency is pinned exactly to `@discourse/mcp@0.2.9`.

## Submitting a change

1. **For a new tool:** Open an issue on [`discourse/discourse-mcp`](https://github.com/discourse/discourse-mcp) first. Implement it there, then update our pin once it's released.

2. **For a wrapper-level fix** (e.g., improved onboarding, token handling, CLI UX):
   - Open a GitHub issue describing the change.
   - Discuss with the `trusted-coders` team.
   - Fork, create a branch (`git checkout -b fix/your-fix`), and implement.
   - Add tests if the change affects CLI behavior (manual smoke tests are documented in the builder report and validator sign-off).
   - Open a pull request with a clear title and description.

3. **Security findings:**
   - Do **not** open a public issue.
   - Email `cubetribe@googlemail.com` with details.
   - We will coordinate a fix before disclosure.

## Development workflow

### Install for development

```bash
git clone https://github.com/VibecodingGermany/VCG_Forum_MCP.git
cd VCG_Forum_MCP
npm install
npm link
```

### Test the CLI

Without a real profile (no login required):

```bash
node src/cli.js --version
node src/cli.js help
node src/cli.js config
```

With a real profile (requires `vcg-forum-mcp login` first):

```bash
node src/cli.js serve
```

### Code style

- **ESM only** — use `import`/`export`, no `require()` except for the two pinned `createRequire` calls in `src/cli.js` and `src/config.js`.
- **No linter/formatter** — keep code clean and readable by hand.
- **Comments for non-obvious logic** — especially around permission modes and credential handling.
- **Error messages should be helpful** — guide the user toward the fix (see `src/commands/serve.js` for examples).

## Branching and PRs

- Branch from `main`.
- Use conventional commit style: `feat(login): add SSO retry logic` or `fix(serve): clear error message`.
- Keep PRs focused on one change.
- All PRs require approval from a `trusted-coders` team member before merge.

## Dependency updates

- **`@discourse/mcp`** — only update if a new release fixes a bug or security issue. Coordinate with the team before bumping.
- **No new dependencies** without team discussion. Every dependency increases supply-chain risk and maintenance burden.

## Release process

The `trusted-coders` team owns releases. When ready:

1. Update `package.json` version (follows semver).
2. Add a dated entry to `CHANGELOG.md`.
3. Tag and push: `git tag v0.X.Y && git push origin main --tags`.
4. The GitHub Actions workflow (`.github/workflows/release.yml`) handles npm publishing.

## Questions?

- Open an issue on this repo for wrapper-specific questions.
- Open an issue on [`discourse/discourse-mcp`](https://github.com/discourse/discourse-mcp) for forum tool questions.
- Email `cubetribe@googlemail.com` for private matters or security concerns.

Thank you for contributing!
