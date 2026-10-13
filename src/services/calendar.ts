export interface CalendarEvent {
  summary: string;
  startTime: string;
  endTime: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleIdentityServices {
  accounts?: {
    oauth2?: {
      initTokenClient: (options: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback: (error: { message?: string }) => void;
      }) => {
        requestAccessToken: (options?: { prompt?: string }) => void;
      };
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let googleIdentityServicesPromise: Promise<void> | undefined;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (!googleIdentityServicesPromise) {
    googleIdentityServicesPromise = new Promise<void>((resolve, reject) => {
      const scriptId = 'google-identity-services';
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      const onLoad = () => {
        if (window.google?.accounts?.oauth2) {
          resolve();
        } else {
          reject(new Error('Google sign-in could not be initialized.'));
        }
      };
      const onError = () => {
        script?.remove();
        reject(new Error('Could not load Google sign-in. Check your connection and try again.'));
      };

      if (script) {
        script.addEventListener('load', onLoad, { once: true });
        script.addEventListener('error', onError, { once: true });
        return;
      }

      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      googleIdentityServicesPromise = undefined;
      throw error;
    });
  }

  return googleIdentityServicesPromise;
}

export async function requestCalendarAccessToken(clientId: string): Promise<string> {
  if (!clientId.trim()) {
    throw new Error('Google Calendar is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and restart the app.');
  }

  await loadGoogleIdentityServices();
  const tokenClient = window.google?.accounts?.oauth2?.initTokenClient;
  if (!tokenClient) {
    throw new Error('Google sign-in is unavailable. Reload the page and try again.');
  }

  return new Promise((resolve, reject) => {
    const client = tokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error_description || response.error || 'Google Calendar permission was not granted.'));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: (error) => {
        reject(new Error(error.message || 'Google sign-in was cancelled or failed.'));
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}

function getGoogleErrorMessage(payload: unknown): string | undefined {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'message' in payload.error &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }
  return undefined;
}

export async function createCalendarEvent(
  event: CalendarEvent,
  accessToken: string
): Promise<void> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.summary,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime },
    }),
  });

  if (!response.ok) {
    const payload: unknown = await response.json();
    const detail = getGoogleErrorMessage(payload);
    if (response.status === 401) {
      throw new Error('Google Calendar access expired. Reconnect your calendar and try again.');
    }
    throw new Error(detail || `Google Calendar could not add "${event.summary}" (HTTP ${response.status}).`);
  }
}
