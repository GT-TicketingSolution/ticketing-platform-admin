"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESET_PRESETS, TicketLayout } from "../data";
import { layoutsStore } from "../_store";
import { showSuccessNotify } from "@/lib/notify";
import { useProfileQuery } from "@/hooks/useAuthQueries";
import { LayoutEditorBody } from "../_components/Editor";

const BACK_HREF = "/ticket-layout-management";

export default function NewTicketLayoutPage() {
  const router = useRouter();
  const { data } = useProfileQuery();
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
      businessName: data?.profile?.businessName || "",
      logoUrl: null,
      fontFamily: seed.fontFamily,
      sections: { ...seed.sections },
      sectionOrder: [...seed.sectionOrder],
      customSections: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [data?.profile?.businessName]);

  const handleCreate = (next: TicketLayout) => {
    const nextErrors: { name?: string } = {};
    if (!next.name.trim()) nextErrors.name = "Name is required";
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
      <div style={{ maxWidth: "1200px" }}>
        <LayoutEditorBody
          initialDraft={initialDraft}
          errors={errors}
          isCreate={true}
          backHref={BACK_HREF}
          title="Create New Layout"
          subtitle="Fill in the layout name to get started"
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
