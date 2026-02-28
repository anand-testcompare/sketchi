import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";

interface LibraryCardProps {
  canEdit?: boolean;
  iconCount: number;
  id: string;
  name: string;
  previewUrls: string[];
  visibility?: "public" | "private";
}

export default function LibraryCard({
  canEdit = false,
  id,
  name,
  iconCount,
  previewUrls,
  visibility = "public",
}: LibraryCardProps) {
  const placeholderKeys = ["slot-1", "slot-2", "slot-3"];

  return (
    <Link href={`/library-generator/${id}`}>
      <Card className="flex h-full flex-col gap-4 rounded-2xl border-2 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-foreground/30 hover:shadow-md">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base">{name}</h3>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 font-medium text-xs ${
                visibility === "public"
                  ? "bg-emerald-100 text-emerald-900"
                  : "bg-amber-100 text-amber-900"
              }`}
            >
              {visibility}
            </span>
            <span className="rounded-full bg-secondary/80 px-2 py-0.5 font-medium text-secondary-foreground text-xs">
              {iconCount} icons
            </span>
          </div>
        </div>
        {canEdit ? null : (
          <p className="text-muted-foreground text-xs">Read-only</p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {previewUrls.length === 0
            ? placeholderKeys.map((key) => (
                <div
                  className="aspect-square rounded-xl border-2 border-muted-foreground/30 border-dashed bg-muted/5"
                  key={key}
                />
              ))
            : previewUrls.map((url, idx) => (
                <div
                  className="relative flex aspect-square items-center justify-center rounded-xl border-2 bg-muted/20"
                  key={url}
                >
                  <Image
                    alt={`${name} preview ${idx + 1}`}
                    className="object-contain p-2"
                    fill
                    sizes="96px"
                    src={url}
                    unoptimized
                  />
                </div>
              ))}
        </div>
      </Card>
    </Link>
  );
}
