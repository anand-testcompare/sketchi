import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StyleSettings } from "@/lib/icon-library/svg-to-excalidraw";

const fillStyles = ["solid", "hachure", "cross-hatch", "zigzag"] as const;

interface StyleControlsProps {
  value: StyleSettings;
  onChange: (next: StyleSettings) => void;
}

export default function StyleControls({ value, onChange }: StyleControlsProps) {
  const update = <K extends keyof StyleSettings>(
    key: K,
    next: StyleSettings[K]
  ) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="grid gap-2">
      <div className="grid gap-2">
        <Label className="text-xs" htmlFor="roughness">
          Roughness
        </Label>
        <Input
          id="roughness"
          max={10}
          min={0}
          onChange={(event) =>
            update("roughness", Number(event.target.value) || 0)
          }
          step={0.5}
          type="number"
          value={value.roughness}
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs" htmlFor="bowing">
          Bowing
        </Label>
        <Input
          id="bowing"
          max={10}
          min={0}
          onChange={(event) =>
            update("bowing", Number(event.target.value) || 0)
          }
          step={0.5}
          type="number"
          value={value.bowing}
        />
      </div>
      <div className="grid gap-2">
        <Label className="text-xs" htmlFor="fillStyle">
          Fill style
        </Label>
        <select
          className="h-9 rounded-none border border-input bg-background px-2 text-xs"
          id="fillStyle"
          onChange={(event) =>
            update(
              "fillStyle",
              event.target.value as StyleSettings["fillStyle"]
            )
          }
          value={value.fillStyle}
        >
          {fillStyles.map((style) => (
            <option key={style} value={style}>
              {style}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={value.randomize}
            id="randomize"
            onCheckedChange={(checked) => update("randomize", checked === true)}
          />
          <Label className="text-muted-foreground text-xs" htmlFor="randomize">
            Randomize hatch angle
          </Label>
        </div>
      </div>
      <div className="grid gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={value.pencilFilter}
            id="pencilFilter"
            onCheckedChange={(checked) =>
              update("pencilFilter", checked === true)
            }
          />
          <Label
            className="text-muted-foreground text-xs"
            htmlFor="pencilFilter"
          >
            Pencil filter
          </Label>
        </div>
      </div>
    </div>
  );
}
