// Role helpers — mirror of user_role enum in 0001_schema.sql
import type { Database } from "@/types/database";

export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLE_LABELS: Record<UserRole, { id: string; en: string; icon: string }> =
  {
    admin:     { id: "Administrator",  en: "Administrator",   icon: "🛡️" },
    operator:  { id: "Operator SPPG",   en: "Kitchen Operator", icon: "👩‍🍳" },
    ahli_gizi: { id: "Ahli Gizi",       en: "Nutritionist",    icon: "🥗" },
    supplier:  { id: "Supplier",        en: "Supplier",        icon: "🚚" },
    viewer:    { id: "Observer",        en: "Observer",        icon: "👁️" }
  };

export function canWriteStock(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "operator";
}

export function canWriteMenu(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "ahli_gizi";
}

export function canInvite(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

export function isSupplier(role: UserRole | null | undefined): boolean {
  return role === "supplier";
}

export function canViewAll(role: UserRole | null | undefined): boolean {
  return role === "admin" || role === "operator" || role === "ahli_gizi" || role === "viewer";
}
