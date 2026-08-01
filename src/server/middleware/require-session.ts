import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type AppRole = "CUSTOMER" | "DRIVER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";

export class UnauthorizedError extends Error {
  status = 401;
}
export class ForbiddenError extends Error {
  status = 403;
}

/**
 * Ensures the current request has an authenticated session, optionally
 * restricted to a set of roles. Throws typed errors that API routes
 * translate directly into 401/403 responses.
 */
export async function requireSession(allowedRoles?: AppRole[]) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    throw new UnauthorizedError("You must be logged in to perform this action.");
  }

  const role = (session.user as any).role as AppRole;

  if (allowedRoles && !allowedRoles.includes(role)) {
    throw new ForbiddenError("You do not have permission to perform this action.");
  }

  return {
    userId: (session.user as any).id as string,
    role,
    email: session.user.email as string,
  };
}
