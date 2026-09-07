"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_PRESETS, TicketLayout } from "../data";
import { layoutsStore } from "../_store";
import { showSuccessNotify } from "@/lib/notify";
import {
  EditorPageHeader,
  LayoutEditorBody,
} from "../_components/Editor";

const BACK_HREF = "/ticket-layout-management";

export default function NewTicketLayoutPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<{ name?: string; preset?: string }>({});

  const initialDraft = useMemo<TicketLayout>(() => {
    const seed = PRESET_PRESETS.Classic;
    return {
      id: `tpl_${Date.now()}`,
      name: "",
      preset: "Classic",
      isActive: true,
      isDefault: false,
      isDraft: true,
      businessName: "Your Business Name",
      logoUrl: null,
      fontFamily: seed.fontFamily,
      sections: { ...seed.sections },
      sectionOrder: [...seed.sectionOrder],
      customSections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, []);

  const handleCreate = (next: TicketLayout) => {
    const nextErrors: { name?: string; preset?: string } = {};
    if (!next.name.trim()) nextErrors.name = "Name is required";
    if (!next.preset) nextErrors.preset = "Preset is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    const newLayout: TicketLayout = {
      ...next,
      isDraft: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    layoutsStore.addPublishedLayout(newLayout);
    showSuccessNotify(`Layout "${newLayout.name}" created`, "Created");
    router.push(BACK_HREF);
  };

  const handleSaveDraft = (next: TicketLayout) => {
    // Save Draft: NO validation. Persist whatever the user has typed.
    layoutsStore.upsertDraft({
      ...next,
      isDraft: true,
      updatedAt: new Date().toISOString(),
    });
    showSuccessNotify(`Draft "${next.name || "Untitled"}" saved locally`, "Saved");
    router.push(BACK_HREF);
  };

  return (
    <div style={{ width: "100%" }}>
      <EditorPageHeader
        title="Create New Ticket Layout"
        subtitle="Fill in the required fields. Use Save Draft to keep working later without publishing."
        backHref={BACK_HREF}
      />
      <div style={{ maxWidth: "1200px" }}>
        <LayoutEditorBody
          initialDraft={initialDraft}
          errors={errors}
          actions={{
            primaryLabel: "Create Layout",
            secondaryLabel: "Save Draft",
            onPrimary: handleCreate,
            onSecondary: handleSaveDraft,
          }}
        />
      </div>
    </div>
  );
}
