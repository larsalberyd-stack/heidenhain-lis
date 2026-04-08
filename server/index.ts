import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { upsertUser, getUserByOpenId } from "./db";
import { randomBytes } from "crypto";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {

  const app = express();
  const server = createServer(app);

  // För att kunna läsa JSON-body
  app.use(express.json());
  // --- E-postbaserad inloggning ---
  const SESSION_COOKIE = "heidenhain_session";
  const SESSION_SECRET = process.env.JWT_SECRET || randomBytes(32).toString("hex");

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, name } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "E-post krävs" });
      }
      // Skapa eller uppdatera användare
      await upsertUser({ openId: email, email, name });
      const user = await getUserByOpenId(email);
      if (!user) return res.status(401).json({ error: "Ingen användare hittades" });

      // Skapa enkel sessionscookie (ej JWT, men tillräckligt för demo)
      const sessionValue = Buffer.from(`${user.id}:${SESSION_SECRET}`).toString("base64");
      res.cookie(SESSION_COOKIE, sessionValue, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7 * 1000, // 1 vecka (ms)
      });
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: "Serverfel vid inloggning" });
    }
  });


  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
