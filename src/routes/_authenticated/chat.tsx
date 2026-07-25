import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send, Loader2, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { Markdown, CopyButton } from "@/components/Markdown";
import {
  listConversations, createConversation, deleteConversation,
  getConversationMessages, sendChatMessage,
} from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});

type Msg = { id: string; role: string; content: string; created_at?: string };

function ChatPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const delFn = useServerFn(deleteConversation);
  const msgsFn = useServerFn(getConversationMessages);
  const sendFn = useServerFn(sendChatMessage);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Msg[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

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

  const sendM = useMutation({
    mutationFn: async (content: string) =>
      sendFn({ data: { conversationId: activeId, content } }),
    onSuccess: async (res) => {
      setActiveId(res.conversationId);
      await qc.invalidateQueries({ queryKey: ["conversations"] });
      await qc.invalidateQueries({ queryKey: ["messages", res.conversationId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function handleSend() {
    const content = input.trim();
    if (!content || sendM.isPending) return;
    setInput("");
    setLocalMessages((m) => [
      ...m,
      { id: `tmp-${Date.now()}`, role: "user", content },
      { id: `tmp-a-${Date.now()}`, role: "assistant", content: "…thinking" },
    ]);
    sendM.mutate(content);
  }

  async function newChat() {
    setActiveId(null);
    setLocalMessages([]);
  }

  async function delChat(id: string) {
    await delFn({ data: { id } });
    if (activeId === id) { setActiveId(null); setLocalMessages([]); }
    qc.invalidateQueries({ queryKey: ["conversations"] });
    toast.success("Chat deleted");
  }

  const isEmpty = localMessages.length === 0;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Chat list */}
      <aside className="glass rounded-2xl p-3">
        <button
          onClick={newChat}
          className="btn-glow mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:btn-glow-hover"
        >
          <Plus className="h-4 w-4" /> New chat
        </button>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto lg:max-h-[70vh]">
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
        <div ref={scrollerRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl btn-glow"><Sparkles className="h-6 w-6 text-white" /></div>
              <h2 className="text-xl font-bold">How can I help you today?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Ask anything — StudyMate remembers your conversation.</p>
              <div className="mt-6 grid max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
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
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 pop-in ${
                  m.role === "user"
                    ? "btn-glow text-white"
                    : "glass"
                }`}>
                  {m.role === "assistant" && m.content === "…thinking" ? (
                    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
                    </span>
                  ) : (
                    <>
                      <Markdown>{m.content}</Markdown>
                      {m.role === "assistant" && (
                        <div className="mt-2"><CopyButton text={m.content} /></div>
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
          <div className="glass flex items-end gap-2 rounded-2xl p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              rows={1}
              placeholder="Message StudyMate…  (Enter to send, Shift+Enter for newline)"
              className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={sendM.isPending || !input.trim()}
              className="btn-glow inline-flex h-10 items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold hover:btn-glow-hover disabled:opacity-50"
            >
              {sendM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
