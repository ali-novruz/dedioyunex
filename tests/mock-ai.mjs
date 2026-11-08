// Minimal OpenAI-compatible mock (chat completions + audio transcriptions) for testing the assistant without a real key.
// Logs every request body so tests can assert on what the platform sent.
import http from "node:http";

const port = Number(process.env.PORT ?? 4100);
export const log = [];

function answer(userText) {
  const t = userText.toLowerCase();
  if (/kömək edin|bilmirəm/.test(t) && !/answered/.test(t)) {
    return { patch: {}, categories: [], summary: "", question: "Sizə nə çətindir: yazıları oxumaq, səsləri eşitmək, yoxsa düymələrə toxunmaq?" };
  }
  if (/xırda|görmür|görə bilmirəm|oxumaq/.test(t)) {
    return { patch: { fontScale: 1.75, contrast: "high", tts: true, bogusKey: 5, ttsRate: 3 }, categories: ["vision", "nonsense"], summary: "Yazıları böyütdüm, kontrastı artırdım və səsli oxunuşu açdım." };
  }
  return { patch: {}, categories: [], summary: "Heç nə dəyişmədim." };
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      log.push({ url: req.url, auth: req.headers.authorization, body: body.slice(0, 4000) });
      console.log(req.method, req.url, req.headers.authorization);
      if (req.headers.authorization !== "Bearer test-key") {
        res.writeHead(401, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad key" }));
        return;
      }
      if (req.url === "/v1/audio/transcriptions") {
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ text: "Yazılar çox xırdadır, gözüm görmür" }));
        return;
      }
      if (req.url === "/v1/chat/completions") {
        const j = JSON.parse(body);
        if (j.messages[0].content.includes("MENE_UYGUN_PAGE_HELP")) {
          const user = j.messages[1].content;
          const ids = [...user.matchAll(/^(a\d+) \| (\w+) \| ([^|\n]*)/gm)].map((m) => ({ id: m[1], kind: m[2], label: m[3].trim() }));
          const help = {
            headline: "Gündəlik məhsullar satan onlayn mağaza",
            summary: "Bu səhifədə süd, çörək kimi məhsulları seçib səbətə ata bilərsiniz. Sonra ödəniş edirsiniz.",
            points: ["Səbətdə 3 məhsul var", "Cəmi 15.30 AZN"],
            actions: ids.slice(0, 12).map((a) => ({ id: a.id, explain: a.label.includes("Ödə") ? "Basanda kartınızdan pul çıxılır." : `"${a.label || a.kind}" düyməsi — mock izah.` })).concat([{ id: "zzz", explain: "fake" }]),
          };
          res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ choices: [{ message: { role: "assistant", content: JSON.stringify(help) } }] }));
          return;
        }
        const last = j.messages[j.messages.length - 1].content;
        const content = JSON.stringify(answer(last));
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }));
        return;
      }
      res.writeHead(404).end();
    });
  })
  .listen(port, () => console.log(`mock AI on :${port}`));
