## Repo Constraints
- **Branches**: only one active branch other than main at a time (cleanup or recommend cleanup if found in violation)
- **Vercel**: `NEXT_PUBLIC_CONVEX_URL` is automatic. If undefined, Convex deploy failed.
- **Pre-push**: `bun x ultracite fix`, `bun run check-types`, `bun run build`, and `cd packages/backend && bun run test`.

## Preferences
- **Communication**: Succinct; fragments OK; facts first; show evidence (commands + exit codes).
- **Engineering**: `readable > clever`; long descriptive names OK; split files at ~400 lines.

## Testing Strategy
- **Priority**: API > E2E > manual/verification.
- **API (Convex)**: `packages/backend/convex/*.test.ts`. Never mock HTTP; verify functional intent.
- **E2E (Stagehand)**: Prompt-first selectors; avoid brittle CSS. Use `STAGEHAND_TARGET_URL` for previews.
- **Authenticated local E2E**: When a flow requires WorkOS sign-in, use `SKETCHI_E2E_EMAIL` and `SKETCHI_E2E_PASSWORD` from local env files instead of ad hoc credentials.
- **Local auth/editor overrides**: For local WorkOS + Convex verification, prefer `SKETCHI_ADMIN_SUBJECTS` / `SKETCHI_ICON_LIBRARY_EDITOR_SUBJECTS` in addition to email allowlists. Local Convex identities may not include email claims even when the user is signed in.
- **UI verification**: For any UI/E2E-affecting change, run a targeted local verification against the real app before finishing. Prefer `agent-browser` for the interaction path and `d3k` for browser/server log review; at minimum run the real dev server with `bun run dev` and verify the affected flow there.
- **Manual**: Checklist + log analysis (`venom.log` or Convex logs).

## Memory
- Use `.memory/` for temporary artifacts (gitignored but visible to tools).
