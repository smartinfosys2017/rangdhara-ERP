import { z } from "zod";

export const BreakTimeAddSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, {
        message: "Break time name is required.",
      })
      .max(255, {
        message: "Break time name must not exceed 255 characters.",
      }),

    fromTime: z
      .string()
      .min(1, {
        message: "Break start time is required.",
      })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: "Please enter a valid start time.",
      }),

    toTime: z
      .string()
      .min(1, {
        message: "Break end time is required.",
      })
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
        message: "Please enter a valid end time.",
      }),

    breakType: z
      .string()
      .min(1, {
        message: "Please select a break type.",
      }),

    durationMinutes: z
      .string()
      .refine(
        (value) =>
          value === "" ||
          (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))),
        {
          message: "Duration must be a valid whole number.",
        }
      )
      .refine(
        (value) => value === "" || Number(value) >= 0,
        {
          message: "Duration cannot be negative.",
        }
      ),

    isFlexible: z.boolean(),

    status: z.enum(["true", "false"], {
      message: "Please select a valid status.",
    }),
  })
  .refine((data) => data.fromTime !== data.toTime, {
    message: "Break end time must be different from break start time.",
    path: ["toTime"],
  });