import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const t = convexTest(schema, modules);
const authed = t.withIdentity({
  subject: "test-user-icon-libraries",
  email: "icon-libraries@example.com",
});
const publicLibraryEditor = t.withIdentity({
  subject: "public-library-editor",
  email: "anand@shpit.dev",
});
const otherAuthed = t.withIdentity({
  subject: "different-user-icon-libraries",
  email: "different-icon-libraries@example.com",
});

const baseStyleSettings = {
  strokeColor: "#000000",
  backgroundColor: "transparent",
  strokeWidth: 2,
  strokeStyle: "solid" as const,
  fillStyle: "hachure" as const,
  opacity: 100,
};

describe("iconLibraries", () => {
  test("create defaults roughness to 0.4", async () => {
    const id = await authed.mutation(api.iconLibraries.create, {
      name: "Test Lib",
    });
    const data = await authed.query(api.iconLibraries.get, { id });
    expect(data).not.toBeNull();
    if (!data) {
      throw new Error("expected icon library data");
    }

    expect(data.library.styleSettings.roughness).toBeCloseTo(0.4, 5);
  });

  test("update clamps roughness to <= 2", async () => {
    const id = await authed.mutation(api.iconLibraries.create, {
      name: "Clamp Lib",
    });
    await authed.mutation(api.iconLibraries.update, {
      id,
      styleSettings: { ...baseStyleSettings, roughness: 5 },
    });

    const data = await authed.query(api.iconLibraries.get, { id });
    expect(data).not.toBeNull();
    if (!data) {
      throw new Error("expected icon library data");
    }
    expect(data.library.styleSettings.roughness).toBe(2);
  });

  test("update clamps roughness to >= 0", async () => {
    const id = await authed.mutation(api.iconLibraries.create, {
      name: "Clamp Lib 2",
    });
    await authed.mutation(api.iconLibraries.update, {
      id,
      styleSettings: { ...baseStyleSettings, roughness: -1 },
    });

    const data = await authed.query(api.iconLibraries.get, { id });
    expect(data).not.toBeNull();
    if (!data) {
      throw new Error("expected icon library data");
    }
    expect(data.library.styleSettings.roughness).toBe(0);
  });

  test("non-allowlisted users cannot create public libraries", async () => {
    await expect(
      authed.mutation(api.iconLibraries.create, {
        name: "Public Lib",
        visibility: "public",
      })
    ).rejects.toThrow("Forbidden");
  });

  test("allowlisted public library editors can create and edit public libraries", async () => {
    const viewer = await publicLibraryEditor.query(api.users.me, {});
    expect(viewer.identity.canManagePublicIconLibraries).toBe(true);

    const id = await publicLibraryEditor.mutation(api.iconLibraries.create, {
      name: "Public Lib",
      visibility: "public",
    });

    const editorView = await publicLibraryEditor.query(api.iconLibraries.get, {
      id,
    });
    expect(editorView).not.toBeNull();
    if (!editorView) {
      throw new Error("expected public library data");
    }

    expect(editorView.permissions.canEdit).toBe(true);
    expect(editorView.permissions.isPublic).toBe(true);

    await publicLibraryEditor.mutation(api.iconLibraries.update, {
      id,
      name: "Public Lib Updated",
      visibility: "public",
      styleSettings: { ...baseStyleSettings, roughness: 1.2 },
    });

    const updated = await publicLibraryEditor.query(api.iconLibraries.get, {
      id,
    });
    expect(updated?.library.name).toBe("Public Lib Updated");
    expect(updated?.permissions.canEdit).toBe(true);
  });

  test("public libraries remain read-only for signed-in users outside the allowlist", async () => {
    const id = await publicLibraryEditor.mutation(api.iconLibraries.create, {
      name: "Readonly Public Lib",
      visibility: "public",
    });

    const viewerData = await otherAuthed.query(api.iconLibraries.get, { id });
    expect(viewerData).not.toBeNull();
    if (!viewerData) {
      throw new Error("expected public library data");
    }

    expect(viewerData.permissions.canEdit).toBe(false);
    await expect(
      otherAuthed.mutation(api.iconLibraries.update, {
        id,
        name: "Should Fail",
      })
    ).rejects.toThrow("Forbidden");
  });

  test("allowlisted editors can edit public libraries without a local user row", async () => {
    const id = await publicLibraryEditor.mutation(api.iconLibraries.create, {
      name: "Seed Public Lib",
      visibility: "public",
    });

    const freshAllowlistedViewer = t.withIdentity({
      subject: "fresh-public-library-editor",
      email: "anand@shpit.dev",
    });

    const viewer = await freshAllowlistedViewer.query(api.iconLibraries.get, {
      id,
    });
    expect(viewer).not.toBeNull();
    if (!viewer) {
      throw new Error("expected public library data");
    }

    expect(viewer.permissions.canEdit).toBe(true);
    expect(viewer.permissions.isPublic).toBe(true);
  });
});
