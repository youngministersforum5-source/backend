import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createSubscription } from "../services/subscription.service";
import { CreateSubscriptionInput } from "../schemas/subscription.schema";

export const createNewSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as CreateSubscriptionInput;

  // Regardless of whether the email is new or already subscribed, the
  // response is identical — we never reveal whether an email already
  // exists in the subscriber list.
  await createSubscription(email);

  res.status(200).json({
    success: true,
    message: "Thank you for subscribing.",
  });
});
