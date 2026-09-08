"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TicketLayout } from "../../../data";
import { layoutsStore } from "../../../_store";
import { showSuccessNotify } from "@/lib/notify";
import { LayoutEditorBody } from "../../../_components/Editor";

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
    const nextErrors: { name?: string } = {};
    if (!next.name.trim()) nextErrors.name = "Name is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    const newLayout: TicketLayout = {
      ...next,
      id: draft.id,
      isDraft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    layoutsStore.addPublishedLayout(newLayout);
    showSuccessNotify(`Layout "${newLayout.name}" published`, "Published");
    router.push(BACK_HREF);
  };

  const handleSaveDraft = (next: TicketLayout) => {
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
      <div style={{ maxWidth: "1200px" }}>
        <LayoutEditorBody
          initialDraft={draft}
          errors={errors}
          isCreate={false}
          backHref={BACK_HREF}
          title={draft.name ? `"${draft.name}"` : "Continue Draft"}
          subtitle={draft.name ? "Stored locally · Draft" : "Stored locally"}
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
