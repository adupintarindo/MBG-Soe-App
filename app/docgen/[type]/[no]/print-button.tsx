"use client";

export function PrintButton() {
  return (
    <button
      className="rounded-lg bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink2 print:hidden"
      onClick={() => window.print()}
      type="button"
    >
      🖨️ Print / Save PDF
    </button>
  );
}
