# Branch Consolidation Report

Date: 2026-07-16

## Scope and repository state

This consolidation was performed from the local checkout because the configured GitHub remote could not be fetched in this environment: `git fetch origin --prune` failed with `CONNECT tunnel failed, response 403`.

Branches visible locally after inspection:

| Branch | Head | Notes |
| --- | --- | --- |
| `work` | `144d1aa44de422d7df8bcf40fbb0174e6fc57d62` | Existing checked-out branch; contains the full local history available in this checkout. |
| `codex/consolidate-branches` | based on `work` | Dedicated consolidation branch created for this work. |

No local or remote `main` ref was present in the checkout, and no additional remote branches could be fetched because of the network restriction above. Consequently, there were no branch-to-`main` unique commits to merge in this environment.

## History inspected

The available history shows the standalone artifact evolving as the primary product:

| Commit | Purpose | `local-ide.html` size |
| --- | --- | ---: |
| `7bf0102` | Initial local HTML IDE workspace | 42,489 bytes |
| `e814ea3` / `33ed73b` | Offline package branch merged | 530,342 bytes |
| `287dcbf` | Removed earlier library injection feature for MVP | 521,143 bytes |
| `41a3788` | StickShift compliance and onboarding | 534,337 bytes |
| `601c130` | Embedded offline library vault and packer UI | 4,426,778 bytes |
| `3f013fa` | Stem-tag-driven library packing and unpacking | 4,435,894 bytes |
| `a37b54b` | PDF.js UMD bundle and offline worker | 5,392,574 bytes |
| `9a0a826` / `144d1aa` | StickShift export injection fix and skill template editor | 5,392,574 bytes |

The largest and most recent populated standalone artifact in the available history is the `local-ide.html` at `144d1aa`.

## Authoritative artifact determination

`local-ide.html` is generated from `local-ide.src.html` by `build_local_ide.py`, but it is also intentionally tracked as the download-ready product. The source template contains placeholder markers for Tailwind, Prism, CodeJar, and the offline library vault. The build script resolves those placeholders from npm-installed local packages and writes both `local-ide.html` and `public/local-ide.html`.

Because the user downloads `local-ide.html` directly, the populated root artifact remains the authoritative deliverable. The build path is load-bearing because it can regenerate that artifact, but it must not replace it with placeholders or an obsolete/empty file.

## Branch classification

Only one development line was available locally:

- `work`: coherent current line containing the merged offline-IDE work, StickShift work, offline library vault, SEARCH/REPLACE logic, tests, and React/Vite infrastructure.

No abandoned, obsolete, duplicated, or experimental branches were visible locally after inspection.

## Integration recommendation and strategy

Given the local repository state:

- Do not merge unrelated or unavailable branches blindly.
- Preserve the current `work` history and artifact as the coherent latest available version.
- Use a dedicated consolidation branch (`codex/consolidate-branches`) for review.
- Apply a manual reconciliation fix to the build path so it can rebuild without network access by reusing the existing populated standalone Tailwind bundle before falling back to the CDN.

No textual merge conflicts were encountered because no additional branches were available to merge. The main semantic risk found was that rebuilding depended on downloading Tailwind from `https://cdn.tailwindcss.com`; in a network-restricted environment this prevented verification and could block producing the standalone file.

## Verification plan

Checks to run after consolidation:

1. Confirm `local-ide.html` exists, is nonempty, begins with `<!DOCTYPE html>`, and report its size and SHA-256.
2. Run `python3 build_local_ide.py` and confirm it preserves a populated standalone artifact.
3. Run TypeScript checking with `npm run lint`.
4. Run the Vite build with `npm run build`.
5. Run the existing export tests with `node test_export.cjs`.
6. Run scripted HTML integrity checks for editor, preview, SEARCH/REPLACE, download UI, library-placeholder resolution, PDF.js worker, and StickShift content.
7. Human smoke testing in Google Chrome on Linux is still recommended because no automated browser runner is installed in this environment.
