import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { createRegistration } from "../services/registration.service";
import { CreateRegistrationInput } from "../schemas/registration.schema";

export const createMemberRegistration = asyncHandler(async (req: Request, res: Response) => {
  const input = req.body as CreateRegistrationInput;

  const result = await createRegistration(input);

  // Whether the registration was newly created or already existed, return
  // the same generic success response so we never reveal whether a given
  // email has previously registered.
  if (result.status === "duplicate") {
    res.status(200).json({
      success: true,
      message: "Your registration has been received.",
    });
    return;
  }

  res.status(201).json({
    success: true,
    message: "Your registration has been received.",
  });
});
