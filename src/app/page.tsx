
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

export default function Home() {
  const [scheduleText, setScheduleText] = useState("");
  const [generatedSchedule, setGeneratedSchedule] = useState<CalendarEvent[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
