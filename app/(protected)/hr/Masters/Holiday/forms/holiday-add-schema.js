import { z } from "zod";

export const HolidayAddSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Holiday name is required." })
      .max(255, {
        message: "Holiday name must not exceed 255 characters.",
      }),

    fromDate: z
      .string()
      .min(1, { message: "From date is required." })
      .refine((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

        const date = new Date(`${value}T00:00:00.000Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, { message: "Please select a valid from date." }),

    toDate: z
      .string()
      .min(1, { message: "To date is required." })
      .refine((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

        const date = new Date(`${value}T00:00:00.000Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      }, { message: "Please select a valid to date." }),

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
    (data) => data.fromDate <= data.toDate,
    {
      message: "To date cannot be earlier than from date.",
      path: ["toDate"],
    }
  );