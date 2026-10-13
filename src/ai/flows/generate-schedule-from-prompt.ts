'use server';

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const calendarEventSchema = z.object({
  summary: z.string().trim().min(1).describe('A short, clear event title.'),
  startTime: z.string().datetime({offset: true}).describe('The event start time as ISO 8601 with a UTC offset.'),
  endTime: z.string().datetime({offset: true}).describe('The event end time as ISO 8601 with a UTC offset.'),
}).refine(
  event => new Date(event.endTime).getTime() > new Date(event.startTime).getTime(),
  {message: 'An event must end after it starts.'}
);

const GenerateScheduleFromPromptInputSchema = z.object({
  prompt: z.string().trim().min(1).max(5000).describe('The prompt describing the schedule to generate.'),
  currentDate: z.string().describe('The current local date in YYYY-MM-DD format.'),
  timeZone: z.string().describe('The user local IANA time zone.'),
});
export type GenerateScheduleFromPromptInput = z.infer<
  typeof GenerateScheduleFromPromptInputSchema
>;

const GenerateScheduleFromPromptOutputSchema = z.object({
  events: z.array(calendarEventSchema).min(1).max(100)
    .describe('The generated schedule as an array of calendar events.'),
});
export type GenerateScheduleFromPromptOutput = z.infer<
  typeof GenerateScheduleFromPromptOutputSchema
>;

export async function generateScheduleFromPrompt(
  input: GenerateScheduleFromPromptInput
): Promise<GenerateScheduleFromPromptOutput> {
  return generateScheduleFromPromptFlow(input);
}

const generateSchedulePrompt = ai.definePrompt({
  name: 'generateSchedulePrompt',
  input: {
    schema: GenerateScheduleFromPromptInputSchema,
  },
  output: {
    schema: GenerateScheduleFromPromptOutputSchema,
  },
  prompt: `You are a practical personal planning assistant. Turn the user's request into a useful, realistic schedule of specific calendar events.

Use the user's local date and time zone when resolving relative dates and times. If the request gives no date, schedule it starting today. For repeated weekly routines without an end date, create the next seven days of occurrences. Respect any duration or date range the user specifies.
Return at least one event and no more than 100. Use concise event titles, ISO 8601 timestamps with the supplied time zone's correct UTC offset, and ensure every end time is after its start time. Do not invent events unrelated to the request.

Current local date: {{{currentDate}}}
User time zone: {{{timeZone}}}
Request: {{{prompt}}}`,
});

const generateScheduleFromPromptFlow = ai.defineFlow<
  typeof GenerateScheduleFromPromptInputSchema,
  typeof GenerateScheduleFromPromptOutputSchema
>(
  {
    name: 'generateScheduleFromPromptFlow',
    inputSchema: GenerateScheduleFromPromptInputSchema,
    outputSchema: GenerateScheduleFromPromptOutputSchema,
  },
  async input => {
    const {output} = await generateSchedulePrompt(input);

    if (!output) {
      throw new Error('The AI did not return a schedule. Please try a more specific request.');
    }

    return output;
  }
);
