# ScheduleAI

ScheduleAI turns natural-language requests into editable schedules and work plans. Review generated events, then optionally add them to your primary Google Calendar.

## Requirements

- Node.js 20 or newer
- A Google AI API key for Gemini schedule generation
- A Google Cloud OAuth 2.0 web client ID for Calendar access

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```dotenv
   GOOGLE_GENAI_API_KEY=your_google_ai_api_key
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
   ```

   Get the Gemini key from [Google AI Studio](https://aistudio.google.com/apikey).

3. In [Google Cloud Console](https://console.cloud.google.com/):
   - Select or create a project and enable the **Google Calendar API**.
   - Configure the OAuth consent screen and add your Google account as a test user while the app is in testing.
   - Create an OAuth client ID with application type **Web application**.
   - Add the app origin to **Authorized JavaScript origins** (for local development, `http://localhost:9002`; add your deployed HTTPS origin when deploying).
   - Put the web client ID in `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

4. Start the app:

   ```bash
   npm run dev
   ```

   Open [http://localhost:9002](http://localhost:9002).

## Using Calendar integration

Describe a plan and select **Generate Schedule**, or paste existing schedule text and select **Interpret Text**. Review and edit the resulting events before adding them to Google Calendar. Select **Connect Google Calendar** and sign in to Google when prompted; the app requests only the `calendar.events` permission needed to create events. Then select **Add to Calendar**.

The Google access token stays in browser memory for the current session and is not stored by the app. Reconnect after refreshing the page or when Google access expires. Schedule generation uses `GOOGLE_GENAI_API_KEY` on the server; never expose that key in a `NEXT_PUBLIC_` variable.
