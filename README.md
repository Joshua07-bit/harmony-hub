# Home Harmony Hub

Home Harmony Hub is a modern boarding-house marketplace application that helps tenants discover available rooms and helps landlords manage listings and bookings. The app includes authentication, profile management, browsing, booking flows, and messaging between users.

## What the system does

- Lets tenants browse boarding-house listings
- Lets landlords create and manage listings
- Supports booking requests and booking status tracking
- Allows users to message each other around bookings
- Uses Supabase for authentication and data persistence
- Built as a React + TanStack Start application with a polished UI

## Tech stack

- React + TypeScript
- TanStack Start
- TanStack Router
- Tailwind CSS
- Supabase
- Vite

## Local development

Requirements:
- Node.js
- npm

Run locally:

```bash
git clone https://github.com/Joshua07-bit/harmony-hub.git
cd harmony-hub
npm install
npm run dev
```

Then open the local development URL shown in the terminal.

## Environment setup

The project expects Supabase environment variables to be configured. Make sure the following values are available in your environment before running the app:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

If you are using the Lovable/Supabase setup, these values should be provided through your project environment.

## Login credentials

There are no hardcoded demo credentials in this repository.

To sign in, you can:
- create a new account from the auth page, or
- sign in with Google, or
- use an existing Supabase-authenticated account that has been added to your project.

The sign-in page is available at:

```text
/auth
```

If you are using a local or staging environment, create an account through the sign-up form first, then sign in with the same email and password.

## Project structure

- src/routes: application pages and routes
- src/components: reusable UI components
- src/integrations/supabase: Supabase client and auth integration
- supabase/migrations: database schema and policy migrations
