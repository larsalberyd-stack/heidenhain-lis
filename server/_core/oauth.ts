import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

export function registerOAuthRoutes(app: Express) {

  // Register — create account with email + password
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!email || !password) {
      res.status(400).json({ error: "E-post och lösenord är obligatoriskt" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Lösenordet måste vara minst 6 tecken" });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const openId = `email:${normalizedEmail}`;

    try {
      const existing = await db.getUserByOpenId(openId);
      if (existing) {
        res.status(409).json({ error: "E-postadressen är redan registrerad" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await db.upsertUser({
        openId,
        name: name || null,
        email: normalizedEmail,
        passwordHash,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: name || normalizedEmail,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Register failed", error);
      res.status(500).json({ error: "Registrering misslyckades" });
    }
  });

  // Login — email + password
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ error: "E-post och lösenord är obligatoriskt" });
      return;
    }

    const normalizedEmail = email.toLowerCase();
    const openId = `email:${normalizedEmail}`;

    try {
      const user = await db.getUserByOpenId(openId);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Fel e-post eller lösenord" });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Fel e-post eller lösenord" });
        return;
      }

      await db.upsertUser({
        openId,
        name: user.name || null,
        email: normalizedEmail,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: user.name || normalizedEmail,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true });
    } catch (error) {
      console.error("[Auth] Login failed", error);
      res.status(500).json({ error: "Inloggning misslyckades" });
    }
  });
}
