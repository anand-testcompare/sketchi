# @sketchi-app/opencode-excalidraw

OpenCode plugin for generating and manipulating Excalidraw diagrams via Sketchi.

## Quickstart

1. Add the plugin to your `opencode.jsonc`:

```jsonc
{
  "plugins": ["@sketchi-app/opencode-excalidraw"]
}
```

2. Install the package:

```bash
npm i @sketchi-app/opencode-excalidraw
```

3. Install Playwright browsers once per machine (required for `diagram_to_png`):

```bash
npx playwright install
```

## Usage

The plugin exposes tools:

- `diagram_from_prompt`
- `diagram_tweak`
- `diagram_restructure`
- `diagram_to_png`
- `diagram_grade`

## Configuration

Optional env override:

- `SKETCHI_API_URL` (defaults to `https://sketchi.app`)

## Links

- npm: https://www.npmjs.com/package/@sketchi-app/opencode-excalidraw
- GitHub: https://github.com/anand-testcompare/sketchi/tree/main/packages/opencode-excalidraw
