import { TransferAccept } from "./TransferAccept";

export default async function TransferPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="stack">
      <h1 className="h1">Ayarlarınız bu cihaza köçürülür</h1>
      <p className="lead">Yaxınınızın sizin üçün qurduğu MƏNƏ UYĞUN profili bu cihazda açılacaq.</p>
      <TransferAccept token={token} />
      <p className="notice">MƏNƏ UYĞUN heç vaxt şifrə, kart məlumatı və ya pul istəmir.</p>
    </div>
  );
}
