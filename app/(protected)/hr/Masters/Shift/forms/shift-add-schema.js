
import { z } from "zod";

const timeSchema = z
  .string()
  .min(1, { message: "Time is required." })
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: "Please enter a valid time in HH:mm format.",
  });

const minutesSchema = (fieldName, defaultValue) =>
  z
    .union([z.number(), z.string()])
    .transform((value) =>
      value === "" || value === undefined ? defaultValue : Number(value)
    )
    .pipe(
      z
        .number()
        .int({ message: `${fieldName} must be a whole number.` })
        .min(0, { message: `${fieldName} cannot be negative.` })
        .max(1440, {
          message: `${fieldName} cannot exceed 1440 minutes.`,
        })
    );

export const ShiftAddSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Shift name is required." })
      .max(255, {
        message: "Shift name must not exceed 255 characters.",
      }),

    inTime: timeSchema,

    outTime: timeSchema,

    graceTime: minutesSchema("Grace time", 0),

    earlyInMinutes: minutesSchema("Early-in minutes", 0),

    lateOutMinutes: minutesSchema("Late-out minutes", 0),

    halfDayMinutes: minutesSchema("Half-day minutes", 240),

    fullDayMinutes: minutesSchema("Full-day minutes", 480),

    crossesMidnight: z.enum(["true", "false"], {
      message: "Please select whether the shift crosses midnight.",
    }),

    description: z
      .string()
      .trim()
      .max(1000, {
        message: "Description must not exceed 1000 characters.",
      })
      .optional()
      .default(""),

    status: z.enum(["true", "false"], {
      message: "Please select a valid status.",
    }),
  })
  .refine(
    (data) => data.halfDayMinutes <= data.fullDayMinutes,
    {
      message: "Half-day minutes cannot exceed full-day minutes.",
      path: ["halfDayMinutes"],
    }
  )
  .refine(
    (data) => data.fullDayMinutes > 0,
    {
      message: "Full-day minutes must be greater than zero.",
      path: ["fullDayMinutes"],
    }
  )
  .refine(
    (data) => {
      if (data.inTime === data.outTime) {
        return data.crossesMidnight === "true";
      }

      if (data.outTime < data.inTime) {
        return data.crossesMidnight === "true";
      }

      return true;
    },
    {
      message:
        "Enable crosses midnight when the shift ends on the next day.",
      path: ["crossesMidnight"],
    }
  );
