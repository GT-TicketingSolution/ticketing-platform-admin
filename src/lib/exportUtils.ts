export type ExportScope = "current" | "all";

export interface XLSSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface TablePDFColumn<T> {
  header: string;
  accessor?: keyof T | ((item: T, index: number) => string | number | boolean | null | undefined);
  align?: "left" | "center" | "right";
  width?: string;
  renderCell?: (item: T, index: number) => string;
}

export interface TablePDFSummaryCard {
  label: string;
  value: string | number;
}

export interface TablePDFOptions<T> {
  title: string;
  subtitle?: string;
  filterInfo?: string;
  scope?: ExportScope;
  currentPage?: number;
  filename: string;
  columns: TablePDFColumn<T>[];
  data: T[];
  summaryCards?: TablePDFSummaryCard[];
  orientation?: "portrait" | "landscape";
  brandingTitle?: string;
}

/**
 * Loads html2pdf.js dynamically if not already available on window
 */
export async function loadHtml2Pdf(): Promise<any> {
  if (typeof window === "undefined") return null;
  if ((window as any).html2pdf) {
    return (window as any).html2pdf;
  }
  return new Promise<any>((resolve, reject) => {
    const existing = document.querySelector('script[src*="html2pdf"]');
    if (existing) {
      existing.addEventListener("load", () => resolve((window as any).html2pdf));
      existing.addEventListener("error", () => reject(new Error("Failed to load html2pdf script")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = () => resolve((window as any).html2pdf);
    script.onerror = () => reject(new Error("Failed to load html2pdf script"));
    document.head.appendChild(script);
  });
}

/**
 * Helper to render status badge HTML in PDF tables
 */
export function renderStatusBadgeHTML(status: string): string {
  const norm = String(status || "").toUpperCase();
  let bg = "#FFF8D9";
  let color = "#D97706";

  if (["CONFIRMED", "SUCCESS", "SUCCESSFUL", "ACTIVE", "PAID"].includes(norm)) {
    bg = "#B5FFE7";
    color = "#119167";
  } else if (["CANCELLED", "FAILED", "DISABLED", "SUSPENDED", "INACTIVE"].includes(norm)) {
    bg = "#FEE2E2";
    color = "#DC2626";
  }

  return `<span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${bg}; color: ${color};">${status}</span>`;
}

/**
 * Generates and downloads a branded, styled PDF tabular report
 */
export async function exportTableToPDF<T>(options: TablePDFOptions<T>): Promise<void> {
  const {
    title,
    subtitle,
    filterInfo,
    scope,
    currentPage,
    filename,
    columns,
    data,
    summaryCards,
    orientation = "landscape",
    brandingTitle = "TICKETING PLATFORM",
  } = options;

  await loadHtml2Pdf();

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const scopeLabel = scope === "all" ? "All Records" : currentPage ? `Page ${currentPage}` : "Current Page";
  const filterLabel = filterInfo ? ` | ${filterInfo}` : "";

  // Table header HTML
  const theadHtml = columns
    .map(
      (col) =>
        `<th style="padding: 8px 10px; text-align: ${col.align || "left"}; ${
          col.width ? `width: ${col.width};` : ""
        }">${col.header}</th>`
    )
    .join("");

  // Table rows HTML
  const rowsHtml = data
    .map((item, rowIdx) => {
      const cellsHtml = columns
        .map((col) => {
          let cellContent: string = "";
          if (col.renderCell) {
            cellContent = col.renderCell(item, rowIdx);
          } else if (typeof col.accessor === "function") {
            const val = col.accessor(item, rowIdx);
            cellContent = val !== undefined && val !== null ? String(val) : "-";
          } else if (col.accessor) {
            const val = item[col.accessor];
            cellContent = val !== undefined && val !== null ? String(val) : "-";
          }
          return `<td style="padding: 8px 10px; text-align: ${col.align || "left"};">${cellContent}</td>`;
        })
        .join("");

      return `<tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px; ${
        rowIdx % 2 === 1 ? "background: #FAFAFA;" : "background: #FFFFFF;"
      }">${cellsHtml}</tr>`;
    })
    .join("");

  // Summary box HTML
  let summaryHtml = "";
  if (summaryCards && summaryCards.length > 0) {
    const cardsHtml = summaryCards
      .map(
        (sc) =>
          `<td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #0C2A42;">
            ${sc.label}: <span style="font-size: 13px; color: #1E293B;">${sc.value}</span>
          </td>`
      )
      .join("");

    summaryHtml = `
      <table style="width: 100%; border-collapse: collapse; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; margin-top: 14px;">
        <tr>${cardsHtml}</tr>
      </table>
    `;
  }

  const reportHtml = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
      <!-- Header Banner -->
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
        <tr>
          <td style="vertical-align: top;">
            <div style="font-size: 20px; font-weight: bold; color: #0C2A42; letter-spacing: 0.5px;">${brandingTitle}</div>
            <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">${title} (${scopeLabel}${filterLabel})</div>
            ${subtitle ? `<div style="font-size: 11px; color: #4B5563; margin-top: 1px;">${subtitle}</div>` : ""}
            <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Generated: ${dateLabel}</div>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <div style="font-size: 11px; color: #6B7280;">Total Records: <strong style="color: #0C2A42; font-size: 13px;">${data.length}</strong></div>
          </td>
        </tr>
      </table>

      <!-- Data Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px;">
        <thead>
          <tr style="background: #F1F5F9; color: #374151; font-weight: bold; border-bottom: 2px solid #CBD5E1;">
            ${theadHtml}
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Summary Footer -->
      ${summaryHtml}
    </div>
  `;

  const containerWidth = orientation === "landscape" ? "820px" : "700px";
  const element = document.createElement("div");
  element.style.width = containerWidth;
  element.innerHTML = reportHtml;
  document.body.appendChild(element);

  const cleanFilename = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  const opt = {
    margin: [10, 10, 10, 10],
    filename: cleanFilename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation },
  };

  try {
    await (window as any).html2pdf().set(opt).from(element).save();
  } finally {
    document.body.removeChild(element);
  }
}

/**
 * Generates and downloads a single-table CSV/Excel file
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const headerLine = headers.map((h) => `"${String(h ?? "").replace(/"/g, '""')}"`).join(",");
  const rowLines = rows.map((row) =>
    row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
  );

  const content = [headerLine, ...rowLines].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename.endsWith(".csv") ? filename : `${filename}.csv`}`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a single-table CSV file from structured objects
 */
export function exportTableToCSV<T>(options: {
  filename: string;
  columns: { header: string; accessor: keyof T | ((item: T, index: number) => string | number | boolean | null | undefined) }[];
  data: T[];
}) {
  const headers = options.columns.map((c) => c.header);
  const rows = options.data.map((item, idx) =>
    options.columns.map((c) => {
      if (typeof c.accessor === "function") {
        return c.accessor(item, idx);
      }
      const val = item[c.accessor];
      return val as string | number | boolean | null | undefined;
    })
  );
  exportToCSV(options.filename, headers, rows);
}

/**
 * Generates and downloads a multi-section tabular XLS/CSV file for Excel
 */
export function exportMultiSectionXLS(filename: string, sections: XLSSection[]) {
  let content = "";

  sections.forEach((section) => {
    content += `=== ${section.title.toUpperCase()} ===\n`;
    content += section.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";

    section.rows.forEach((row) => {
      content +=
        row
          .map((cell) => {
            const str = String(cell ?? "");
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(",") + "\n";
    });

    content += "\n";
  });

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ScopedExportConfig<T> {
  scope: ExportScope;
  exportType: "pdf" | "excel";
  entityName: string;
  fetchData: (scope: ExportScope) => Promise<T[]>;
  onExport: (items: T[], scope: ExportScope) => Promise<void> | void;
  setIsLoading: (loading: boolean) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

/**
 * Helper to fetch all pages from a paginated API endpoint for exports
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; pagination?: { totalPages?: number; total?: number } }>,
  pageSize = 100
): Promise<T[]> {
  const firstPage = await fetchPage(1, pageSize);
  const totalPages = firstPage.pagination?.totalPages ?? 1;
  let allItems: T[] = Array.isArray(firstPage.items) ? [...firstPage.items] : [];

  if (totalPages > 1) {
    const pagePromises: Promise<{ items: T[]; pagination?: { totalPages?: number; total?: number } }>[] = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(fetchPage(p, pageSize));
    }
    const otherPages = await Promise.all(pagePromises);
    for (const pageRes of otherPages) {
      if (pageRes?.items && Array.isArray(pageRes.items)) {
        allItems = allItems.concat(pageRes.items);
      }
    }
  }

  return allItems;
}

