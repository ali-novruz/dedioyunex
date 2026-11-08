import { pageT } from "@/lib/lang-server";
import { TransferAccept } from "./TransferAccept";

export default async function TransferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { l } = await pageT();
  return (
    <div className="stack">
      <h1 className="h1">{l("Ayarlarınız bu cihaza köçürülür", "Your settings are moving to this device")}</h1>
      <p className="lead">{l("Yaxınınızın sizin üçün qurduğu MƏNƏ UYĞUN profili bu cihazda açılacaq.", "The MƏNƏ UYĞUN profile someone close to you set up will open on this device.")}</p>
      <TransferAccept token={token} />
      <p className="notice">{l("MƏNƏ UYĞUN heç vaxt şifrə, kart məlumatı və ya pul istəmir.", "MƏNƏ UYĞUN never asks for a password, card details or money.")}</p>
    </div>
  );
}
