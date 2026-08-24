import { env } from "cloudflare:workers";
import { and, eq, gt } from "drizzle-orm";
import { ensureSchema, getDb } from "@/db";
import { identities, oauthLinkRequests, users } from "@/db/schema";
import { createSession, hashPassword, oauthLinkCookie, oauthLinkToken, publicUser, sha256, verifyPassword } from "@/lib/auth";
import { consumeRateLimit } from "@/lib/rate-limit";

type SupabaseProfile = {
  name?: unknown;
  role?: unknown;
  grade?: unknown;
  school?: unknown;
  birth_date?: unknown;
  guardian_email?: unknown;
  guardian_verified_at?: unknown;
  terms_version?: unknown;
  privacy_version?: unknown;
  profile_completed_at?: unknown;
};

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

function parsedDate(value: unknown) {
  const text = clean(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function migrateSupabaseAccount(email: string, password: string, existing: typeof users.$inferSelect | undefined) {
  const runtime = env as unknown as Record<string, string>;
  const supabaseUrl = runtime.SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = runtime.SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey || existing?.role === "admin") return null;

  try {
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: publishableKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!tokenResponse.ok) return null;
    const auth = await tokenResponse.json() as { access_token?: unknown; user?: { id?: unknown; email?: unknown } };
    const accessToken = clean(auth.access_token, 4096);
    const supabaseId = clean(auth.user?.id, 80);
    const verifiedEmail = clean(auth.user?.email, 254).toLowerCase();
    if (!accessToken || !supabaseId || verifiedEmail !== email) return null;

    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(supabaseId)}&select=name,role,grade,school,birth_date,guardian_email,guardian_verified_at,terms_version,privacy_version,profile_completed_at&limit=1`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
      cache: "no-store",
    });
    const profiles = profileResponse.ok ? await profileResponse.json() as SupabaseProfile[] : [];
    const profile = profiles[0] ?? {};
    const passwordData = await hashPassword(password);
    const now = new Date();
    const db = getDb();

    if (existing) {
      await db.update(users).set({ passwordHash: passwordData.hash, passwordSalt: passwordData.salt, emailVerified: true, updatedAt: now }).where(eq(users.id, existing.id));
      return (await db.select().from(users).where(eq(users.id, existing.id)).limit(1))[0] ?? null;
    }

    const sourceRole = clean(profile.role, 40);
    const role = sourceRole === "teacher" || sourceRole === "pending_teacher" ? "pending_teacher" as const : "student" as const;
    const birthDate = clean(profile.birth_date, 10) || null;
    const termsVersion = clean(profile.terms_version, 100) || null;
    const privacyVersion = clean(profile.privacy_version, 100) || null;
    const completedAt = parsedDate(profile.profile_completed_at) ?? (birthDate && termsVersion && privacyVersion ? now : null);
    const migrated = {
      id: supabaseId,
      email,
      name: clean(profile.name, 100) || email.split("@")[0],
      role,
      grade: role === "student" ? clean(profile.grade, 20) || null : null,
      school: clean(profile.school, 120) || null,
      birthDate,
      guardianEmail: clean(profile.guardian_email, 254).toLowerCase() || null,
      guardianVerifiedAt: parsedDate(profile.guardian_verified_at),
      termsVersion,
      privacyVersion,
      profileCompletedAt: completedAt,
      accountStatus: completedAt ? "active" : "onboarding",
      passwordHash: passwordData.hash,
      passwordSalt: passwordData.salt,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(users).values(migrated);
    return migrated;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  await ensureSchema();
  const body = await request.json() as { email?: string; password?: string };
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!/^\S+@\S+\.\S+$/.test(email) || !password) return Response.json({ error: "შეიყვანეთ ელფოსტა და პაროლი" }, { status: 400 });

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limit = await consumeRateLimit(`auth-login:${await sha256(`${ip}|${email}`)}`, 10, 5 * 60_000);
  if (!limit.allowed) return Response.json({ error: "ბევრი მცდელობაა. ცოტა ხანში ისევ სცადეთ" }, { status: 429, headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" } });

  const db = getDb();
  let user: typeof users.$inferSelect | undefined = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  const valid = user?.passwordHash && user.passwordSalt ? await verifyPassword(password, user.passwordSalt, user.passwordHash) : false;
  if (!user || (!user.passwordHash && !user.passwordSalt)) {
    user = await migrateSupabaseAccount(email, password, user) ?? undefined;
  } else if (!valid) {
    user = undefined;
  }
  if (!user) return Response.json({ error: "ელფოსტა ან პაროლი არასწორია" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  let providerLinked = false;
  const pendingToken = oauthLinkToken(request);
  if (pendingToken) {
    const [pending] = await db.select().from(oauthLinkRequests).where(and(
      eq(oauthLinkRequests.tokenHash, await sha256(pendingToken)),
      eq(oauthLinkRequests.userId, user.id),
      gt(oauthLinkRequests.expiresAt, new Date()),
    )).limit(1);
    if (pending) {
      await db.insert(identities).values({ id: crypto.randomUUID(), userId: user.id, provider: pending.provider, providerSubject: pending.providerSubject, createdAt: new Date() }).onConflictDoNothing();
      await db.delete(oauthLinkRequests).where(eq(oauthLinkRequests.id, pending.id));
      providerLinked = true;
    }
  }

  const session = await createSession(user.id, request);
  const headers = new Headers({ "Set-Cookie": session.cookie, "Cache-Control": "no-store" });
  headers.append("Set-Cookie", oauthLinkCookie("", request, 0));
  return Response.json({ user: publicUser(user), providerLinked }, { headers });
}
