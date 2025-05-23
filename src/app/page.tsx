
"use client";
import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback, useRef } from 'react';
import { generateScheduleFromPrompt } from "@/ai/flows/generate-schedule-from-prompt";
import { interpretScheduleText } from "@/ai/flows/interpret-schedule-text";
import { CalendarEvent, createCalendarEvent } from "@/services/calendar";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as z from "zod"
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster"

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

interface Schedule {
  id: string;
  name: string;
  events: CalendarEvent[];
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

const scheduleExamples = [
  "Monday: Gym at 6 PM, Tuesday: Yoga at 7 PM",
  "Work from 9 AM to 5 PM, Lunch at 12 PM",
  "Meeting with John at 10 AM, Coffee break at 3 PM",
  "Daily workout at 7 AM, Meditation at 8 PM",
];

export default function Home() {
  const { setTheme, resolvedTheme } = useTheme();
  const [scheduleText, setScheduleText] = useState("");
  const [generatedSchedule, setGeneratedSchedule] = useState<CalendarEvent[]>([]);
  const [initialGeneratedSchedule, setInitialGeneratedSchedule] = useState<CalendarEvent[]>([]);
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [scheduleName, setScheduleName] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [exampleIndex, setExampleIndex] = useState(0);
  const [suggestion, setSuggestion] = useState(scheduleExamples[0]);
  const [isSuggestionFading, setIsSuggestionFading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedSchedules = localStorage.getItem('schedules');
    if (storedSchedules) {
      setSchedules(JSON.parse(storedSchedules));
    }
  }, []);

