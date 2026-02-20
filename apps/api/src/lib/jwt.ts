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

  return new jose.SignJWT({ ...payload } as jose.JWTPayload)
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

  return new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyRefreshToken(
  token: string,
  secret: string
): Promise<string | null> {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload.sub as string;
  } catch {
    return null;
  }
}
