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
