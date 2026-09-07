/**
 * In-memory store for ticket layouts + drafts.
 *
 * The list page, the create page, and the edit page all need a shared view
 * of the layouts and drafts. The simplest cross-page way to share state
 * without a real backend is a singleton module that lives for the duration
 * of the browser session. Pages subscribe to it and rerender on changes.
 *
 * Drafts are additionally persisted to localStorage (see ./data.ts) so
 * they survive page reloads.
 */

import {
  MOCK_TICKET_LAYOUTS,
  TicketLayout,
  loadDrafts,
  saveDrafts,
} from "./data";

type Listener = () => void;

interface StoreState {
  layouts: TicketLayout[];
  drafts: TicketLayout[];
  // Whether localStorage has been hydrated into drafts yet.
  draftsHydrated: boolean;
}

const state: StoreState = {
  layouts: [...MOCK_TICKET_LAYOUTS],
  drafts: [],
  draftsHydrated: false,
};

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export const layoutsStore = {
  getLayouts(): TicketLayout[] {
    return state.layouts;
  },

  getDrafts(): TicketLayout[] {
    if (!state.draftsHydrated && typeof window !== "undefined") {
      state.drafts = loadDrafts();
      state.draftsHydrated = true;
    }
    return state.drafts;
  },

  // ── Mutations ────────────────────────────────────────────────────────

  addPublishedLayout(layout: TicketLayout): void {
    state.layouts = [...state.layouts, layout];
    // Promoting from draft: also remove it from drafts.
    state.drafts = state.drafts.filter((d) => d.id !== layout.id);
    if (typeof window !== "undefined") saveDrafts(state.drafts);
    notify();
  },

  updatePublishedLayout(id: string, patch: Partial<TicketLayout>): void {
    state.layouts = state.layouts.map((l) =>
      l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l,
    );
    // If a draft was promoted by editing, drop it from drafts.
    state.drafts = state.drafts.filter((d) => d.id !== id);
    if (typeof window !== "undefined") saveDrafts(state.drafts);
    notify();
  },

  removePublishedLayout(id: string): void {
    state.layouts = state.layouts.filter((l) => l.id !== id);
    notify();
  },

  setDefault(id: string): void {
    state.layouts = state.layouts.map((l) => ({ ...l, isDefault: l.id === id }));
    notify();
  },

  toggleActive(id: string): void {
    state.layouts = state.layouts.map((l) =>
      l.id === id ? { ...l, isActive: !l.isActive } : l,
    );
    notify();
  },

  // ── Drafts ───────────────────────────────────────────────────────────

  upsertDraft(draft: TicketLayout): void {
    state.draftsHydrated = true;
    const idx = state.drafts.findIndex((d) => d.id === draft.id);
    const next =
      idx >= 0
        ? state.drafts.map((d) => (d.id === draft.id ? draft : d))
        : [...state.drafts, draft];
    state.drafts = next;
    if (typeof window !== "undefined") saveDrafts(next);
    notify();
  },

  removeDraft(id: string): void {
    state.draftsHydrated = true;
    state.drafts = state.drafts.filter((d) => d.id !== id);
    if (typeof window !== "undefined") saveDrafts(state.drafts);
    notify();
  },

  // ── Subscription ─────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
