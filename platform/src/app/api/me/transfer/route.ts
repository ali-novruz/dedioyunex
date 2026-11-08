import QRCode from "qrcode";
import { handle } from "@/lib/http";
import { requireApiUser, createTransferToken } from "@/lib/session";
import { env } from "@/lib/env";

/** Creates a one-time QR link that signs another device into this account. */
export function POST() {
  return handle(async () => {
    const user = await requireApiUser();
    const { token, expiresAt } = await createTransferToken(user.id);
    const url = `${env.appUrl}/kecid/${token}`;
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: 280, errorCorrectionLevel: "M" });
    return { url, svg, expiresAt };
  });
}
