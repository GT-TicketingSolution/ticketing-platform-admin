import { Booking, TicketSummaryItem } from "@/types/booking";
import { exportToCSV } from "@/lib/exportUtils";

/** Inline helper — duplicated from BookingDetailsModal to avoid circular client-component import */
function getTicketSummaryLocal(booking: Booking): TicketSummaryItem[] {
  if (booking.ticketSummary && booking.ticketSummary.length > 0) {
    return booking.ticketSummary;
  }
  const visitorsStr = booking.visitors || "1 Adult";
  const parts = visitorsStr.split("+").map((s) => s.trim());
  const items: TicketSummaryItem[] = [];
  parts.forEach((part) => {
    const match = part.match(
      /(\d+)\s*(Adult|Adults|Child|Children|Student|Students|Senior|Seniors|Foreigner|Foreigners)/i
    );
    if (match) {
      const qty = parseInt(match[1], 10);
      const rawCat = match[2].toLowerCase();
      let category: TicketSummaryItem["category"] = "Adult";
      if (rawCat.includes("child")) category = "Child";
      else if (rawCat.includes("student")) category = "Student";
      else if (rawCat.includes("senior")) category = "Senior";
      else if (rawCat.includes("foreigner")) category = "Foreigner";
      let unitPrice = 100;
      if (category === "Child") unitPrice = 50;
      else if (category === "Student") unitPrice = 60;
      else if (category === "Senior") unitPrice = 75;
      else if (category === "Foreigner") unitPrice = 500;
      items.push({ category, quantity: qty, unitPrice, total: qty * unitPrice });
    }
  });
  if (items.length === 0) {
    items.push({
      category: "Adult",
      quantity: booking.totalVisitors || 1,
      unitPrice: booking.amount / (booking.totalVisitors || 1),
      total: booking.amount,
    });
  }
  return items;
}

