<div align="center">

# PLYGRND.

**An independent creative studio, service, and platform built around crafting experiences, shaping identities, and creating meaningful collaborations.**

[VIEW SITE](https://www.plygrnnnd.com/)

</div>

---

## About

PLYGRND is the digital home of an independent creative studio based in Stockholm.

What began as a personal archive and an outlet for creative work has evolved into a space for shared ideas, cultural experiences, brand building, and collaboration across local and global creative communities.

At its core, PLYGRND is about bringing people together to create, experience, and feel.

## Experience

The website introduces PLYGRND through an immersive, single-page digital experience rather than a conventional studio portfolio.

- Animated 3D PLYGRND wordmark rendered in WebGL
- Cinematic intro and organic floating motion
- Mouse-responsive movement and a custom desktop cursor
- Scroll-driven camera animation with a live progress HUD
- Responsive behaviour tuned for desktop and mobile
- Sound experience powered by an embedded Spotify playlist
- Newsletter subscription with email validation and feedback states
- Traffic insights through Vercel Analytics

## Tech stack

| Area | Technology |
| --- | --- |
| Language | TypeScript |
| UI | React 19, React DOM |
| Build tooling | Vite 6, SWC |
| 3D and WebGL | Three.js, React Three Fiber, Drei |
| Routing | React Router |
| Server state | TanStack Query |
| Forms and validation | React Hook Form, Zod |
| Styling | CSS Modules, global CSS, custom properties |
| UI feedback | Sonner, Lucide React |
| Audio | Spotify Embed IFrame API |
| Newsletter | MailerLite (Server API, Single Opt-In) |
| Analytics | Vercel Analytics |
| Optional server layer | Hono, Kysely, PostgreSQL via postgres.js |

## Getting started

### Requirements

- Node.js 22 or later
- npm

### Installation

```bash
git clone https://github.com/adrianspata/plygrnd.git
cd plygrnd
npm install
```

Create a `.env.local` file in the project root and configure your MailerLite credentials:

```env
MAILERLITE_API_TOKEN=your_mailerlite_api_token_here
MAILERLITE_GROUP_ID=your_mailerlite_group_id_here
```

Start the development server:

```bash
npm run dev
```

Vite will print the local development URL in the terminal.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite development server |
| `npm run test` | Runs the automated test suite |
| `npm run build` | Creates an optimized production build in `dist/` |
| `npm run preview` | Serves the production build locally for preview |

## Project structure

```text
.
├── endpoints/              # Newsletter endpoint and validation schema
├── public/assets/          # Static brand assets and favicons
├── src/
│   ├── components/         # 3D scene, HUD, forms, audio and UI components
│   ├── lib/                # Shared utilities
│   └── styles/             # Global styles and CSS Modules
├── App.tsx                 # Application routing and providers
├── index.tsx               # React entry point
├── server.ts               # Optional Hono server and static-file handler
└── vite.config.ts          # Vite and SWC configuration
```

## Newsletter Integration (MailerLite)

The newsletter subscription flow connects to MailerLite via a secure server-side endpoint (`/_api/newsletter/subscribe`).

### Activation Mode: Immediate Activation (Single Opt-In)

The PLYGRND newsletter uses **immediate activation (single opt-in)**:
- Subscribers become active immediately upon submitting the form with explicit consent.
- No confirmation email or double opt-in step is required from the user.
- The subscription timestamp and source are captured directly by the MailerLite subscription event.

### Lifecycle Workflow

```
Newsletter form submitted
  → Server validates input & explicit consent
  → Subscriber created/updated via MailerLite API
  → Subscriber immediately joins PLYGRND Newsletter group
  → MailerLite group automation triggers
  → Welcome email sent by MailerLite
```

> **Important**: Welcome emails are managed entirely by MailerLite's group automation. Application code never sends welcome emails directly, preventing duplicate delivery.

### Safeguards & Privacy

- **No Silent Reactivation**: The integration never sends `resubscribe: true`. Previously unsubscribed, bounced, or junk contacts will not be silently reactivated by the API.
- **Privacy-Safe Responses**: The frontend receives a consistent, non-sensitive confirmation without exposing whether an email was previously registered.
- **No PII Logging**: Server logs exclude email addresses, phone numbers, Instagram handles, and API tokens.
- **Explicit Consent**: The consent checkbox is strictly required and never preselected.

### MailerLite Dashboard Setup

1. **Subscriber Group**: Create a group named `PLYGRND Newsletter` and copy the numeric Group ID.
2. **Custom Fields**:
   - `instagram_handle` (Type: `Text`)
   - `interests` (Type: `Text`)
3. **Welcome Email Automation**: Set up a workflow triggered when a subscriber joins the `PLYGRND Newsletter` group.
4. **API Token**: Generate a token from MailerLite Integrations -> API.

## Production

Create a production build with:

```bash
npm run build
```
