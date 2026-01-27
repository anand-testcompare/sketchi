import JSZip from "jszip";
import { ChevronDown, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type StyleSettings,
  svgToExcalidrawElements,
} from "@/lib/icon-library/svg-to-excalidraw";

export interface ExportIconItem {
  name: string;
  url: string | null;
}

interface ExportButtonProps {
  libraryName: string;
  icons: ExportIconItem[];
  styleSettings: StyleSettings;
}

const randomId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "library";

export default function ExportButton({
  libraryName,
  icons,
  styleSettings,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcalidraw = async () => {
    if (icons.length === 0) {
      toast.error("Add at least one icon before exporting.");
      return;
    }

    setIsExporting(true);

    try {
      const libraryItems = [] as Array<{
        id: string;
        status: "published";
        created: number;
        name?: string;
        elements: ReturnType<typeof svgToExcalidrawElements>;
      }>;

      for (const icon of icons) {
        if (!icon.url) {
          throw new Error(`Missing icon URL for ${icon.name}.`);
        }
        const response = await fetch(icon.url);
        if (!response.ok) {
          throw new Error(`Failed to load ${icon.name}.`);
        }
        const svgText = await response.text();
        const elements = svgToExcalidrawElements(
          svgText,
          styleSettings,
          icon.name
        );

        libraryItems.push({
          id: randomId(),
          status: "published",
          created: Date.now(),
          name: icon.name,
          elements,
        });
      }

      const payload = {
        type: "excalidrawlib",
        version: 2,
        source: "https://excalidraw.com",
        libraryItems,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/vnd.excalidrawlib+json",
      });

      const fileName = `${sanitizeFileName(libraryName)}.excalidrawlib`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed unexpectedly.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    if (icons.length === 0) {
      toast.error("Add at least one icon before exporting.");
      return;
    }

    setIsExporting(true);

    try {
      const zip = new JSZip();

      for (const icon of icons) {
        if (!icon.url) {
          throw new Error(`Missing icon URL for ${icon.name}.`);
        }
        const response = await fetch(icon.url);
        if (!response.ok) {
          throw new Error(`Failed to load ${icon.name}.`);
        }
        const svgText = await response.text();
        const safeName = sanitizeFileName(icon.name);
        zip.file(`${safeName}.svg`, svgText);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const fileName = `${sanitizeFileName(libraryName)}.zip`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Downloaded ${icons.length} icons as ZIP.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Export failed unexpectedly.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  const disabled = isExporting || icons.length === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm shadow-xs transition-all hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        disabled={disabled}
      >
        <Download className="size-4" />
        {isExporting ? "Exporting..." : "Export"}
        <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={disabled} onClick={handleExportExcalidraw}>
          Export as .excalidrawlib
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onClick={handleExportZip}>
          Export as ZIP (SVGs)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
