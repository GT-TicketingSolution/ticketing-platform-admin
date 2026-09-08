"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TicketLayout } from "../../data";
import { layoutsStore } from "../../_store";
import { showSuccessNotify } from "@/lib/notify";
import { LayoutEditorBody } from "../../_components/Editor";

const BACK_HREF = "/ticket-layout-management";

export default function EditTicketLayoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [errors, setErrors] = useState<{ name?: string; preset?: string }>({});

  const layout = useMemo<TicketLayout | null>(() => {
    if (!id) return null;
    return layoutsStore.getLayouts().find((l) => l.id === id) ?? null;
  }, [id]);

  useEffect(() => {
    if (!layout) {
      router.replace(BACK_HREF);
    }
  }, [layout, router]);

  if (!layout) {
    return null;
  }

  const handleSave = (next: TicketLayout) => {
    const nextErrors: { name?: string } = {};
    if (!next.name.trim()) nextErrors.name = "Name is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    layoutsStore.updatePublishedLayout(layout.id, { ...next, isDraft: false });
    showSuccessNotify(`Layout "${next.name}" updated`, "Saved");
    router.push(BACK_HREF);
  };

  const handleSaveDraft = (next: TicketLayout) => {
    layoutsStore.upsertDraft({
      ...next,
      id: layout.id,
      isDraft: true,
      updatedAt: new Date().toISOString(),
    });
    showSuccessNotify(`Draft "${next.name || "Untitled"}" saved locally`, "Saved");
    router.push(BACK_HREF);
  };

  return (
    <div style={{ width: "100%" }}>
      <div style={{ maxWidth: "1200px" }}>
        <LayoutEditorBody
          initialDraft={layout}
          errors={errors}
          isCreate={false}
          backHref={BACK_HREF}
          title={layout.name}
          subtitle={`${layout.preset} Preset · Editing`}
          actions={{
            primaryLabel: "Save Layout",
            secondaryLabel: "Save Draft",
            onPrimary: handleSave,
            onSecondary: handleSaveDraft,
          }}
        />
      </div>
    </div>
  );
}
