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
- **Manual**: Checklist + log analysis (`venom.log` or Convex logs).

## Memory
- Use `.memory/` for temporary artifacts (gitignored but visible to tools).
