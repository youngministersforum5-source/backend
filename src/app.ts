import express, { Express, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { query } from "./config/database";
import apiV1Routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";

export function createApp(): Express {
  const app = express();

  // Trust the first proxy hop (needed for correct client IPs behind
  // Railway/Render/Fly.io/etc. reverse proxies, which rate limiting relies on).
  app.set("trust proxy", 1);

  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Request size limits to mitigate abuse via oversized payloads.
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: true, limit: "100kb" }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      redact: ["req.headers.cookie", "req.headers.authorization"],
      autoLogging: {
        ignore: (req) => req.url === "/health",
      },
    })
  );

  app.get("/health", async (_req: Request, res: Response) => {
    let dbHealthy = true;
    try {
      await query("SELECT 1");
    } catch {
      dbHealthy = false;
    }

    res.status(dbHealthy ? 200 : 503).json({
      success: dbHealthy,
      status: dbHealthy ? "healthy" : "unhealthy",
    });
  });

  app.use("/api/v1", apiV1Routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
