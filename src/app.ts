import express, { Express, NextFunction, Request, Response } from "express";
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

 
  app.set("trust proxy", 1);

  app.use(helmet());

  // Allow both the apex domain and the www subdomain as valid origins.
  // env.FRONTEND_URL can be a single URL or a comma-separated list of URLs.
  const allowedOrigins = env.FRONTEND_URL.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests with no Origin header (curl, server-to-server, health
        // checks, mobile apps) are allowed through.
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn({ origin }, "Blocked request from disallowed origin");
          callback(new Error("Not allowed by CORS"));
        }
      },
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

  // Give CORS rejection errors a clean 403 instead of falling through to a
  // generic 500 in errorHandler.
  app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
    if (err.message === "Not allowed by CORS") {
      res.status(403).json({ success: false, message: "Origin not allowed" });
      return;
    }
    next(err);
  });

  app.use(errorHandler);

  return app;
}