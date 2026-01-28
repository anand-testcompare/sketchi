# Prompt to Intermediate E2E Test Results

| Metric | Value |
|--------|-------|
| **Pass Rate** | 3/3 (100%) |
| **Created** | 2026-01-28T06:45:32.541Z |
| **Total Tokens** | 7,776 |
| **Avg Duration** | 11.9s |

## Convex Integration

| Property | Value |
|----------|-------|
| **Action** | `generateIntermediateFromPrompt` |
| **Module** | `convex/diagramGenerateIntermediateFromPrompt.ts` |
| **Generator** | `lib/agents/intermediate-generator.ts` |
| **Profile** | `general` (extensible registry) |
| **Pattern** | AI SDK v6 ToolLoopAgent + Output.object() |
| **Max Iterations** | 5 (validation retry loop) |

## Results

| Scenario | Status | Tokens | Duration | Nodes | Edges | PNG | Excalidraw |
|:---------|:------:|-------:|---------:|------:|------:|----:|:----------:|
| SME interview (pharma) | PASS | 3,008 | 14.4s | 7 | 8 | 104KB | [view](https://excalidraw.com/#json=O-3OKkn9CBniu4jWLqlg-,yynmlQxJkW9B1okuEuVbbA) |
| Rambling tech narration | PASS | 2,231 | 9.1s | 9 | 10 | 112KB | [view](https://excalidraw.com/#json=1VxPCrO8ZPoJjqifudAYF,tBWYSdNDV9KBkpLX49BzlQ) |
| Adversarial (short prompt) | PASS | 2,537 | 12.3s | 10 | 11 | 139KB | [view](https://excalidraw.com/#json=AvoOXtrVxr0x72XJJo_lL,_0LHL5y-h2_Hn_Q-tkRshg) |

## Artifacts

| Scenario | JSON | PNG | Created |
|:---------|:-----|:----|:--------|
| SME interview (pharma) | `prompt-intermediate-pharma-interview.json` | `prompt-intermediate-pharma-interview.png` | 06:45:32 |
| Rambling tech narration | `prompt-intermediate-rambling-tech.json` | `prompt-intermediate-rambling-tech.png` | 06:45:27 |
| Adversarial (short prompt) | `prompt-intermediate-short-prompt.json` | `prompt-intermediate-short-prompt.png` | 06:45:30 |

## Validation

| Check | Status |
|:------|:------:|
| IntermediateFormat schema | PASS |
| Referential integrity (edge→node) | PASS |
| Semantic validation (nodes/edges naming) | PASS |
| Profile-specific rules | PASS |
| No Excalidraw terminology in output | PASS |