  useEffect(() => {
    if (isClient) { // Guard localStorage access
        localStorage.setItem('schedules', JSON.stringify(schedules));
    }
  }, [schedules, isClient]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setIsSuggestionFading(true);
      setTimeout(() => {
        setExampleIndex((prevIndex) => (prevIndex + 1) % scheduleExamples.length);
        // Ensure exampleIndex is updated before setting suggestion
        setSuggestion(scheduleExamples[(exampleIndex + 1) % scheduleExamples.length]);
        setIsSuggestionFading(false);
      }, 500);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [exampleIndex]); 
 
  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema), 
    defaultValues: { 
      summary: "",
      startTime: "", 
      endTime: "",   
      alarm: false,
      recurrence: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (isClient) { 
        if (editingEventIndex === null) {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            const localISOTime = (date: Date) => new Date(date.getTime() - offset).toISOString().substring(0, 16);
            
            form.reset({
                summary: "",
                startTime: localISOTime(now),
                endTime: localISOTime(new Date(now.getTime() + 60 * 60 * 1000)), // Default to 1 hour later
                alarm: false,
                recurrence: "",
            });
        } else {
            const eventToEdit = generatedSchedule[editingEventIndex];
             const offset = new Date().getTimezoneOffset() * 60000;
             const localISOTime = (isoString: string) => new Date(new Date(isoString).getTime() - offset).toISOString().substring(0, 16);

            form.reset({
                summary: eventToEdit.summary,
                startTime: localISOTime(eventToEdit.startTime),
                endTime: localISOTime(eventToEdit.endTime),
                alarm: false, 
                recurrence: "" 
            });
        }
    }
  }, [form, editingEventIndex, isClient, generatedSchedule]);

  const handleGenerateSchedule = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await generateScheduleFromPrompt({ prompt: scheduleText });
      setGeneratedSchedule(result.events as CalendarEvent[]);
      setInitialGeneratedSchedule(result.events as CalendarEvent[]);
        toast({
            title: "Success",
            description: "Schedule generated successfully!",
        })
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to generate schedule: ${e.message}`,
        })
    } finally {
      setIsLoading(false);
    }
  }, [scheduleText, isLoading, toast]);
  
  const handleInterpretSchedule = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const result = await interpretScheduleText({ scheduleText: scheduleText });
      setGeneratedSchedule(result as CalendarEvent[]);
      setInitialGeneratedSchedule(result as CalendarEvent[]);
        toast({
            title: "Success",
            description: "Schedule interpreted successfully!",
        })
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to interpret schedule: ${e.message}`,
        })
    } finally {
      setIsLoading(false);
    }
  }, [scheduleText, isLoading, toast]);

  const handleEditEvent = useCallback((index: number) => {
    setEditingEventIndex(index);
  }, []);


  const handleUpdateEvent = useCallback((values: EventValues) => {
    if (editingEventIndex !== null) {
      const updatedSchedule = [...generatedSchedule];
      updatedSchedule[editingEventIndex] = {
        summary: values.summary,
        startTime: new Date(values.startTime).toISOString(),
        endTime: new Date(values.endTime).toISOString(),
      };
      setGeneratedSchedule(updatedSchedule);
      setEditingEventIndex(null);
       toast({
            title: "Success",
            description: "Schedule updated successfully!",
        })
    }
  }, [generatedSchedule, editingEventIndex, toast]);
  
  const handleDiscardChanges = () => {
    setGeneratedSchedule([...initialGeneratedSchedule]);
    setEditingEventIndex(null); 
       toast({
            title: "Success",
            description: "Changes discarded. Schedule reverted to initial state.",
        })
  };

  const handleSaveSchedule = useCallback(() => {
    if (scheduleName.trim() === "") {
       toast({
            variant: "destructive",
            title: "Error",
            description: "Schedule name is required.",
        })
      return;
    }
    const newSchedule: Schedule = {
      id: generateId(),
      name: scheduleName,
      events: generatedSchedule,
    };
    setSchedules([...schedules, newSchedule]);
    setScheduleName("");
       toast({
            title: "Success",
            description: "Schedule saved successfully!",
        })
  }, [scheduleName, generatedSchedule, schedules, toast]);

  const handleAddToCalendar = async () => {
    if (generatedSchedule.length === 0) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "No schedule to add to calendar.",
        });
        return;
    }
    setIsLoading(true);
    try { 
      for (const event of generatedSchedule) {
        await createCalendarEvent(event);
      }
       toast({
            title: "Success",
            description: "Schedule added to calendar successfully! Check your Google Calendar.",
        })
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to add schedule to calendar: ${e.message}`,
        })
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (isLoading) return;
    setDeletingScheduleId(scheduleId);
    setIsDialogOpen(true);
  };

  const confirmDeleteSchedule = useCallback(async () => {
    if (deletingScheduleId) {
      const updatedSchedules = schedules.filter(schedule => schedule.id !== deletingScheduleId);
      setSchedules(updatedSchedules);
      if (selectedScheduleId === deletingScheduleId) {
        setGeneratedSchedule([]);
        setInitialGeneratedSchedule([]);
        setSelectedScheduleId(null);
      }
        toast({
            title: "Success",
            description: "Schedule deleted successfully!",
        })
      setIsDialogOpen(false);
      setDeletingScheduleId(null);
    }
  }, [schedules, deletingScheduleId, selectedScheduleId, toast]);

  const cancelDeleteSchedule = useCallback(() => {
    setIsDialogOpen(false);
    setDeletingScheduleId(null);
  }, []);

  const handleLoadSchedule = useCallback(async (scheduleId: string) => {
    if (isLoading) return
    setIsLoading(true);
     try {
      setSelectedScheduleId(scheduleId);
      const selectedSchedule = schedules.find(schedule => schedule.id === scheduleId);
      if (selectedSchedule) {
        setGeneratedSchedule([...selectedSchedule.events]);
        setInitialGeneratedSchedule([...selectedSchedule.events]); 
           toast({
                title: "Success",
                description: `Schedule "${selectedSchedule.name}" loaded successfully!`,
            })
      } 
     } finally {
        setIsLoading(false);
      }
  }, [isLoading, schedules, toast]);

  const clearInputField = () => {
    setScheduleText("");
    if (inputRef.current) {
        inputRef.current.focus();
      }
  };
  const handleSuggestionClick = () => {
    setScheduleText(suggestion);
     if (inputRef.current) {
        inputRef.current.focus();
      }
  };

  return (
    <>
    <Toaster />
    <main className="relative flex flex-col items-center justify-center min-h-screen py-8 px-4 bg-gradient-to-br from-slate-900 to-slate-700 text-foreground body-container">
      
      <div className="flex items-center space-x-2 absolute right-4 top-4">
        {isClient ? (
          <>
            <Label htmlFor="dark-mode" className="text-sm text-muted-foreground">
              {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
            </Label>
            <Switch
              id="dark-mode"
              checked={resolvedTheme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </>
        ) : (
          <>
            <div className="h-5 w-[75px] bg-muted animate-pulse rounded-md" /> 
            <div className="h-6 w-11 bg-muted animate-pulse rounded-full" /> 
          </>
        )}
      </div>
      <h1 className="text-5xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-500 animate-pulse">ScheduleAI</h1>

      <Card className="w-full max-w-lg bg-card/70 backdrop-blur-md border-border shadow-xl">
        <CardContent className="p-6">
        <div className="mb-4">
          <div className="relative flex items-center">
            <Input
              type="text"
              placeholder="Enter schedule or instruction (e.g., 'Morning jog at 7am')"
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              ref={inputRef}
              className="pr-10"
            />
             <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              onClick={clearInputField}
              aria-label="Clear Input"
            >
              <Icons.close className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex justify-center mt-2 mb-4 h-6 items-center">
          <Button
            variant="link"
            className={cn(
              "transition-opacity duration-500 ease-in-out text-primary hover:text-primary/90",
              isSuggestionFading ? "opacity-0" : "opacity-100"
            )}
            onClick={handleSuggestionClick}
            disabled={isSuggestionFading}
          >
            {suggestion}
          </Button>
        </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
            <Button variant="default" onClick={handleGenerateSchedule} disabled={isLoading} className="flex-1 transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105">
              <Icons.workflow className="mr-2 h-4 w-4" /> Generate Schedule
              {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
            <Button variant="secondary" onClick={handleInterpretSchedule} disabled={isLoading} className="flex-1 transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105">
              <Icons.edit className="mr-2 h-4 w-4" /> Interpret Text
              {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-lg mt-6 bg-card/70 backdrop-blur-md border-border shadow-xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3 text-foreground">Previous Schedules:</h2>
            {schedules.length === 0 ? (
              <p className="text-muted-foreground">No schedules saved yet.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {schedules.map((schedule) => (
                  <li key={schedule.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <Button variant="link" size="sm" onClick={() => handleLoadSchedule(schedule.id)} className="text-primary hover:text-primary/90 font-medium truncate">
                      {schedule.name}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSchedule(schedule.id)} className="text-destructive hover:text-destructive/90 hover:bg-destructive/10 h-8 w-8">
                      <Icons.trash className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      {generatedSchedule.length > 0 && (
        <Card className="w-full max-w-lg mt-6 bg-card/70 backdrop-blur-md border-border shadow-xl transition-opacity duration-500 ease-in-out">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-3 text-foreground">Generated Schedule:</h2>
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-2">
              {generatedSchedule.map((event, index) => (
                <li key={index} className="p-3 bg-muted/50 rounded-lg shadow">
                  <div className="flex justify-between items-center">
                    <strong className="text-primary">{event.summary}</strong>
                    <Button variant="outline" size="sm" onClick={() => handleEditEvent(index)} className="h-7 px-2 py-1 text-xs">
                      Edit
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start: {new Date(event.startTime).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    End: {new Date(event.endTime).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-6 mb-4">
              <Input
                type="text"
                placeholder="Enter schedule name to save"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
              <Button variant="default" className="flex-1 transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105" onClick={handleSaveSchedule}>
                Save Schedule
              </Button>
              <Button variant="outline"  className="flex-1 transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105" onClick={handleDiscardChanges}>
                Discard Changes
              </Button>
              <Button variant="default" className="flex-1 transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105" onClick={handleAddToCalendar} disabled={isLoading}>
                Add to Calendar {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingEventIndex !== null && (
        <Card className="w-full max-w-lg mt-6 bg-card/70 backdrop-blur-md border-border shadow-xl transition-opacity duration-500 ease-in-out">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Edit Event</h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleUpdateEvent)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Summary</FormLabel>
                      <FormControl>
                        <Input placeholder="Event summary" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value ? field.value.substring(0, 16) : ''} 
                          onChange={(e) => field.onChange(e.target.value)}
                          className="appearance-none"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">End Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          value={field.value ? field.value.substring(0, 16) : ''} 
                          onChange={(e) => field.onChange(e.target.value)}
                          className="appearance-none"
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="alarm"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-input p-4 bg-muted/50">
                      <div className="space-y-0.5">
                        <FormLabel className="text-foreground">Set Alarm</FormLabel>
                        <FormDescription className="text-muted-foreground text-xs">
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
                 <FormField
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Recurrence</FormLabel>
                      <FormControl>
                        <Input placeholder="Recurrence rule (e.g., RRULE:FREQ=WEEKLY;COUNT=10)" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                 <Button type="submit" variant="default" className="w-full transition-all duration-150 ease-in-out hover:shadow-lg transform hover:scale-105">Update Event</Button>
              </form>
            </Form> 
          </CardContent>
        </Card>
      )}
       <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-primary">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                This action cannot be undone. Are you sure you want to delete this schedule?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteSchedule}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSchedule} className={buttonVariants({ variant: "destructive" })}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </main>
    </>
  );
}
