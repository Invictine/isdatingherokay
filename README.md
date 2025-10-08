# Is Dating Her Okay?

A lightweight web experience that helps partners visualize the classic
"divide-your-age-by-two-plus-seven" guideline. Sign in with Google on the landing
page, add your details, and record partner timelines to see whether the
relationship fit the rule across specific date ranges.

## Features

- Google Identity Services sign-in landing page.
- Profile setup with birthdates stored on the server.
- Partner timeline management with start/end dates and optional notes.
- Dynamic scatter plot that adjusts its axes to the current dataset and overlays
  the divide-by-two-plus-seven guideline.
- Timeline table that highlights whether each relationship period was compliant
  and predicts the date when it becomes acceptable.
- Simple JSON-backed persistence (`data/db.json`) for sharing data across users.

## Getting started

1. Supply your own Google client ID in `public/index.html` (replace
   `YOUR_GOOGLE_CLIENT_ID`).
2. Install Node.js (18 or newer recommended).
3. Start the server:

   ```bash
   npm start
   ```

4. Visit `http://localhost:3000` in your browser.

## API overview

- `GET /api/me` &ndash; returns the signed-in user's profile. Requires
  `Authorization: Bearer <google_id_token>` header.
- `POST /api/me` &ndash; updates the profile (name, birthdate).
- `GET /api/partners` &ndash; returns the current user's partner timelines.
- `POST /api/partners` &ndash; creates a new partner timeline entry.
- `GET /api/relationships` &ndash; aggregated view of all timelines for the chart.

All data is persisted in `data/db.json`. In production you should replace this
with a real database and verify Google credentials server-side.
