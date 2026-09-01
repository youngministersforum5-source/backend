import { z } from "zod";

export const createSubscriptionSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
  }),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>["body"];

export const updateSubscriberSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid subscriber id"),
  }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const listSubscribersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(160).optional(),
    isActive: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === "true")),
    sortBy: z.enum(["subscribedAt", "email"]).default("subscribedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  }),
});
