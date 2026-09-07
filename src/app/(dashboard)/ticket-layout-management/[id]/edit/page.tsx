"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TicketLayout } from "../../data";
import { layoutsStore } from "../../_store";
import { showSuccessNotify } from "@/lib/notify";
import {
  EditorPageHeader,
  LayoutEditorBody,
} from "../../_components/Editor";

const BACK_HREF = "/ticket-layout-management";

export default function EditTicketLayoutPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [errors, setErrors] = useState<{ name?: string; preset?: string }>({});

  // Look the layout up from the store. If it's not in the in-memory list
  // (e.g. a hard refresh), bail out to the list page.
  const layout = useMemo<TicketLayout | null>(() => {
    if (!id) return null;
    return layoutsStore.getLayouts().find((l) => l.id === id) ?? null;
  }, [id]);

  // Redirect to the list if the layout no longer exists.
  useEffect(() => {
    if (!layout) {
      router.replace(BACK_HREF);
    }
  }, [layout, router]);

  if (!layout) {
    return null;
  }

  const handleSave = (next: TicketLayout) => {
    const nextErrors: { name?: string; preset?: string } = {};
    if (!next.name.trim()) nextErrors.name = "Name is required";
    if (!next.preset) nextErrors.preset = "Preset is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    layoutsStore.updatePublishedLayout(layout.id, { ...next, isDraft: false });
    showSuccessNotify(`Layout "${next.name}" updated`, "Saved");
    router.push(BACK_HREF);
  };

  return (
    <div style={{ width: "100%" }}>
      <EditorPageHeader
        title="Edit Ticket Layout"
        subtitle={layout.name}
        backHref={BACK_HREF}
      />
      <div style={{ maxWidth: "1200px" }}>
        <LayoutEditorBody
          initialDraft={layout}
          errors={errors}
          actions={{
            primaryLabel: "Save Layout",
            onPrimary: handleSave,
          }}
        />
      </div>
    </div>
  );
}
