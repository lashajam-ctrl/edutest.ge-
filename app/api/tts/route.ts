import { env } from "cloudflare:workers";
import { getSessionUser } from "@/lib/auth";

type SpeechLanguage = "ka" | "en" | "ru";

const voices: Record<SpeechLanguage, { locale: string; name: string }> = {
  ka: { locale: "ka-GE", name: "ka-GE-EkaNeural" },
  en: { locale: "en-US", name: "en-US-JennyNeural" },
  ru: { locale: "ru-RU", name: "ru-RU-SvetlanaNeural" },
};

const recentRequests = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 30;

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

export async function POST(request: Request) {
  const current = await getSessionUser(request);
  if (!current) return Response.json({ error: "ავტორიზაცია აუცილებელია" }, { status: 401 });

  const runtime = env as unknown as Record<string, string>;
  const key = runtime.AZURE_SPEECH_KEY?.trim();
  const region = runtime.AZURE_SPEECH_REGION?.trim().toLowerCase();
  if (!key || !region || !/^[a-z0-9-]+$/.test(region)) {
    return Response.json({ enabled: false, reason: "Cloud speech is not configured" }, { status: 503 });
  }

  const now = Date.now();
  const timestamps = (recentRequests.get(current.user.id) ?? []).filter(value => value > now - 60_000);
  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) return Response.json({ error: "ცოტა ხნით მოიცადეთ და ისევ სცადეთ" }, { status: 429 });
  timestamps.push(now); recentRequests.set(current.user.id, timestamps);

  const body = await request.json() as { text?: unknown; lang?: unknown };
  const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim().slice(0, 1_400) : "";
  const language: SpeechLanguage = body.lang === "en-US" || body.lang === "en" ? "en" : body.lang === "ru-RU" || body.lang === "ru" ? "ru" : "ka";
  if (!text) return Response.json({ error: "გასახმოვანებელი ტექსტი ცარიელია" }, { status: 400 });

  const voice = voices[language];
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.locale}"><voice name="${voice.name}">${escapeXml(text)}</voice></speak>`;
  const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "EduTest.ge",
    },
    body: ssml,
  });
  if (!response.ok || !response.body) return Response.json({ error: "გახმოვანება დროებით მიუწვდომელია" }, { status: 502 });

  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
