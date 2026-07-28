import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Send, Loader2, Plus, Trash2, MessageSquare, Sparkles,
  Mic, MicOff, Volume2, VolumeX, Image as ImageIcon, Paperclip,
  RotateCcw, StopCircle, X,
} from "lucide-react";
import { Markdown, CopyButton } from "@/components/Markdown";
import { BackBar } from "@/components/BackBar";
// extract.client is dynamically imported inside onPickFile to keep it out of the server bundle
import {
  listConversations, createConversation, deleteConversation,
  getConversationMessages, sendChatMessage, regenerateLastAnswer,
} from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

type Msg = { id: string; role: string; content: string; created_at?: string };

function useSpeechRecognition(onFinal: (text: string) => void) {
  const recRef = useRef<any>(null);
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const Ctor: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = (navigator.language || "en-US");
    rec.onresult = (e: any) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
      }
      if (final) onFinal(final.trim());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    return () => { try { rec.stop(); } catch { /* noop */ } };
  }, [onFinal]);

  function start() {
    const r = recRef.current;
    if (!r) return;
    try { r.start(); setListening(true); } catch { /* already started */ }
  }
  function stop() {
    const r = recRef.current;
    if (!r) return;
    try { r.stop(); } catch { /* noop */ }
    setListening(false);
  }
  return { listening, supported, start, stop };
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g, "code block").slice(0, 4000));
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}
function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function ChatPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const _createFn = useServerFn(createConversation);
  const delFn = useServerFn(deleteConversation);
  const msgsFn = useServerFn(getConversationMessages);
  const sendFn = useServerFn(sendChatMessage);
  const regenFn = useServerFn(regenerateLastAnswer);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Msg[]>([]);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cancelledRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  void _createFn;

  const convQ = useQuery({ queryKey: ["conversations"], queryFn: () => listFn() });
  const msgsQ = useQuery({
    queryKey: ["messages", activeId],
    enabled: !!activeId,
    queryFn: () => msgsFn({ data: { id: activeId! } }),
  });

  useEffect(() => {
    if (msgsQ.data?.messages) setLocalMessages(msgsQ.data.messages as Msg[]);
  }, [msgsQ.data]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [localMessages]);

  const { listening, supported: voiceSupported, start: startVoice, stop: stopVoice } =
    useSpeechRecognition((t) => setInput((cur) => (cur ? cur + " " : "") + t));

  const sendM = useMutation({
    mutationFn: async (payload: { content: string; imageDataUrl?: string | null }) =>
      sendFn({ data: { conversationId: activeId, content: payload.content, imageDataUrl: payload.imageDataUrl ?? undefined } }),
    onSuccess: async (res) => {
      if (cancelledRef.current) { cancelledRef.current = false; return; }
      setActiveId(res.conversationId);
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      await qc.invalidateQueries({ queryKey: ["messages", res.conversationId] });
    },
    onError: (e) => {
      if (cancelledRef.current) { cancelledRef.current = false; return; }
      toast.error((e as Error).message);
      // remove the optimistic thinking bubble
      setLocalMessages((m) => m.filter((x) => x.content !== "…thinking"));
    },
  });

  const regenM = useMutation({
    mutationFn: async () => regenFn({ data: { conversationId: activeId! } }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["messages", activeId] });
      toast.success("Regenerated");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function handleSend() {
    const content = input.trim();
    if (!content || sendM.isPending) return;
    const img = imageDataUrl;
    setInput("");
    setImageDataUrl(null); setImageName(null); setAttachedFileName(null);
    cancelledRef.current = false;
    setLocalMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, role: "user", content: img ? `${content}\n\n_[Image attached]_` : content },
      { id: `tmp-a-${Date.now()}`, role: "assistant", content: "…thinking" },
    ]);
    sendM.mutate({ content, imageDataUrl: img });
  }

  function stopSend() {
    cancelledRef.current = true;
    stopSpeaking();
    // Non-streaming; we can't abort server request, but hide thinking bubble
    setLocalMessages((m) => m.filter((x) => x.content !== "…thinking"));
    toast.message("Response ignored");
  }

  async function newChat() {
    stopSpeaking();
    setActiveId(null);
    setLocalMessages([]);
  }

  async function delChat(id: string) {
    await delFn({ data: { id } });
    if (activeId === id) { setActiveId(null); setLocalMessages([]); }
    qc.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Chat deleted");
  }

  async function onPickImage(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please choose an image."); return; }
    if (f.size > 6 * 1024 * 1024) { toast.error("Image too large (max 6 MB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(String(reader.result));
      setImageName(f.name);
    };
    reader.readAsDataURL(f);
  }

  async function onPickFile(f: File | null) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { toast.error("File too large (max 20 MB)."); return; }
    try {
      toast.message("Reading file…");
      const { extractAnyText } = await import("@/lib/extract.client");
      const text = await extractAnyText(f);
      if (!text.trim()) { toast.error("Couldn't extract text from that file."); return; }
      setAttachedFileName(f.name);
      const excerpt = text.length > 40000 ? text.slice(0, 40000) + "\n…(truncated)" : text;
      setInput((cur) => `${cur ? cur + "\n\n" : ""}Please analyze the following document "${f.name}":\n\n\`\`\`\n${excerpt}\n\`\`\``);
      toast.success(`Attached ${f.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to read file");
    }
  }

  const isEmpty = localMessages.length === 0;
  const lastAssistant = useMemo(
    () => [...localMessages].reverse().find((m) => m.role === "assistant" && m.content !== "…thinking"),
    [localMessages],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <BackBar title="AI Chat" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Chat list */}
        <aside className="glass rounded-2xl p-3">
          <button
            onClick={newChat}
            className="btn-glow mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:btn-glow-hover"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
          <div className="max-h-[40vh] space-y-1 overflow-y-auto lg:max-h-[70vh]">
            {(convQ.data?.conversations ?? []).map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-xl px-2 py-2 text-sm cursor-pointer ${
                  activeId === c.id ? "bg-white/10" : "hover:bg-white/5"
                }`}
                onClick={() => setActiveId(c.id)}
              >
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="flex-1 truncate">{c.title || "New chat"}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); delChat(c.id); }}
                  className="opacity-0 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
            {convQ.data?.conversations?.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-muted-foreground">No chats yet</p>
            )}
          </div>
        </aside>

        {/* Chat window */}
        <section className="glass-strong flex h-[75vh] flex-col rounded-2xl">
          <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {isEmpty ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl btn-glow"><Sparkles className="h-6 w-6 text-white" /></div>
                <h2 className="text-xl font-bold">How can I help you today?</h2>
                <p className="mt-1 text-sm text-muted-foreground">Ask anything — StudyMate remembers your conversation.</p>
                <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {[
                    "Explain quantum entanglement simply.",
                    "Give me a study plan for calculus.",
                    "Summarize the causes of WWII.",
                    "Write 5 MCQs on photosynthesis.",
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="glass rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10"
                    >{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              localMessages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[92%] rounded-2xl px-4 py-3 pop-in sm:max-w-[85%] ${
                    m.role === "user" ? "btn-glow text-white" : "glass"
                  }`}>
                    {m.role === "assistant" && m.content === "…thinking" ? (
                      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                      </span>
                    ) : (
                      <>
                        <Markdown>{m.content}</Markdown>
                        {m.role === "assistant" && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <CopyButton text={m.content} />
                            {speakingId === m.id ? (
                              <button onClick={() => { stopSpeaking(); setSpeakingId(null); }} className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
                                <VolumeX className="h-3.5 w-3.5" /> Stop
                              </button>
                            ) : (
                              <button onClick={() => { speak(m.content); setSpeakingId(m.id); }} className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
                                <Volume2 className="h-3.5 w-3.5" /> Listen
                              </button>
                            )}
                            {activeId && lastAssistant?.id === m.id && !sendM.isPending && !regenM.isPending && (
                              <button onClick={() => regenM.mutate()} className="glass inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
                                <RotateCcw className="h-3.5 w-3.5" /> Regenerate
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="border-t border-white/10 p-3"
          >
            {(imageDataUrl || attachedFileName) && (
              <div className="mb-2 flex flex-wrap gap-2">
                {imageDataUrl && (
                  <span className="glass inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs">
                    <img src={imageDataUrl} alt="" className="h-6 w-6 rounded object-cover" />
                    <span className="max-w-[160px] truncate">{imageName}</span>
                    <button type="button" onClick={() => { setImageDataUrl(null); setImageName(null); }} aria-label="Remove image">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {attachedFileName && (
                  <span className="glass inline-flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs">
                    <Paperclip className="h-3.5 w-3.5" /> {attachedFileName}
                    <button type="button" onClick={() => setAttachedFileName(null)} aria-label="Remove file">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
            )}
            <div className="glass flex items-end gap-2 rounded-2xl p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                rows={1}
                placeholder="Message StudyMate… (Enter to send, Shift+Enter for newline)"
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />

              {/* Attach image */}
              <input ref={imageInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => onPickImage(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => imageInputRef.current?.click()} className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Attach image">
                <ImageIcon className="h-4 w-4" />
              </button>

              {/* Attach document */}
              <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,.md,.csv,.json,.log,text/*" className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="glass inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Attach file">
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Voice input */}
              {voiceSupported && (
                <button
                  type="button"
                  onMouseDown={startVoice}
                  onMouseUp={stopVoice}
                  onMouseLeave={() => listening && stopVoice()}
                  onTouchStart={startVoice}
                  onTouchEnd={stopVoice}
                  onClick={() => (listening ? stopVoice() : startVoice())}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${listening ? "btn-glow" : "glass hover:bg-white/10"}`}
                  aria-label={listening ? "Stop listening" : "Push to talk"}
                  title="Push to talk"
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              )}

              {sendM.isPending ? (
                <button
                  type="button"
                  onClick={stopSend}
                  className="glass inline-flex h-10 items-center justify-center gap-1 rounded-xl px-3 text-sm font-semibold hover:bg-white/10"
                  aria-label="Stop"
                >
                  <StopCircle className="h-4 w-4" /> Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="btn-glow inline-flex h-10 items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold hover:btn-glow-hover disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Send
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
