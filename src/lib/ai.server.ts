const GATEWAY_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

function buildHeaders(): Record<string, string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("Missing OPENROUTER_API_KEY");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
    "HTTP-Referer": "https://studymate.app",
    "X-Title": "StudyMate Pro",
  };
}

export async function callLovableAI(messages: ChatMessage[], model = "gpt-4o-mini"): Promise<string> {
  const headers = buildHeaders();

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, stream: false }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`AI request failed [${res.status}]: ${text}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function streamLovableAI(messages: ChatMessage[], model = "gpt-4o-mini"): Promise<Response> {
  const headers = buildHeaders();

  const upstream = await fetch(GATEWAY_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, stream: true }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    const status = upstream.status;
    let msg = `AI request failed [${status}]: ${text}`;
    if (status === 429) msg = "Rate limit exceeded. Please try again shortly.";
    if (status === 402) msg = "AI credits exhausted. Please add credits to continue.";
    return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");
      for (const line of lines) {
        const l = line.trim();
        if (!l.startsWith("data:")) continue;
        const payload = l.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        } catch {
          /* ignore malformed */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
