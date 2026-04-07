import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

class SDKServer {
  // Only local login, no OAuth
  async createSessionToken(openId: string, options: { expiresInMs?: number; name?: string } = {}): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = new TextEncoder().encode(ENV.cookieSecret);
    return new SignJWT({ openId, name: options.name || "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(cookieValue: string | undefined | null): Promise<{ openId: string; name: string } | null> {
    if (!cookieValue) return null;
    try {
      const secretKey = new TextEncoder().encode(ENV.cookieSecret);
      const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
      const { openId, name } = payload as Record<string, unknown>;
      if (!isNonEmptyString(openId) || !isNonEmptyString(name)) return null;
      return { openId, name };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = req.headers.cookie || "";
    const sessionCookie = cookies.split(";").map(c => c.trim()).find(c => c.startsWith(COOKIE_NAME + "="))?.split("=")[1];
    const session = await this.verifySession(sessionCookie);
    if (!session) throw ForbiddenError("Invalid session cookie");
    const user = await db.getUserByOpenId(session.openId);
    if (!user) throw ForbiddenError("User not found");
    await db.upsertUser({
      openId: user.openId,
      name: user.name || null,
      email: user.email ?? null,
      lastSignedIn: new Date(),
    });
    return user;
  }
}

export const sdk = new SDKServer();

