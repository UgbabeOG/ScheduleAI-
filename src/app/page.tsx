"use client";

import { useState } from 'react';
import { generateScheduleFromPrompt } from "@/ai/flows/generate-schedule-from-prompt";
import { interpretScheduleText } from "@/ai/flows/interpret-schedule-text";
import { CalendarEvent } from "@/services/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icons } from "@/components/icons";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as z from "zod"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const eventSchema = z.object({
  summary: z.string().min(3, {
    message: "Summary must be at least 3 characters.",
  }),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  alarm: z.boolean().default(false),
  recurrence: z.string().optional(),
});

type EventValues = z.infer<typeof eventSchema>

export default function Home() {
  const [scheduleText, setScheduleText] = useState("");
  const [generatedSchedule, setGeneratedSchedule] = useState<CalendarEvent[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);

  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      summary: "",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      alarm: false,
      recurrence: ""
    },
    mode: "onChange",
  });

  const handleGenerateSchedule = async () => {
    setError(null);
    setStatusMessage(null);

    try {
      const result = await generateScheduleFromPrompt({ prompt: scheduleText });
      setGeneratedSchedule(result.events as CalendarEvent[]);
      setStatusMessage("Schedule generated successfully!  Check your Google Calendar.");
    } catch (e: any) {
      setError(`Failed to generate schedule: ${e.message}`);
    }
  };

  const handleInterpretSchedule = async () => {
    setError(null);
    setStatusMessage(null);

    try {
      const result = await interpretScheduleText({ scheduleText: scheduleText });
      setGeneratedSchedule(result as CalendarEvent[]);
      setStatusMessage("Schedule interpreted successfully! Check your Google Calendar.");
    } catch (e: any) {
      setError(`Failed to interpret schedule: ${e.message}`);
    }
  };

  const handleEditEvent = (index: number) => {
    setEditingEventIndex(index);
    const eventToEdit = generatedSchedule[index];
    form.reset({
      summary: eventToEdit.summary,
      startTime: eventToEdit.startTime,
      endTime: eventToEdit.endTime,
      alarm: false, // Assuming default value for alarm
      recurrence: "" // Assuming default value for recurrence
    });
  };

  const handleUpdateEvent = async (values: EventValues) => {
    if (editingEventIndex !== null) {
      const updatedSchedule = [...generatedSchedule];
      updatedSchedule[editingEventIndex] = {
        summary: values.summary,
        startTime: values.startTime,
        endTime: values.endTime,
      };
      setGeneratedSchedule(updatedSchedule);
      setEditingEventIndex(null);
      setStatusMessage("Schedule updated successfully!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-2xl font-bold mb-4">ScheduleAI</h1>

      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Enter schedule or instruction"
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
            />
          </div>

          <div className="flex justify-between mb-4">
            <Button variant="outline" onClick={handleGenerateSchedule}>
              Generate Schedule
            </Button>
            <Button variant="outline" onClick={handleInterpretSchedule}>
              Interpret Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {statusMessage && (
        <Alert className="mt-4 w-full max-w-md">
          <Icons.check className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{statusMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mt-4 w-full max-w-md">
          <Icons.close className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {generatedSchedule.length > 0 && (
        <Card className="w-full max-w-md mt-4">
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Generated Schedule:</h2>
            <ul>
              {generatedSchedule.map((event, index) => (
                <li key={index} className="mb-2">
                  <strong>{event.summary}</strong>
                  <br />
                  Start: {event.startTime}
                  <br />
                  End: {event.endTime}
                  <Button variant="secondary" size="sm" onClick={() => handleEditEvent(index)}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {editingEventIndex !== null && (
        <Card className="w-full max-w-md mt-4">
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Edit Event</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateEvent)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Summary</FormLabel>
                      <FormControl>
                        <Input placeholder="Event summary" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} value={field.value?.substring(0, 16)} onChange={(e) => field.onChange(e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} value={field.value?.substring(0, 16)} onChange={(e) => field.onChange(e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="alarm"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Set Alarm</FormLabel>
                        <FormDescription>
                          Enable or disable alarm for this event.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit">Update Event</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
