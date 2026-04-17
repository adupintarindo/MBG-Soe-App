"use client";

import { t } from "@/lib/i18n";
import { useLang } from "@/lib/prefs-context";

export function PrintButton() {
  const { lang } = useLang();
  return (
    <button
      className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white shadow-card transition hover:bg-ink2 active:scale-[0.98] print:hidden"
      onClick={() => window.print()}
      type="button"
    >
      {t("docgen.printBtn", lang)}
    </button>
  );
}
