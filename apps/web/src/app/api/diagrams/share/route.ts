import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { error: "Not implemented", endpoint: "/api/diagrams/share" },
    { status: 404 }
  );
}
