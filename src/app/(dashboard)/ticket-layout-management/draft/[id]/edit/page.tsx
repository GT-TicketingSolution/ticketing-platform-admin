"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TicketLayout } from "../../../data";
import { layoutsStore } from "../../../_store";
import { showSuccessNotify } from "@/lib/notify";
import {
  EditorPageHeader,
  LayoutEditorBody,
} from "../../../_components/Editor";

const BACK_HREF = "/ticket-layout-management";

export default function ContinueDraftPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [errors, setErrors] = useState<{ name?: string; preset?: string }>({});

  const draft = useMemo<TicketLayout | null>(() => {
    if (!id) return null;
    return layoutsStore.getDrafts().find((d) => d.id === id) ?? null;
  }, [id]);

  useEffect(() => {
    if (!draft) {
      router.replace(BACK_HREF);
    }
  }, [draft, router]);

  if (!draft) {
    return null;
  }

  const handlePublish = (next: TicketLayout) => {
    // Publish requires name + preset (same as Create).
    const nextErrors: { name?: string; preset?: string } = {};
    if (!next.name.trim()) nextErrors.name = "Name is required";
    if (!next.preset) nextErrors.preset = "Preset is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    const newLayout: TicketLayout = {
      ...next,
      id: draft.id, // preserve id so any references stay stable
      isDraft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    layoutsStore.addPublishedLayout(newLayout);
    showSuccessNotify(`Layout "${newLayout.name}" published`, "Published");
    router.push(BACK_HREF);
  };

  const handleSaveDraft = (next: TicketLayout) => {
    // Save Draft: NO validation. Update the existing draft in place.
    layoutsStore.upsertDraft({
      ...next,
      id: draft.id,
      isDraft: true,
      updatedAt: new Date().toISOString(),
    });
    showSuccessNotify(`Draft "${next.name || "Untitled"}" updated`, "Saved");
    router.push(BACK_HREF);
  };

  return (
    <div style={{ width: "100%" }}>
      <EditorPageHeader
        title="Continue Draft"
        subtitle={draft.name ? `"${draft.name}" — stored locally` : "Stored locally"}
        backHref={BACK_HREF}
      />
      <div style={{ maxWidth: "1200px" }}>
        <LayoutEditorBody
          initialDraft={draft}
          errors={errors}
          actions={{
            primaryLabel: "Publish Layout",
            secondaryLabel: "Save Draft",
            onPrimary: handlePublish,
            onSecondary: handleSaveDraft,
          }}
        />
      </div>
    </div>
  );
}
