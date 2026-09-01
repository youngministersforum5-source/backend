import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";

/**
 * Validates `req.body`, `req.query`, and `req.params` against a Zod schema
 * shaped as `{ body?, query?, params? }`. On success, the parsed (and
 * coerced/transformed) values are written back onto the request so
 * downstream handlers receive clean, typed data.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors: Record<string, string> = {};
        for (const issue of err.issues) {
          const key = issue.path.slice(1).join(".") || issue.path.join(".") || "value";
          if (!errors[key]) errors[key] = issue.message;
        }
        res.status(400).json({
          success: false,
          message: "Validation failed.",
          errors,
        });
        return;
      }
      next(err);
    }
  };
}
