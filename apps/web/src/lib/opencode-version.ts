import opencodePackage from "../../../../packages/opencode-excalidraw/package.json";

const rawVersion =
  typeof opencodePackage.version === "string"
    ? opencodePackage.version.trim()
    : "";

export const opencodePluginVersion = rawVersion || "latest";
export const opencodePluginVersionLabel =
  opencodePluginVersion === "latest" ? "latest" : `v${opencodePluginVersion}`;
