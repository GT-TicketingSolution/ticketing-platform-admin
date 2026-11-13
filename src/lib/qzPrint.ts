/**
 * QZ Tray Silent Printing Utility
 *
 * QZ Tray is a free local desktop agent installed on the POS machine.
 * It listens on a local WebSocket (ports 8181/8282) and lets the web app
 * send print jobs directly to a named physical printer — NO print dialog shown.
 *
 * Download QZ Tray (install once on POS): https://qz.io/download/
 *
 * If QZ Tray is not running, printViaQZ() returns false so the caller can
 * fall back to the browser iframe print.
 */

declare global {
  interface Window {
    qz?: any;
  }
}

/** Dynamically load the QZ Tray JS client from CDN once */
async function loadQzScript(): Promise<any> {
  if (typeof window === "undefined") return null;
  if (window.qz) return window.qz;

  return new Promise((resolve) => {
    if (document.getElementById("qz-tray-script")) {
      const poll = () => (window.qz ? resolve(window.qz) : setTimeout(poll, 100));
      poll();
      return;
    }
    const script = document.createElement("script");
    script.id = "qz-tray-script";
    // Use the same qz-tray version installed in node_modules
    script.src = "https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js";
    script.async = true;
    script.onload = () => resolve(window.qz || null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/** Wrap receipt innerHTML in a full HTML doc with 80mm thermal styles */
function buildReceiptHtml(innerHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: 80mm auto; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Courier New', Courier, monospace;
      color: #000;
      background: #fff;
      width: 70mm;
      max-width: 70mm;
      margin: 0 auto;
      padding: 3mm 4.5mm;
      box-sizing: border-box;
      font-size: 11.5px;
      font-weight: 600;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
    .ticket-tax-meta, .ticket-tax-meta div, .ticket-tax-meta span { font-size: 8px !important; white-space: nowrap !important; letter-spacing: 0 !important; }
    .ticket-phone-line { font-size: 7.5px !important; white-space: nowrap !important; letter-spacing: -0.01em !important; display: block !important; }
    .print-seat-allocation, .print-seat-allocation div, .print-seat-allocation span { font-size: 9.5px !important; }
    .print-station-route, .print-station-route div, .print-station-route span { font-size: 8.5px !important; line-height: 1.25 !important; }
    .print-total-header { padding: 3px 0 !important; }
    .print-total-header div:first-child { font-size: 14px !important; line-height: 1.1 !important; }
    .print-total-header div:last-child { font-size: 7.5px !important; margin-top: 1px !important; }
    .print-invoice-meta, .print-invoice-meta div, .print-invoice-meta span { font-size: 9.5px !important; }
    .print-items-table, .print-items-table table, .print-items-table th, .print-items-table td, .print-items-table td div:first-child { font-size: 8.5px !important; }
    .print-items-table th { padding-bottom: 2px !important; }
    .print-items-table td { padding-top: 2px !important; padding-bottom: 1px !important; }
    .print-items-table td div:last-child { font-size: 7.5px !important; margin-top: 0px !important; }
    .print-tax-breakdown { font-size: 8.5px !important; padding: 4px 0 !important; }
    .print-tax-breakdown div, .print-tax-breakdown span { font-size: 8.5px !important; margin-bottom: 1px !important; }
    .print-tax-breakdown div:last-child, .print-tax-breakdown div:last-child span { font-size: 9.5px !important; padding-top: 3px !important; margin-top: 2px !important; }
    .print-notes-section { font-size: 8.5px !important; padding: 4px 0 !important; }
    .print-notes-section > div:first-child { font-size: 9px !important; margin-bottom: 2px !important; }
    .print-notes-section > div:last-child { gap: 1.5px !important; }
    .print-notes-section > div:last-child div { font-size: 8px !important; line-height: 1.25 !important; }
  </style>
</head>
<body>${innerHtml}</body>
</html>`;
}

/**
 * Print receipt silently via QZ Tray (no browser print dialog).
 *
 * @param receiptInnerHtml  innerHTML of the receipt element
 * @param printerName       optional printer name; uses system default if omitted
 * @returns true on success, false if QZ Tray is not available/running
 */
export async function printViaQZ(
  receiptInnerHtml: string,
  printerName?: string
): Promise<boolean> {
  try {
    const qz = await loadQzScript();
    if (!qz) return false;

    // --- NEW: INJECT CERTIFICATE FOR DEV FLOW ---
    // This tells QZ Tray who we are so the "Remember this decision" box unlocks.
    const cert = (import.meta.env.VITE_QZ_TRAY_CERT as string | undefined)?.replace(/\\n/g, "\n");

    if (cert) {
      qz.security.setCertificatePromise((resolve: Function) => {
        resolve(cert);
      });
    }

    if (!qz.websocket.isActive()) {
      await qz.websocket.connect({ retries: 2, delay: 1 });
    }

    const printer = printerName || (await qz.printers.getDefault());
    if (!printer) return false;

    const config = qz.configs.create(printer, { copies: 1, margins: 0 });

    await qz.print(config, [
      { type: "html", format: "plain", data: buildReceiptHtml(receiptInnerHtml) },
    ]);

    return true;
  } catch (err: any) {
    console.warn("QZ Tray unavailable, falling back to browser print:", err?.message || err);
    return false;
  }
}
