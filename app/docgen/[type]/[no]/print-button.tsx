"use client";

export function PrintButton() {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white shadow-card transition hover:bg-ink2 active:scale-[0.98] print:hidden"
      onClick={() => window.print()}
      type="button"
    >
      🖨️ Print / Save PDF
    </button>
  );
}
