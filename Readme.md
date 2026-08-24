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
| Newsletter | Web3Forms |
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

Create a `.env.local` file in the project root and add your own Web3Forms access key:

```env
VITE_WEB3FORMS_ACCESS_KEY=your_web3forms_access_key
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

## Newsletter architecture

The current client-side subscription flow sends validated form data directly to Web3Forms. The repository also contains a server-side Hono endpoint backed by Kysely and PostgreSQL, but that endpoint is not part of the default Vite development or build flow.

## Production

Create a production build with:

```bash
npm run build
```

The generated static files are written to `dist/` and can be deployed to a static hosting service.
