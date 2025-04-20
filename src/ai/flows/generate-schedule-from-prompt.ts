'use server';

/**
 * @fileOverview A flow that generates a schedule from a user prompt using GenAI.
 *
 * - generateScheduleFromPrompt - A function that handles the schedule generation process.
 * - GenerateScheduleFromPromptInput - The input type for the generateScheduleFromPrompt function.
 * - GenerateScheduleFromPromptOutput - The return type for the generateScheduleFromPrompt function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import {CalendarEvent, createCalendarEvent} from '@/services/calendar';

const GenerateScheduleFromPromptInputSchema = z.object({
  prompt: z.string().describe('The prompt describing the schedule to generate.'),
});
export type GenerateScheduleFromPromptInput = z.infer<
  typeof GenerateScheduleFromPromptInputSchema
>;

const GenerateScheduleFromPromptOutputSchema = z.object({
  events: z.array(
    z.object({
      summary: z.string().describe('The title or summary of the event.'),
      startTime: z.string().describe('The start time of the event (ISO 8601 format).'),
      endTime: z.string().describe('The end time of the event (ISO 8601 format).'),
    })
  ).describe('The generated schedule as an array of calendar events.'),
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
    schema: z.object({
      prompt: z.string().describe('The prompt describing the schedule to generate.'),
    }),
  },
  output: {
    schema: z.object({
      events: z
        .array(
          z.object({
            summary: z.string().describe('The title or summary of the event.'),
            startTime: z
              .string()
              .describe('The start time of the event (ISO 8601 format).'),
            endTime: z.string().describe('The end time of the event (ISO 8601 format).'),
          })
        )
        .describe('The generated schedule as an array of calendar events.'),
    }),
  },
  prompt: `You are a personal assistant that can create a schedule based on user prompts.
  Create a detailed schedule based on the prompt below.
  The output should be a JSON array of calendar events with the keys summary, startTime, and endTime.
  The startTime and endTime should be in ISO 8601 format.
  Prompt: {{{prompt}}}`,
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
      throw new Error('Failed to generate schedule from prompt.');
    }

    // Example of calling the calendar service.
    for (const event of output.events) {
      await createCalendarEvent(event as CalendarEvent);
    }

    return output;
  }
);
