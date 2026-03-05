import { useRef } from "react";

import { Button } from "@/components/ui/button";

interface SvgUploaderProps {
  disabled?: boolean;
  isUploading: boolean;
  onUpload: (files: FileList) => Promise<void>;
  statusText?: string;
}

export default function SvgUploader({
  disabled = false,
  isUploading,
  onUpload,
  statusText = "SVG only, max 256KB each",
}: SvgUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    await onUpload(event.target.files);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isUploading || disabled}
          onClick={() => inputRef.current?.click()}
          size="sm"
          type="button"
        >
          {isUploading ? "Uploading…" : "Upload SVGs"}
        </Button>
        <span className="text-muted-foreground text-xs">{statusText}</span>
      </div>
      <input
        accept="image/svg+xml"
        className="hidden"
        data-testid="svg-file-input"
        multiple
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}
