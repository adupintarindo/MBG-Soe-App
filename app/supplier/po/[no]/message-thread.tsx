"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";
import type { UserRole } from "@/lib/roles";

type Msg = {
  id: number;
  body: string;
  attachment_url: string | null;
  sender_role: string | null;
  created_at: string;
  read_at: string | null;
};

export function MessageThread({
  poNo,
  supplierId,
  initial,
  currentRole
}: {
  poNo: string;
  supplierId: string;
  initial: Msg[];
  currentRole: UserRole;
}) {
  const { lang } = useLang();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [messages, setMessages] = useState<Msg[]>(initial);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    const channel = supabase
      .channel(`supplier_messages:${poNo}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "supplier_messages",
          filter: `po_no=eq.${poNo}`
        },
        (payload) => {
          setMessages((prev) => {
            const row = payload.new as Msg;
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, row];
          });
        }
      )
      .subscribe();

    const unreadIds = initial
      .filter(
        (m) => !m.read_at && m.sender_role !== currentRole
      )
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      supabase
        .from("supplier_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds)
        .then(() => {
          router.refresh();
        });
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, poNo, initial, currentRole, router]);

  async function send() {
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;
      const { error: err } = await supabase
        .from("supplier_messages")
        .insert({
          po_no: poNo,
          supplier_id: supplierId,
          sender_id: userId,
          sender_role: currentRole,
          body: trimmed,
          attachment_url: attachment || null
        });
      if (err) {
        setError(err.message);
        return;
      }
      setBody("");
      setAttachment("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        ref={scrollRef}
        className="max-h-96 space-y-2 overflow-y-auto rounded-xl bg-ink2/5 p-3"
      >
        {messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink2/60">
            {lang === "EN"
              ? "No messages yet. Start the conversation."
              : "Belum ada pesan. Mulai percakapan."}
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_role === currentRole;
            return (
              <div
                key={m.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    mine
                      ? "bg-primary-strong text-white"
                      : "bg-white text-ink ring-1 ring-ink/10"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.body}</div>
                  {m.attachment_url && (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-1 inline-block text-[11px] underline ${
                        mine ? "text-white/80" : "text-primary-strong"
                      }`}
                    >
                      ↗ {lang === "EN" ? "Attachment" : "Lampiran"}
                    </a>
                  )}
                  <div
                    className={`mt-1 text-[10px] ${
                      mine ? "text-white/70" : "text-ink2/60"
                    }`}
                  >
                    {m.sender_role ?? "—"} ·{" "}
                    {m.created_at.slice(0, 16).replace("T", " ")}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("sup.messagePlaceholder", lang)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          className="flex-1 rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
        />
        <input
          type="url"
          value={attachment}
          onChange={(e) => setAttachment(e.target.value)}
          placeholder={lang === "EN" ? "Attachment URL (opt)" : "URL lampiran (opsional)"}
          className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm sm:w-56"
        />
        <button
          type="button"
          onClick={send}
          disabled={busy || !body.trim()}
          className="rounded-xl bg-ink px-4 py-2 text-sm font-black text-white shadow-card hover:bg-ink2 disabled:opacity-50"
        >
          {busy ? t("common.saving", lang) : t("sup.messageSend", lang)}
        </button>
      </div>
    </div>
  );
}
