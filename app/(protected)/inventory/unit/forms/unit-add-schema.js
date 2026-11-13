import { z } from "zod";

export const UnitAddSchema = z.object({
  unitName: z
    .string()
    .trim()
    .min(1, { message: "Unit name is required." })
    .max(255, {
      message: "Unit name must not exceed 255 characters.",
    }),

  abbreviation: z
    .string()
    .trim()
    .min(1, { message: "Abbreviation is required." })
    .max(100, {
      message: "Abbreviation must not exceed 100 characters.",
    }),

  status: z.enum(["true", "false"], {
    message: "Please select a valid status.",
  }),
});