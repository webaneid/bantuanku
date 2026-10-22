import * as jose from "jose";

export interface JWTPayload {
  sub: string;
  email: string;
  name: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  roles: string[];
  isDeveloper?: boolean;
}

export async function signToken(
  payload: JWTPayload,
  secret: string,
  expiresIn: string = "15m"
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  // `typ` membedakan access token dari refresh/unsubscribe token (cegah token confusion)
  return new jose.SignJWT({ ...payload, typ: "access" } as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey);
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    // Tolak token yang bukan access token: token unsubscribe (`purpose`) atau refresh (`typ`).
    // Access token lama (sebelum ada claim `typ`) tetap diterima selama punya `roles` array —
    // masa berlakunya hanya 15 menit, jadi kelonggaran ini hilang dengan sendirinya.
    if (payload.purpose) return null;
    if (payload.typ !== undefined && payload.typ !== "access") return null;
    if (!Array.isArray(payload.roles)) return null;

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      phone: payload.phone as string | null | undefined,
      whatsappNumber: payload.whatsappNumber as string | null | undefined,
      roles: payload.roles as string[],
      isDeveloper: Boolean(payload.isDeveloper),
    };
  } catch {
    return null;
  }
}

export async function signRefreshToken(
  userId: string,
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);

  return new jose.SignJWT({ sub: userId, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<{ userId: string; issuedAt: number } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    // Access token (15 menit) tidak boleh bisa ditukar menjadi sesi refresh 7 hari.
    if (payload.purpose) return null;
    if (payload.typ !== undefined) {
      if (payload.typ !== "refresh") return null;
    } else if (payload.roles !== undefined || payload.email !== undefined) {
      // Refresh token lama (tanpa `typ`) hanya berisi `sub`; token berisi roles/email = access token
      return null;
    }
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, issuedAt: (payload.iat as number) ?? 0 };
  } catch {
    return null;
  }
}

export async function signUnsubscribeToken(
  donaturId: string,
  secret: string
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  return new jose.SignJWT({ sub: donaturId, purpose: "wa-unsubscribe" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifyUnsubscribeToken(
  token: string,
  secret: string
): Promise<{ donaturId: string; issuedAt: number } | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    if (payload.purpose !== "wa-unsubscribe") return null;
    return {
      donaturId: payload.sub as string,
      issuedAt: (payload.iat as number) ?? 0,
    };
  } catch {
    return null;
  }
}
