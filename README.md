# Vercel Deployment Guide

This project is configured for seamless deployment to Vercel via GitHub.

## 1. Local Development

Run the app locally with:
```bash
npm run dev
```
This starts the Express server (API) and Vite (Frontend) on `http://localhost:3000`.

## 2. GitHub & Vercel Setup

1.  **Push to GitHub**: Push your code to a GitHub repository.
2.  **Connect to Vercel**:
    -   Go to [Vercel Dashboard](https://vercel.com/new).
    -   Import your GitHub repository.
    -   Vercel will automatically detect the Vite project.
3.  **Environment Variables**:
    -   Set the following environment variables in the Vercel dashboard:
        -   `GEMINI_API_KEY`: Your Gemini API key.
        -   `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key.
        -   `APP_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`).

## 3. Environment Variables (Vercel Settings)

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

| Key | Value | Description |
|-----|-------|-------------|
| `GEMINI_API_KEY` | `your_key` | Your Google Gemini API Key |
| `VITE_GEMINI_API_KEY` | `your_key` | Your Google Gemini API Key (Vite prefix) |
| `VITE_CLERK_PUBLISHABLE_KEY` | `pk_...` | Your Clerk Publishable Key (starts with `pk_`) |
| `APP_URL` | `https://intelliserve3.vercel.app` | Your Vercel deployment URL |

> **Note**: `VITE_CLERK_PUBLISHABLE_KEY` is not a secret and is safe to include in your frontend build.

## 4. Logo & Branding

The application uses the **IntelliServe** logo throughout the platform:
- **Login Page**: Replaced default icons with the official logo.
- **Sidebar**: High-visibility branding for employees.
- **Welcome Page**: Consistent branding for new users.

Logo URL: `https://cdn-icons-png.flaticon.com/128/3845/3845696.png`

## 5. Project Structure

-   `api/index.ts`: The entry point for Vercel's serverless functions (handles `/api/*`).
-   `src/api.ts`: Shared API logic for both local and Vercel environments.
-   `server.ts`: Local development server that combines the API and Vite.
-   `vercel.json`: Vercel configuration for routing and builds.

## 4. Deployment Details

-   **Frontend**: Built with Vite and served as static files.
-   **Backend**: Served as Vercel Serverless Functions.
-   **Routing**: `/api/*` is routed to the serverless function, while other requests serve the frontend.
