import { z } from "zod";

/**
 * Matches loose international WhatsApp/phone number formats, e.g.
 * "+2348000000000". Kept permissive since phone formats vary widely, but
 * bounded in length and character set to reject garbage input.
 */
const whatsappRegex = /^\+?[0-9\s\-()]{7,20}$/;

const giftsSchema = z
  .object({
    writing: z.boolean().optional().default(false),
    media: z.boolean().optional().default(false),
    intercession: z.boolean().optional().default(false),
    onGround: z.boolean().optional().default(false),
  })
  .strict();

export const createRegistrationSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name is too short")
      .max(120, "Full name is too long"),
    whatsapp: z
      .string()
      .trim()
      .regex(whatsappRegex, "Invalid WhatsApp number"),
    email: z.string().trim().toLowerCase().email("Invalid email address").max(255),
    location: z.string().trim().min(2, "Location is required").max(160),
    gender: z.enum(["male", "female"], {
      errorMap: () => ({ message: "Gender must be 'male' or 'female'" }),
    }),
    soundDoctrine: z.literal(true, {
      errorMap: () => ({ message: "You must affirm sound doctrine to register" }),
    }),
    activeFellowship: z.literal(true, {
      errorMap: () => ({ message: "You must be in an active fellowship to register" }),
    }),
    intent: z
      .string()
      .trim()
      .min(20, "Please share a bit more about your intent (minimum 20 characters)")
      .max(2000, "Statement of intent is too long (maximum 2000 characters)"),
    gifts: giftsSchema,
    giftOther: z.string().trim().max(200).optional().default(""),
  }),
});

export type CreateRegistrationInput = z.infer<typeof createRegistrationSchema>["body"];

export const updateMemberStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid member id"),
  }),
  body: z.object({
    status: z.enum(["pending", "approved", "rejected"]),
  }),
});

export const memberIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid member id"),
  }),
});

export const listMembersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(160).optional(),
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    sortBy: z.enum(["createdAt", "fullName", "status"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});
