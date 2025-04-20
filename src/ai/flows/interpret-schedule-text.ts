'use server';
/**
 * @fileOverview Interprets schedule text using GenAI and translates it into a structured format for Google Calendar.
 *
 * - interpretScheduleText - A function that interprets schedule text and returns a structured format.
 * - InterpretScheduleTextInput - The input type for the interpretScheduleText function.
 * - InterpretScheduleTextOutput - The return type for the interpretScheduleText function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {CalendarEvent} from '@/services/calendar';

const InterpretScheduleTextInputSchema = z.object({
  scheduleText: z.string().describe('The schedule text to interpret (e.g., \'Mondays: Gym at 6 PM, Tuesdays: Yoga at 7 PM\').'),
});
export type InterpretScheduleTextInput = z.infer<typeof InterpretScheduleTextInputSchema>;

const InterpretScheduleTextOutputSchema = z.array(z.object({
    summary: z.string().describe('The title or summary of the event.'),
    startTime: z.string().describe('The start time of the event in ISO 8601 format (e.g., \'2024-03-15T09:00:00-07:00\').'),
    endTime: z.string().describe('The end time of the event in ISO 8601 format (e.g., \'2024-03-15T10:00:00-07:00\').'),
  }).describe('The calendar events to create.')
);
export type InterpretScheduleTextOutput = z.infer<typeof InterpretScheduleTextOutputSchema>;

export async function interpretScheduleText(input: InterpretScheduleTextInput): Promise<InterpretScheduleTextOutput> {
  return interpretScheduleTextFlow(input);
}

const interpretScheduleTextPrompt = ai.definePrompt({
  name: 'interpretScheduleTextPrompt',
  input: {
    schema: z.object({
      scheduleText: z.string().describe('The schedule text to interpret.'),
    }),
  },
  output: {
    schema: z.array(z.object({
      summary: z.string().describe('The title or summary of the event.'),
      startTime: z.string().describe('The start time of the event in ISO 8601 format (e.g., \'2024-03-15T09:00:00-07:00\').'),
      endTime: z.string().describe('The end time of the event in ISO 8601 format (e.g., \'2024-03-15T10:00:00-07:00\').'),
    }).describe('The calendar events to create.')),
  },
  prompt: `You are a scheduling assistant that converts human readable text into a structured JSON format that can be used to create calendar events.

  The schedule text is: {{{scheduleText}}}

  Convert the schedule text into a JSON array of calendar events.  Each element of the array should have a summary, startTime, and endTime field.  The startTime and endTime fields should be in ISO 8601 format.
  `,
});

const interpretScheduleTextFlow = ai.defineFlow<
  typeof InterpretScheduleTextInputSchema,
  typeof InterpretScheduleTextOutputSchema
>({
  name: 'interpretScheduleTextFlow',
  inputSchema: InterpretScheduleTextInputSchema,
  outputSchema: InterpretScheduleTextOutputSchema,
}, async input => {
  const {output} = await interpretScheduleTextPrompt(input);
  return output!;
});
