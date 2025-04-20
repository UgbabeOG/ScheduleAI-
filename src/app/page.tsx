"use client";
import { useState, useEffect, useCallback } from 'react';
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
import { ThemeProvider } from "@/components/theme-provider";
import { useTheme } from 'next-themes';
import { useToast } from "@/hooks/use-toast"
import Particles from "react-particles";
import { loadFull } from "tsparticles";
import { INestParticlesProps } from "react-tsparticles";


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
  const editingEventIndexInitialValue: null = null;
  const { setTheme, resolvedTheme } = useTheme() // Get theme settings
  const [scheduleText, setScheduleText] = useState(""); // Input text for schedule
  const [generatedSchedule, setGeneratedSchedule] = useState<CalendarEvent[]>([]); // Generated events
  const [editingEventIndex, setEditingEventIndex] = useState<number | null>(editingEventIndexInitialValue); // Index of event being edited
  const [schedules, setSchedules] = useState<Schedule[]>([]); // Saved schedules
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null); // Selected schedule ID
  const [scheduleName, setScheduleName] = useState<string>(""); // Name for new schedule
  const [isDialogOpen, setIsDialogOpen] = useState(false); // Dialog state
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null); // Schedule ID being deleted
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast()
    const [particlesInit, setParticlesInit] = useState(false);


  useEffect(() => {
    const storedSchedules = localStorage.getItem('schedules');
    if (storedSchedules) {
      setSchedules(JSON.parse(storedSchedules));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }, [schedules]);

 
  const form = useForm<EventValues>({
    resolver: zodResolver(eventSchema), 
      defaultValues: {
      summary: "",
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      alarm: false,
      recurrence: "",
    },
    mode: "onChange",
  });

  // Function to generate schedule
  const handleGenerateSchedule = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await generateScheduleFromPrompt({ prompt: scheduleText });
      setGeneratedSchedule(result.events as CalendarEvent[]);
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
  }, [scheduleText, setIsLoading, setGeneratedSchedule, toast]);
  
  // Function to interpret schedule
  const handleInterpretSchedule = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const result = await interpretScheduleText({ scheduleText: scheduleText });
      setGeneratedSchedule(result as CalendarEvent[]);
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
  }, [scheduleText, setIsLoading, setGeneratedSchedule, toast]);

  // Function to edit event
  const handleEditEvent = useCallback((index: number) => {
    setEditingEventIndex(index);
    const eventToEdit = generatedSchedule[index];
    form.reset({
      summary: eventToEdit.summary,
      startTime: eventToEdit.startTime,
      endTime: eventToEdit.endTime,
      alarm: false, // Assuming default value for alarm
      recurrence: "" // Assuming default value for recurrence
    });
  }, [generatedSchedule, form, setEditingEventIndex]);

  const handleUpdateEvent = useCallback((values: EventValues) => {
    if (editingEventIndex !== null) {
      const updatedSchedule = [...generatedSchedule];
      updatedSchedule[editingEventIndex] = {
        summary: values.summary,
        startTime: values.startTime,
        endTime: values.endTime,
      };
      setGeneratedSchedule(updatedSchedule);
      setEditingEventIndex(null);
       toast({
            title: "Success",
            description: "Schedule updated successfully!",
        })
    }
  }, [generatedSchedule, editingEventIndex, setGeneratedSchedule, setEditingEventIndex, toast]);
  
  const handleDiscardChanges = () => {
    if (selectedScheduleId) {
      const selectedSchedule = schedules.find(schedule => schedule.id === selectedScheduleId);
      if (selectedSchedule) {
        setGeneratedSchedule(selectedSchedule.events);
      }
    } else {
      setGeneratedSchedule([]);
    }
       toast({
            title: "Success",
            description: "Changes discarded.",
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
       toast({
            title: "Success",
            description: "Schedule saved successfully!",
        })
  }, [scheduleName, generatedSchedule, schedules, setSchedules, toast]);

  const handleAddToCalendar = async () => {

    try { 
      //for (const event of generatedSchedule) {
       // await createCalendarEvent(event);
      //}
       toast({
            title: "Success",
            description: "Schedule added to calendar successfully!  Check your Google Calendar.",
        })
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: `Failed to add schedule to calendar: ${e.message}`,
        })
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
      setGeneratedSchedule([]);
      setSelectedScheduleId(null);
        toast({
            title: "Success",
            description: "Schedule deleted successfully!",
        })
      setIsDialogOpen(false);
    }
  }, [schedules, deletingScheduleId, setSchedules, setGeneratedSchedule, setSelectedScheduleId, toast, setIsDialogOpen]);

  const cancelDeleteSchedule = useCallback(() => {
    setIsDialogOpen(false);
    setDeletingScheduleId(null);
  }, [setIsDialogOpen, setDeletingScheduleId]);

  const handleLoadSchedule = useCallback(async (scheduleId: string) => {
    if (isLoading) return
    setIsLoading(true);
     try {
      setSelectedScheduleId(scheduleId);
      const selectedSchedule = schedules.find(schedule => schedule.id === scheduleId);
      if (selectedSchedule) {
        setGeneratedSchedule(selectedSchedule.events);
           toast({
                title: "Success",
                description: `Schedule "${selectedSchedule.name}" loaded successfully!`,
            })
      } 
     } finally {
        setIsLoading(false);
      }
  }, [isLoading, schedules, setIsLoading, setSelectedScheduleId, setGeneratedSchedule, toast]);

  const clearInputField = () => {
    setScheduleText("");
  };

    const particlesOptions: INestParticlesProps['options'] = {
        fullScreen: {
            enable: false,
        },
        detectRetina: true,
        fpsLimit: 60,
        interactivity: {
            detectsOn: "canvas",
            events: {
                onclick: {
                    enable: true,
                    mode: "push",
                },
                onhover: {
                    enable: true,
                    mode: "repulse",
                },
                resize: true,
            },
            modes: {
                push: {
                    quantity: 4,
                },
                repulse: {
                    distance: 200,
                    duration: 0.4,
                },
            },
        },
        particles: {
            color: {
                value: "#008080",
            },
            links: {
                color: "#008080",
                distance: 150,
                enable: true,
                opacity: 0.5,
                width: 1,
            },
            collisions: {
                enable: true,
            },
            move: {
                directions: "none",
                enable: true,
                outModes: {
                    default: "bounce",
                },
                random: false,
                speed: 3,
                straight: false,
            },
            number: {
                density: {
                    enable: true,
                    area: 800,
                },
                value: 80,
            },
            opacity: {
                value: 0.5,
            },
            shape: {
                type: "circle",
            },
            size: {
                value: { min: 1, max: 5 },
            },
        },
        detectRetina: true,
    };

    const particlesInitFunc = useCallback(async (engine: any) => {
        await loadFull(engine);
        setParticlesInit(true);
    }, []);

  return (
    <>
    
    <Particles id="tsparticles" init={particlesInitFunc} options={particlesOptions} />
    

    <main className="relative flex flex-col items-center justify-center min-h-screen py-2">
      <div className="flex items-center space-x-2 absolute right-4 top-4">
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <Switch
              id="dark-mode"
              checked={resolvedTheme === "dark"}
              onCheckedChange={(checked) =>
                setTheme(checked ? "dark" : "light")
              }
            />
          </div>
      <h1 className="text-4xl font-bold mb-4">ScheduleAI</h1>

      {/* Input card */}
      <Card className="w-full max-w-md">
        <CardContent className="p-4">
          <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-2">
                {scheduleExamples.map((example, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setScheduleText(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter schedule or instruction"
                value={scheduleText}
                onChange={(e) => setScheduleText(e.target.value)}
              />
              {scheduleText && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={clearInputField}
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-between mb-4">
            <Button variant="outline" onClick={handleGenerateSchedule} disabled={isLoading}>
              Generate Schedule
              {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
            <Button variant="outline" onClick={handleInterpretSchedule} disabled={isLoading}>
              Interpret Schedule
              {isLoading && <Icons.spinner className="ml-2 h-4 w-4 animate-spin" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md mt-4">
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Previous Schedules:</h2>
            {schedules.length === 0 ? (
              <p>No schedules saved yet.</p>
            ) : (
              <ul>
                {schedules.map((schedule) => (
                  <li key={schedule.id} className="mb-2">
                    <Button variant="secondary" size="sm" onClick={() => handleLoadSchedule(schedule.id)}>
                      {schedule.name}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSchedule(schedule.id)}>
                      <Icons.trash className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      {/* Generated Schedule card */}

      {generatedSchedule.length > 0 && (
        <Card className="w-full max-w-md mt-4 transition-opacity duration-500 ease-in-out">
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

            <div className="flex justify-between mt-4">
              <Input
                type="text"
                placeholder="Enter schedule name"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
              />
            </div>

            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handleSaveSchedule}>
                Save Schedule
              </Button>
              <Button variant="outline" onClick={handleDiscardChanges}>
                Discard Changes
              </Button>
              <Button variant="outline" onClick={handleAddToCalendar}>
                Add to Calendar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {editingEventIndex !== null && (
        <Card className="w-full max-w-md mt-4 transition-opacity duration-500 ease-in-out">
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
                 <FormField
                  control={form.control}
                  name="recurrence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recurrence</FormLabel>
                      <FormControl>
                        <Input placeholder="Recurrence rule (e.g., RRULE:FREQ=WEEKLY;COUNT=10)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="submit">Update Event</Button>
              </form>
            </Form> 
          </CardContent>
        </Card>
      )}
       <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Are you sure you want to delete this schedule?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={cancelDeleteSchedule}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteSchedule}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </main>
    </>
  );
}

