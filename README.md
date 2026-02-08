
# PitchSide - Pickup Soccer Platform

A "Premier League" style pickup soccer booking platform for the Northwest Chicago Suburbs.

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v4 (Neon Green/Pink Aesthetic)
- **Icons**: Lucide React
- **Language**: TypeScript

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure
- `src/app/page.tsx`: Landing Page (Implemented)
- `src/components/ui/`: Reusable UI components
- `src/lib/utils.ts`: Utility functions (cn, clsx, tailwind-merge)
- `src/app/globals.css`: Global styles and Tailwind Theme Configuration

## Next Steps
- Implement Authentication (Supabase)
- Build the Game Details Page
- Set up Stripe Payments
