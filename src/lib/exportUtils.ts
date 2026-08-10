export interface XLSSection {
  title: string;
  headers: string[];
  rows: (string | number)[][];
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
}
