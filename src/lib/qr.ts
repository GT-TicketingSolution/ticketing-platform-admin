import crypto from "crypto";
import QRCode from "qrcode";

export interface QrPayloadInput {
  bookingId: string;
  invoiceNumber: string;
  scannerInvoiceId: string;
  attractionId: string;
  attractionName: string;
  categories: {
    categoryId: string;
    noOfVisitors: number;
  }[];
  date: string;
}

export function createQrPayload({
  bookingId,
  invoiceNumber,
  scannerInvoiceId,
  attractionId,
  attractionName,
  categories,
  date,
}: QrPayloadInput): string {
  const secret = process.env.QR_SECRET;

  if (!secret) {
    throw new Error("QR_SECRET_NOT_CONFIGURED");
  }

  const data = JSON.stringify({
    bookingId,
    invoiceNumber,
    scannerInvoiceId,
    attractionId,
    attractionName,
    categories,
    date,
  });

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");

  return JSON.stringify({
    bookingId,
    invoiceNumber,
    scannerInvoiceId,
    attractionId,
    attractionName,
    categories,
    date,
    signature,
  });
}

export async function generateBookingQRCode(input: QrPayloadInput): Promise<{
  attractionId: string;
  attractionName: string;
  qrCode: string;
}> {
  const payload = createQrPayload(input);
  const qrCode = await QRCode.toDataURL(payload);

  return {
    attractionId: input.attractionId,
    attractionName: input.attractionName,
    qrCode,
  };
}
