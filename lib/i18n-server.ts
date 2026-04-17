import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export const LANG_COOKIE = "mbg-lang";

/**
 * Read the user's language preference from cookie (written by prefs-context on toggle).
 * Falls back to "ID" when unset.
 *
 * Usage (server component):
 *   const lang = getLang();
 *   <h1>{t("procurement.title", lang)}</h1>
 */
export function getLang(): Lang {
  try {
    const val = cookies().get(LANG_COOKIE)?.value;
    return val === "EN" ? "EN" : "ID";
  } catch {
    return "ID";
  }
}
