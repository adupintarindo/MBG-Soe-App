"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge, Button, FieldLabel, Input, Section } from "@/components/ui";
import type { DataCounts } from "./data-shell";
import { t, ti, type LangKey } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

type ResetKind = "transactional" | "stock" | "master";

interface ResetSpec {
  kind: ResetKind;
  rpc:
    | "admin_reset_transactional"
    | "admin_reset_stock"
    | "admin_reset_master";
  titleKey: LangKey;
  hintKey: LangKey;
  affectsKey: LangKey;
  keepsKey: LangKey;
  confirmWordKey: LangKey;
  tone: "warn" | "bad";
}

const SPECS: ResetSpec[] = [
  {
    kind: "transactional",
    rpc: "admin_reset_transactional",
    titleKey: "adminData.resetTxTitle",
    hintKey: "adminData.resetTxHint",
    affectsKey: "adminData.resetTxAffects",
    keepsKey: "adminData.resetTxKeeps",
    confirmWordKey: "adminData.resetTxWord",
    tone: "warn"
  },
  {
    kind: "stock",
    rpc: "admin_reset_stock",
    titleKey: "adminData.resetStockTitle",
    hintKey: "adminData.resetStockHint",
    affectsKey: "adminData.resetStockAffects",
    keepsKey: "adminData.resetStockKeeps",
    confirmWordKey: "adminData.resetStockWord",
    tone: "warn"
  },
  {
    kind: "master",
    rpc: "admin_reset_master",
    titleKey: "adminData.resetMasterTitle",
    hintKey: "adminData.resetMasterHint",
    affectsKey: "adminData.resetMasterAffects",
    keepsKey: "adminData.resetMasterKeeps",
    confirmWordKey: "adminData.resetMasterWord",
    tone: "bad"
  }
];

export function ResetPanel({ counts }: { counts: DataCounts }) {
  const { lang } = useLang();
  return (
    <div className="space-y-4">
      <Section
        title={t("adminData.statusTitle", lang)}
        hint={t("adminData.statusHint", lang)}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <CountTile label={t("adminData.tileItems", lang)} value={counts.items} />
          <CountTile label={t("adminData.tileMenus", lang)} value={counts.menus} />
          <CountTile label={t("adminData.tileSuppliers", lang)} value={counts.suppliers} />
          <CountTile label={t("adminData.tileSchools", lang)} value={counts.schools} />
          <CountTile label={t("adminData.tileStockRows", lang)} value={counts.stock_rows} />
          <CountTile label={t("adminData.tilePO", lang)} value={counts.purchase_orders} tone="warn" />
          <CountTile label={t("adminData.tileGRN", lang)} value={counts.grns} tone="warn" />
          <CountTile label={t("adminData.tileInvoice", lang)} value={counts.invoices} tone="warn" />
          <CountTile label={t("adminData.tileStockMoves", lang)} value={counts.stock_moves} tone="warn" />
          <CountTile label={t("adminData.tileTransactions", lang)} value={counts.transactions} tone="warn" />
        </div>
      </Section>

      {SPECS.map((spec) => (
        <ResetCard key={spec.kind} spec={spec} />
      ))}
    </div>
  );
}

function CountTile({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  const valueCls = tone === "warn" ? "text-amber-700" : "text-ink";
  return (
    <div className="rounded-xl bg-paper p-3 ring-1 ring-ink/5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-ink2/70">
        {label}
      </div>
      <div className={`mt-1 text-xl font-black ${valueCls}`}>{value}</div>
    </div>
  );
}

type Status = "idle" | "running" | "ok" | "error";

function ResetCard({ spec }: { spec: ResetSpec }) {
  const { lang } = useLang();
  const supabase = createClient();
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [details, setDetails] = useState<unknown>(null);

  const title = t(spec.titleKey, lang);
  const confirmWord = t(spec.confirmWordKey, lang);
  const armed = confirmText.trim().toUpperCase() === confirmWord;
  const isDanger = spec.tone === "bad";

  async function onRun() {
    if (!armed || status === "running") return;
    setStatus("running");
    setMessage(null);
    setDetails(null);

    const { data, error } = await supabase.rpc(spec.rpc);

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("ok");
    setDetails(data ?? null);
    setMessage(ti("adminData.okMsg", lang, { title }));
    setConfirmText("");
    router.refresh();
  }

  return (
    <Section
      title={title}
      hint={t(spec.hintKey, lang)}
      accent={isDanger ? "bad" : "warn"}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
          <div className="text-[10px] font-bold uppercase tracking-wide text-red-900/70">
            {t("adminData.tileAffects", lang)}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-red-900">
            {t(spec.affectsKey, lang)}
          </p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
          <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-900/70">
            {t("adminData.tileKeeps", lang)}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-emerald-900">
            {t(spec.keepsKey, lang)}
          </p>
        </div>
      </div>

      <label className="mt-4 block">
        <FieldLabel hint={ti("adminData.confirmHint", lang, { word: confirmWord })}>
          {t("adminData.confirmLabel", lang)}
        </FieldLabel>
        <Input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={confirmWord}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={isDanger ? "danger" : "primary"}
          size="md"
          disabled={!armed || status === "running"}
          onClick={onRun}
        >
          {status === "running"
            ? t("adminData.btnRunning", lang)
            : ti("adminData.btnRun", lang, { title })}
        </Button>
        <Badge tone={armed ? (isDanger ? "bad" : "warn") : "muted"}>
          {armed
            ? t("adminData.armedReady", lang)
            : t("adminData.armedMismatch", lang)}
        </Badge>
      </div>

      {status === "ok" && message && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200">
          <div className="mb-1 font-black">✓ {message}</div>
          {details ? (
            <pre className="mt-2 overflow-x-auto rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-ink shadow-sm">
              {JSON.stringify(details, null, 2)}
            </pre>
          ) : null}
        </div>
      )}

      {status === "error" && message && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
          <div className="mb-1 font-black">✗ {t("adminData.errTitle", lang)}</div>
          <p className="leading-relaxed">{message}</p>
        </div>
      )}
    </Section>
  );
}
