import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function getSession() {
  return getServerSession(authOptions);
}

export type AuthUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  organizationId?: string | null;
  organizationName?: string | null;
};

export type OrgUser = AuthUser & { organizationId: string };

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as AuthUser;
}

/**
 * Require authenticated user. Returns null if not logged in.
 * API routes should check: `if (!user) return unauthorized();`
 */
export async function requireAuth(): Promise<AuthUser | null> {
  return getCurrentUser();
}

/**
 * Require authenticated user with an organization.
 * Returns null if not logged in or no organization.
 */
export async function requireOrganization(): Promise<OrgUser | null> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  return user as OrgUser;
}

/**
 * Require admin role. Returns null if not admin.
 */
export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/** Standard 401 response for API routes */
export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

/** Standard 403 response for API routes */
export function forbidden() {
  return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
}
