# Sketchi - Development TODO

## Phase 0: Experiments (ground truth = code + artifacts)

### Dev server gate (required for every TODO)
- [ ] Run `bun dev` from repo root; confirm Next dev on `:3001` + Convex typecheck passes
- [ ] If `:3001` is in use, stop the old process (e.g. `lsof -nP -iTCP:3001 -sTCP:LISTEN`)

### Unify + simplify
- [ ] Delete unused prompt formats that target the removed schema
- [ ] Two-stage pipeline: LLM **only** for domain analysis → `IntermediateFormat`; deterministic renderer **only** for diagram elements
- [ ] Delete direct LLM-to-diagram element generation path
- [ ] Standardize arrow format to LLM-friendly relation-only input + deterministic layout/edges

### Prompt library
- [ ] Remove giant prompt strings from experiment code once migrated

### Migration policy (per experiment)
- [ ] Define exit criteria: evidence artifact + Convex test + API test (if HTTP)
- [ ] Once done: move logic into Convex, add `.test.ts` next to code, delete experiment script

## Phase 1: Core API

### Infrastructure
- [ ] Add `@orpc/server`, `@orpc/openapi`, `@orpc/zod` to apps/web
- [ ] Add `dagre` or `elkjs` to packages/backend
- [ ] Set up oRPC router with OpenAPIReferencePlugin
- [ ] Configure Scalar docs at `/api/docs`

### Convex Backend
- [ ] Define schema (diagrams, techStacks tables)
- [ ] Implement `diagrams.generate` action
- [ ] Implement `diagrams.tweak` action
- [ ] Implement `diagrams.restructure` action
- [ ] Implement `diagrams.parse` action
- [ ] Implement `diagrams.share` action
- [ ] Rename `packages/backend/convex/export.ts` to a hyper-descriptive action file (and update imports)

### Core Libraries
- [ ] `lib/excalidraw-share.ts` - encrypt/upload/parse share links (LLM-friendly schema only)
- [ ] `lib/diagram-simplify.ts` - simplify diagram for agent consumption
- [ ] `lib/prompt-registry.ts` - consume `packages/backend/prompts/` exports

### oRPC Endpoints
- [ ] `POST /api/diagrams/generate`
- [ ] `POST /api/diagrams/tweak`
- [ ] `POST /api/diagrams/restructure`
- [ ] `POST /api/diagrams/share`
- [ ] `GET /api/diagrams/parse`

### Verification
- [ ] Convex tests colocated with code (`*.test.ts` next to actions)
- [ ] API tests in `tests/api/` only for HTTP protocol behavior
- [ ] End-to-end API test: prompt → share link
- [ ] End-to-end API test: share link → tweak → new share link
- [ ] End-to-end API test: share link → restructure → new share link
- [ ] Scalar docs render correctly

## Phase 3: Tech Stack Schemas

- [ ] Extend Convex schema (components, validationRules, examples)
- [ ] Seed Palantir Foundry schema
- [ ] Implement validation engine
- [ ] Add tech stack selection to API

## Future

- [ ] Phase 4: Icon Library Generator
- [ ] Phase 5: Export Rendering (PNG/SVG/PDF via Daytona)
- [ ] Web UI with embedded Excalidraw canvas
- [ ] Auth integration with WorkOS 
- [ ] explore viability of cloudflare browser rendering api. need new experiment
