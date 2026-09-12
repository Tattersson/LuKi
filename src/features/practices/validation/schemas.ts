import { z } from "zod";

const teamKeySchema = z.enum(["luki-2div", "luki-team"]);

const occurrenceFieldsSchema = z.object({
  teamKey: teamKeySchema,
  title: z.string().trim().max(200).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  locationName: z.string().trim().min(1).max(200),
  locationLat: z.number().min(-90).max(90).optional(),
  locationLng: z.number().min(-180).max(180).optional(),
  description: z.string().trim().max(2000).optional(),
});

const recurrenceSchema = z.discriminatedUnion("repeatWeekly", [
  z.object({ repeatWeekly: z.literal(true), until: z.coerce.date() }),
  z.object({ repeatWeekly: z.literal(false) }),
]);

export const createPracticeSchema = occurrenceFieldsSchema
  .extend({ recurrence: recurrenceSchema.optional() })
  .refine((data) => data.endAt.getTime() > data.startAt.getTime(), {
    message: "End time must be after the start time",
    path: ["endAt"],
  })
  .refine(
    (data) => !data.recurrence?.repeatWeekly || data.recurrence.until.getTime() >= data.startAt.getTime(),
    { message: "Repeat-until date must be on or after the first practice", path: ["recurrence"] },
  );

export const updatePracticeSchema = occurrenceFieldsSchema
  .extend({ practiceId: z.string().min(1) })
  .refine((data) => data.endAt.getTime() > data.startAt.getTime(), {
    message: "End time must be after the start time",
    path: ["endAt"],
  });
