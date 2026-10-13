'use server';

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const calendarEventsSchema = z.array(z.object({
  summary: z.string().trim().min(1).describe('A short, clear event title.'),
  startTime: z.string().datetime({offset: true}).describe('The event start time as ISO 8601 with a UTC offset.'),
  endTime: z.string().datetime({offset: true}).describe('The event end time as ISO 8601 with a UTC offset.'),
}).refine(
  event => new Date(event.endTime).getTime() > new Date(event.startTime).getTime(),
  {message: 'An event must end after it starts.'}
)).min(1).max(100);

const InterpretScheduleTextInputSchema = z.object({
  scheduleText: z.string().trim().min(1).max(5000)
    .describe('The schedule text to interpret.'),
  currentDate: z.string().describe('The current local date in YYYY-MM-DD format.'),
  timeZone: z.string().describe('The user local IANA time zone.'),
});
export type InterpretScheduleTextInput = z.infer<typeof InterpretScheduleTextInputSchema>;
export type InterpretScheduleTextOutput = z.infer<typeof calendarEventsSchema>;

export async function interpretScheduleText(
  input: InterpretScheduleTextInput
): Promise<InterpretScheduleTextOutput> {
  return interpretScheduleTextFlow(input);
}

const interpretScheduleTextPrompt = ai.definePrompt({
  name: 'interpretScheduleTextPrompt',
  input: {
    schema: InterpretScheduleTextInputSchema,
  },
  output: {
    schema: calendarEventsSchema,
  },
  prompt: `Convert the user's text into specific, valid calendar events. Use the current local date and time zone to resolve weekdays, relative dates, and times. If there is no explicit date, use the next upcoming occurrence; for a repeated weekly routine without an end date, include occurrences over the next seven days. Respect any duration or date range the user specifies.

Return between 1 and 100 events. Every event must have a concise summary, ISO 8601 startTime and endTime with the correct UTC offset for the user's time zone, and an end later than its start. Do not add events not described by the user.

Current local date: {{{currentDate}}}
User time zone: {{{timeZone}}}
Schedule text: {{{scheduleText}}}`,
});

const interpretScheduleTextFlow = ai.defineFlow<
  typeof InterpretScheduleTextInputSchema,
  typeof calendarEventsSchema
>({
  name: 'interpretScheduleTextFlow',
  inputSchema: InterpretScheduleTextInputSchema,
  outputSchema: calendarEventsSchema,
}, async input => {
  const {output} = await interpretScheduleTextPrompt(input);
  if (!output) {
    throw new Error('The AI could not interpret this schedule. Please add dates or times and try again.');
  }
  return output;
});
