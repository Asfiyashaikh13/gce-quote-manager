export type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  mustChangePassword: boolean;
}

export function canManageUsers(role: UserRole): boolean {
  return role === "ADMIN";
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canEditSettings(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canEditRateCard(role: UserRole): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canEditQuotes(role: UserRole): boolean {
  return role !== "VIEWER";
}

export function canRecordPayments(role: UserRole): boolean {
  return role !== "VIEWER";
}

export function isReadOnly(role: UserRole): boolean {
  return role === "VIEWER";
}