function generateInvoiceHTML(booking: Booking): string {
  const summaryItems = getTicketSummaryLocal(booking);

  const itemsHtml = summaryItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB;">${item.category}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; text-align: right;">₹${item.unitPrice.toFixed(2)}</td>
        <td style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 600;">₹${item.total.toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; padding: 30px; color: #011B2F; background: #FFFFFF; max-width: 700px; margin: auto;">

      <!-- Header -->
      <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 12px; margin-bottom: 20px;">
        <tr>
          <td style="vertical-align: middle; padding-bottom: 12px;">
            <div style="font-size: 22px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
            <div style="font-size: 12px; color: #6B7280;">Official Booking Receipt &amp; Invoice</div>
          </td>
          <td style="text-align: right; vertical-align: middle; padding-bottom: 12px;">
            <div style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-weight: bold; font-size: 12px; background: ${
              booking.status === "Confirmed" ? "#B5FFE7" : booking.status === "Cancelled" ? "#FEE2E2" : "#FFF8D9"
            }; color: ${
              booking.status === "Confirmed" ? "#119167" : booking.status === "Cancelled" ? "#DC2626" : "#D97706"
            };">${booking.status.toUpperCase()}</div>
            <div style="font-size: 13px; margin-top: 4px; font-weight: bold; color: #0C2A42;">${booking.id}</div>
          </td>
        </tr>
      </table>

      <!-- Customer & Booking Info Side By Side -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr>
          <td style="width: 50%; vertical-align: top; padding-right: 8px;">
            <div style="background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
              <div style="font-size: 14px; font-weight: bold; color: #0C2A42; margin-bottom: 10px;">Customer Information</div>
              <div style="font-size: 13px; margin-bottom: 4px;"><strong>Name:</strong> ${booking.customerName}</div>
              <div style="font-size: 13px; margin-bottom: 4px;"><strong>Mobile:</strong> ${booking.mobileNumber}</div>
              <div style="font-size: 13px;"><strong>GSTN:</strong> ${booking.gstn || "N/A"}</div>
            </div>
          </td>
          <td style="width: 50%; vertical-align: top; padding-left: 8px;">
            <div style="background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">
              <div style="font-size: 14px; font-weight: bold; color: #0C2A42; margin-bottom: 10px;">Booking Information</div>
              <div style="font-size: 13px; margin-bottom: 4px;"><strong>Attraction:</strong> ${booking.attraction}</div>
              <div style="font-size: 13px; margin-bottom: 4px;"><strong>Date &amp; Time:</strong> ${booking.dateTime}</div>
              <div style="font-size: 13px;"><strong>Payment Mode:</strong> ${booking.paymentMode}</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="border: 2px solid #0084FF; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
        <div style="padding: 10px 14px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; font-weight: bold; font-size: 14px; color: #0C2A42;">
          Ticket Summary
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: rgba(179, 175, 175, 0.17); color: #374151; font-weight: 600;">
              <th style="padding: 10px 14px; text-align: left;">Category</th>
              <th style="padding: 10px 14px; text-align: center;">Quantity</th>
              <th style="padding: 10px 14px; text-align: right;">Unit Price</th>
              <th style="padding: 10px 14px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr style="background: #FFFBEB; font-weight: bold;">
              <td style="padding: 12px 14px; color: #0C2A42;">Total Visitors</td>
              <td style="padding: 12px 14px; text-align: center; color: #0C2A42;">${booking.totalVisitors}</td>
              <td style="padding: 12px 14px;"></td>
              <td style="padding: 12px 14px; text-align: right; font-size: 16px; color: #0C2A42;">₹${booking.amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      ${
        booking.seats
          ? `<div style="background: #F8FAFC; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0; margin-bottom: 20px; font-size: 13px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0C2A42;">Seating Details (${booking.attraction})</h4>
              <div><strong>Bogie:</strong> ${booking.bogie || "N/A"} &nbsp;|&nbsp; <strong>Seats:</strong> ${booking.seats}</div>
            </div>`
          : ""
      }

      <div style="border: 1.5px solid #0084FF; border-radius: 8px; padding: 16px 14px; background: #F0F9FF; margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: bold; color: #0C2A42; margin-bottom: 12px;">Payment Summary</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; color: #6B7280; width: 50%;"><strong style="color: #0C2A42;">Payment Mode:</strong> ${booking.paymentMode}</td>
            <td style="padding: 4px 0; color: #6B7280; width: 50%; text-align: right;"><strong style="color: #0C2A42;">Status:</strong> Paid in Full</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6B7280;"><strong style="color: #0C2A42;">Total Amount:</strong> ₹${booking.amount.toFixed(2)}</td>
            <td style="padding: 4px 0; text-align: right;"><strong style="color: #0C2A42;">Amount Paid:</strong> ₹${booking.amountPaid.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9CA3AF;">
        Thank you for booking with us! Please present this receipt at the entry counter.
      </div>
    </div>
  `;
}

/**
 * Print Invoice — Opens print window and triggers browser print
 */
export function handlePrintInvoice(booking: Booking) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print invoices.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Invoice - ${booking.id}</title>
        <style>
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${generateInvoiceHTML(booking)}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Download Single Invoice PDF
 */
export async function handleDownloadPDF(booking: Booking) {
  try {
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    }

    const element = document.createElement("div");
    element.style.width = "750px";
    element.innerHTML = generateInvoiceHTML(booking);
    document.body.appendChild(element);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${booking.id}_Invoice.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    await (window as any).html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);
  } catch (err) {
    console.error("PDF Download fallback triggered:", err);
    const element = document.createElement("div");
    element.innerHTML = generateInvoiceHTML(booking);
    const blob = new Blob([element.innerHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${booking.id}_Invoice.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Download Filtered Bookings List PDF Report
 */
export async function handleDownloadBookingsListPDF(
  bookings: any[],
  filterInfo: string = "All Bookings"
) {
  try {
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    }

    const totalAmount = bookings.reduce((sum, b) => sum + (b.amount || 0), 0);

    const rowsHtml = bookings
      .map(
        (b, idx) => `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px;">
          <td style="padding: 8px 10px;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0C2A42;">${b.id}</td>
          <td style="padding: 8px 10px;">${b.customerName}</td>
          <td style="padding: 8px 10px;">${b.mobileNumber || ""}</td>
          <td style="padding: 8px 10px;">${b.attraction || ""}</td>
          <td style="padding: 8px 10px;">${b.dateTime || ""}</td>
          <td style="padding: 8px 10px;">${b.visitors || ""}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600;">₹${(b.amount || 0).toFixed(2)}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${
              b.status === "Confirmed" ? "#B5FFE7" : b.status === "Cancelled" ? "#FEE2E2" : "#FFF8D9"
            }; color: ${
              b.status === "Confirmed" ? "#119167" : b.status === "Cancelled" ? "#DC2626" : "#D97706"
            };">${b.status}</span>
          </td>
        </tr>
      `
      )
      .join("");

    const reportHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 20px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
              <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">BOOKINGS LIST REPORT</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Filter: ${filterInfo}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 11px; color: #6B7280;">Generated: ${new Date().toLocaleString()}</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Total Records: <strong>${bookings.length}</strong></div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #F1F5F9; color: #374151; font-weight: bold;">
              <th style="padding: 8px 10px; text-align: left; width: 30px;">#</th>
              <th style="padding: 8px 10px; text-align: left;">Booking ID</th>
              <th style="padding: 8px 10px; text-align: left;">Customer</th>
              <th style="padding: 8px 10px; text-align: left;">Mobile</th>
              <th style="padding: 8px 10px; text-align: left;">Attraction</th>
              <th style="padding: 8px 10px; text-align: left;">Date &amp; Time</th>
              <th style="padding: 8px 10px; text-align: left;">Visitors</th>
              <th style="padding: 8px 10px; text-align: right;">Amount</th>
              <th style="padding: 8px 10px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Summary Bar -->
        <table style="width: 100%; border-collapse: collapse; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px;">
          <tr>
            <td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #0C2A42;">
              Total Bookings: ${bookings.length}
            </td>
            <td style="padding: 10px 14px; text-align: right; font-weight: bold; font-size: 14px; color: #0C2A42;">
              Total Revenue: ₹${totalAmount.toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
    `;

    const element = document.createElement("div");
    element.style.width = "750px";
    element.innerHTML = reportHtml;
    document.body.appendChild(element);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Bookings_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    await (window as any).html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);
  } catch (err) {
    console.error("Bookings PDF export error:", err);
  }
}

