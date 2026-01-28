# Prompt to Intermediate E2E Test Results

- Pass rate: 2/3
- Created: 2026-01-28T20:00:22.968Z

## Summary Table

| Scenario | Status | Tokens | Duration | Nodes | Edges | PNG Size | Share URL |
|----------|--------|--------|----------|-------|-------|----------|-----------|
| SME interview transcript (pharma batch disposition) | PASS | 2556 | 11835ms | 7 | 7 | 92KB | [SME interview transcript (pharma batch disposition) diagram](https://excalidraw.com/#json=HuULRM1beXFVTxVcfWxJZ,iJhP0vYMvQE--wiKFlfxxg) |
| Rambling technical narration with mid-course correction | FAIL | n/a | 23506ms | n/a | n/a | n/a | n/a |
| Adversarial edge case (very short prompt) | PASS | 2444 | 10736ms | 9 | 11 | 126KB | [Adversarial edge case (very short prompt) diagram](https://excalidraw.com/#json=HPyuyAVi-iyN6cI_zPDFp,WHpvSn07xqs2luY7nyhyeQ) |

## Scenario Details

### SME interview transcript (pharma batch disposition)
- Status: passed
- Duration: 11835ms
- Tokens: 2556
- Nodes: 7
- Edges: 7
- PNG Size: 93870 bytes
- JSON: prompt-intermediate-pharma-interview.json
- PNG: prompt-intermediate-pharma-interview.png
- Share URL: [SME interview transcript (pharma batch disposition) diagram](https://excalidraw.com/#json=HuULRM1beXFVTxVcfWxJZ,iJhP0vYMvQE--wiKFlfxxg)
- Error: none
- Created: 2026-01-28T20:00:11.297Z

### Rambling technical narration with mid-course correction
- Status: failed
- Duration: 23506ms
- Tokens: n/a
- Nodes: n/a
- Edges: n/a
- PNG Size: n/a
- JSON: n/a
- PNG: n/a
- Share URL: n/a
- Error: Invalid edge references: Missing toId node: user-service, Missing toId node: product-service, Missing toId node: order-service, Missing fromId node: user-service, Missing toId node: redis-cache, Missing fromId node: product-service, Missing toId node: redis-cache, Missing fromId node: order-service, Missing toId node: redis-cache, Missing fromId node: redis-cache, Missing toId node: user-db, Missing fromId node: redis-cache, Missing toId node: product-db, Missing fromId node: redis-cache, Missing toId node: order-db
- Created: 2026-01-28T20:00:22.968Z

### Adversarial edge case (very short prompt)
- Status: passed
- Duration: 10736ms
- Tokens: 2444
- Nodes: 9
- Edges: 11
- PNG Size: 128948 bytes
- JSON: prompt-intermediate-short-prompt.json
- PNG: prompt-intermediate-short-prompt.png
- Share URL: [Adversarial edge case (very short prompt) diagram](https://excalidraw.com/#json=HPyuyAVi-iyN6cI_zPDFp,WHpvSn07xqs2luY7nyhyeQ)
- Error: none
- Created: 2026-01-28T20:00:10.198Z
