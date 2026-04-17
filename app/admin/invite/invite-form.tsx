"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/roles";
import { Badge, Button, FieldLabel, Input, Section, Select } from "@/components/ui";
import { t, ti, type LangKey } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

interface SupplierOpt {
  id: string;
  name: string;
}

const ROLE_OPTIONS: { value: UserRole; labelKey: LangKey; descKey: LangKey }[] = [
  { value: "admin",     labelKey: "adminInvite.roleAdmin",    descKey: "adminInvite.roleAdminDesc" },
  { value: "operator",  labelKey: "adminInvite.roleOperator", descKey: "adminInvite.roleOperatorDesc" },
  { value: "ahli_gizi", labelKey: "adminInvite.roleNutri",    descKey: "adminInvite.roleNutriDesc" },
  { value: "supplier",  labelKey: "adminInvite.roleSupplier", descKey: "adminInvite.roleSupplierDesc" },
  { value: "viewer",    labelKey: "adminInvite.roleObserver", descKey: "adminInvite.roleObserverDesc" }
];

export function InviteForm({ suppliers }: { suppliers: SupplierOpt[] }) {
  const { lang } = useLang();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [supplierId, setSupplierId] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    setToken(null);

    const { data, error } = await supabase.rpc("create_invite", {
      p_email: email.trim().toLowerCase(),
      p_role: role,
      p_supplier_id: role === "supplier" ? supplierId || undefined : undefined
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("ok");
    setToken(data as unknown as string);
    setMessage(ti("adminInvite.okMsg", lang, { email }));
    setEmail("");
  }

  return (
    <Section
      title={t("adminInvite.formTitle", lang)}
      hint={t("adminInvite.formHint", lang)}
      accent="info"
    >
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
        <label className="block md:col-span-2">
          <FieldLabel>{t("adminInvite.fldEmail", lang)}</FieldLabel>
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("adminInvite.phEmail", lang)}
            autoComplete="off"
          />
        </label>

        <label className="block">
          <FieldLabel>{t("adminInvite.fldRole", lang)}</FieldLabel>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.labelKey, lang)} — {t(r.descKey, lang)}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <FieldLabel hint={role === "supplier" ? t("adminInvite.supRequired", lang) : t("adminInvite.supIgnore", lang)}>
            {t("adminInvite.fldSupplier", lang)}
          </FieldLabel>
          <Select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            disabled={role !== "supplier"}
          >
            <option value="">{t("adminInvite.optPickSup", lang)}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} · {s.name}
              </option>
            ))}
          </Select>
        </label>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={status === "sending"}
          >
            {status === "sending" ? t("adminInvite.btnSending", lang) : t("adminInvite.btnSend", lang)}
          </Button>
          <Badge tone="muted">
            {t("adminInvite.badge7Days", lang)}
          </Badge>
        </div>

        {status === "ok" && message && (
          <div className="rounded-xl bg-green-50 p-4 text-sm text-green-900 ring-1 ring-green-200 md:col-span-2">
            <div className="mb-1 font-black">✓ {t("adminInvite.okTitle", lang)}</div>
            <p className="leading-relaxed">{message}</p>
            {token && (
              <div className="mt-3">
                <span className="text-[11px] font-bold uppercase tracking-wide text-green-900/70">
                  {t("adminInvite.tokenLabel", lang)}
                </span>
                <code className="mt-1 block break-all rounded-lg bg-white px-3 py-2 font-mono text-[11px] text-ink shadow-sm">
                  {token}
                </code>
              </div>
            )}
          </div>
        )}

        {status === "error" && message && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200 md:col-span-2">
            <div className="mb-1 font-black">✗ {t("adminInvite.errTitle", lang)}</div>
            <p className="leading-relaxed">{message}</p>
          </div>
        )}
      </form>
    </Section>
  );
}