/**
 * Export Filtered Bookings List to CSV (Excel)
 */
export function handleExportBookingsCSV(bookings: any[], rangeLabel: string = "All") {
  const headers = [
    "Booking ID",
    "Customer Name",
    "Mobile Number",
    "Attraction",
    "Date & Time",
    "Visitors",
    "Amount",
    "Status",
    "Payment Mode",
  ];
  const rows = bookings.map((b) => [
    b.id,
    b.customerName,
    b.mobileNumber || "",
    b.attraction || "",
    b.dateTime || "",
    b.visitors || "",
    b.amount,
    b.status,
    b.paymentMode || "",
  ]);

  exportToCSV(`Bookings_${rangeLabel}`, headers, rows);
}

/**
 * Download Filtered Transactions List PDF Report
 */
export async function handleDownloadTransactionsListPDF(
  transactions: any[],
  filterInfo: string = "All Transactions"
) {
  try {
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    }

    const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);

    const rowsHtml = transactions
      .map(
        (t, idx) => `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px;">
          <td style="padding: 8px 10px;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0C2A42;">${t.id}</td>
          <td style="padding: 8px 10px;">${t.customerName}</td>
          <td style="padding: 8px 10px;">${t.dateTime}</td>
          <td style="padding: 8px 10px;">${t.bookingId}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600;">₹${(t.amount || 0).toFixed(2)}</td>
          <td style="padding: 8px 10px;">${t.paymentMode}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${
              t.status === "Confirmed" ? "#B5FFE7" : t.status === "Cancelled" ? "#FEE2E2" : "#FFF8D9"
            }; color: ${
              t.status === "Confirmed" ? "#119167" : t.status === "Cancelled" ? "#DC2626" : "#D97706"
            };">${t.status}</span>
          </td>
        </tr>
      `
      )
      .join("");

    const reportHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 20px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
              <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">TRANSACTIONS LIST REPORT</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Filter: ${filterInfo}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 11px; color: #6B7280;">Generated: ${new Date().toLocaleString()}</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Total Records: <strong>${transactions.length}</strong></div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #F1F5F9; color: #374151; font-weight: bold;">
              <th style="padding: 8px 10px; text-align: left; width: 30px;">#</th>
              <th style="padding: 8px 10px; text-align: left;">Txn ID</th>
              <th style="padding: 8px 10px; text-align: left;">Customer</th>
              <th style="padding: 8px 10px; text-align: left;">Date & Time</th>
              <th style="padding: 8px 10px; text-align: left;">Booking ID</th>
              <th style="padding: 8px 10px; text-align: right;">Amount</th>
              <th style="padding: 8px 10px; text-align: left;">Mode</th>
              <th style="padding: 8px 10px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Summary Bar -->
        <table style="width: 100%; border-collapse: collapse; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px;">
          <tr>
            <td style="padding: 10px 14px; font-weight: bold; font-size: 12px; color: #0C2A42;">
              Total Transactions: ${transactions.length}
            </td>
            <td style="padding: 10px 14px; text-align: right; font-weight: bold; font-size: 14px; color: #0C2A42;">
              Total Revenue: ₹${totalAmount.toFixed(2)}
            </td>
          </tr>
        </table>
      </div>
    `;

    const element = document.createElement("div");
    element.style.width = "750px";
    element.innerHTML = reportHtml;
    document.body.appendChild(element);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Transactions_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    await (window as any).html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);
  } catch (err) {
    console.error("PDF export error:", err);
  }
}

/**
 * Download Filtered Staff List PDF Report
 */
export async function handleDownloadStaffListPDF(
  staffList: any[],
  filterInfo: string = "All Staff"
) {
  try {
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    }

    const rowsHtml = staffList
      .map(
        (s, idx) => `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px;">
          <td style="padding: 8px 10px;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0C2A42;">${s.name} (${s.id})</td>
          <td style="padding: 8px 10px;">${s.email}</td>
          <td style="padding: 8px 10px;">${s.phone}</td>
          <td style="padding: 8px 10px;">${Array.isArray(s.role) ? s.role.join(", ") : s.role}</td>
          <td style="padding: 8px 10px;">${Array.isArray(s.assignedAttraction) ? s.assignedAttraction.join(", ") : s.assignedAttraction}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${
              s.status === "Active" ? "#B5FFE7" : "#FEE2E2"
            }; color: ${
              s.status === "Active" ? "#119167" : "#DC2626"
            };">${s.status}</span>
          </td>
          <td style="padding: 8px 10px; text-align: right;">${s.ticketsIssued ?? 0}</td>
        </tr>
      `
      )
      .join("");

    const reportHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 20px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
              <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">STAFF MEMBERS REPORT</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Filter: ${filterInfo}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 11px; color: #6B7280;">Generated: ${new Date().toLocaleString()}</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Total Members: <strong>${staffList.length}</strong></div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #F1F5F9; color: #374151; font-weight: bold;">
              <th style="padding: 8px 10px; text-align: left; width: 30px;">#</th>
              <th style="padding: 8px 10px; text-align: left;">Staff Name (ID)</th>
              <th style="padding: 8px 10px; text-align: left;">Email</th>
              <th style="padding: 8px 10px; text-align: left;">Phone</th>
              <th style="padding: 8px 10px; text-align: left;">Role</th>
              <th style="padding: 8px 10px; text-align: left;">Assigned Attraction</th>
              <th style="padding: 8px 10px; text-align: center;">Status</th>
              <th style="padding: 8px 10px; text-align: right;">Tickets Issued</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    const element = document.createElement("div");
    element.style.width = "750px";
    element.innerHTML = reportHtml;
    document.body.appendChild(element);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Staff_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    await (window as any).html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);
  } catch (err) {
    console.error("Staff PDF export error:", err);
  }
}

/**
 * Export Filtered Staff List to CSV (Excel)
 */
export function handleExportStaffCSV(staffList: any[], label: string = "All") {
  const headers = [
    "Staff ID",
    "Staff Name",
    "Email",
    "Phone",
    "Role",
    "Assigned Attraction",
    "Status",
    "Joined Date",
    "Tickets Issued",
  ];
  const rows = staffList.map((s) => [
    s.id,
    s.name,
    s.email,
    s.phone,
    Array.isArray(s.role) ? s.role.join("; ") : s.role,
    Array.isArray(s.assignedAttraction) ? s.assignedAttraction.join("; ") : s.assignedAttraction,
    s.status,
    s.joinedDate || "",
    s.ticketsIssued ?? 0,
  ]);

  exportToCSV(`Staff_Members_${label}`, headers, rows);
}

/**
 * Download Filtered Managers List PDF Report
 */
export async function handleDownloadManagersListPDF(
  managerList: any[],
  filterInfo: string = "All Managers"
) {
  try {
    if (!(window as any).html2pdf) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load PDF library"));
        document.head.appendChild(script);
      });
    }

    const rowsHtml = managerList
      .map(
        (m, idx) => `
        <tr style="border-bottom: 1px solid #E5E7EB; font-size: 11px;">
          <td style="padding: 8px 10px;">${idx + 1}</td>
          <td style="padding: 8px 10px; font-weight: 600; color: #0C2A42;">${m.name} (${m.id})</td>
          <td style="padding: 8px 10px;">${m.email}</td>
          <td style="padding: 8px 10px;">${m.phone}</td>
          <td style="padding: 8px 10px;">${m.attraction}</td>
          <td style="padding: 8px 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: bold; background: ${
              m.status === "Active" ? "#B5FFE7" : "#FEE2E2"
            }; color: ${
              m.status === "Active" ? "#119167" : "#DC2626"
            };">${m.status}</span>
          </td>
          <td style="padding: 8px 10px;">${(m.allowedModules || []).join(", ")}</td>
        </tr>
      `
      )
      .join("");

    const reportHtml = `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #011B2F; background: #FFFFFF;">
        <!-- Header -->
        <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #F4BC43; padding-bottom: 10px; margin-bottom: 16px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 20px; font-weight: bold; color: #0C2A42;">TICKETING PLATFORM</div>
              <div style="font-size: 13px; color: #0C2A42; font-weight: 600; margin-top: 2px;">MANAGERS REPORT</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Filter: ${filterInfo}</div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="font-size: 11px; color: #6B7280;">Generated: ${new Date().toLocaleString()}</div>
              <div style="font-size: 11px; color: #6B7280; margin-top: 2px;">Total Managers: <strong>${managerList.length}</strong></div>
            </td>
          </tr>
        </table>

        <!-- Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px;">
          <thead>
            <tr style="background: #F1F5F9; color: #374151; font-weight: bold;">
              <th style="padding: 8px 10px; text-align: left; width: 30px;">#</th>
              <th style="padding: 8px 10px; text-align: left;">Manager Name (ID)</th>
              <th style="padding: 8px 10px; text-align: left;">Email</th>
              <th style="padding: 8px 10px; text-align: left;">Phone</th>
              <th style="padding: 8px 10px; text-align: left;">Assigned Attraction</th>
              <th style="padding: 8px 10px; text-align: center;">Status</th>
              <th style="padding: 8px 10px; text-align: left;">Allowed Modules</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `;

    const element = document.createElement("div");
    element.style.width = "750px";
    element.innerHTML = reportHtml;
    document.body.appendChild(element);

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Managers_Report_${new Date().toISOString().slice(0, 10)}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
    };

    await (window as any).html2pdf().set(opt).from(element).save();
    document.body.removeChild(element);
  } catch (err) {
    console.error("Manager PDF export error:", err);
  }
}

/**
 * Export Filtered Managers List to CSV (Excel)
 */
export function handleExportManagersCSV(managerList: any[], label: string = "All") {
  const headers = [
    "Manager ID",
    "Manager Name",
    "Email",
    "Phone",
    "Assigned Attraction",
    "Status",
    "Joined Date",
    "Allowed Modules",
  ];
  const rows = managerList.map((m) => [
    m.id,
    m.name,
    m.email,
    m.phone,
    m.attraction || "",
    m.status,
    m.joinedDate || "",
    (m.allowedModules || []).join("; "),
  ]);

  exportToCSV(`Managers_${label}`, headers, rows);
}

