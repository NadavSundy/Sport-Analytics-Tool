# Azure Frontend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS is used by the deployment/build environment. The deployed frontend itself is the static browser bundle produced by Vite.

## Resource

`statsthegame-web-dev`

## Framework

- React
- Vite

## Environment Variables

| Variable                        | Current status | Description                                                                        |
| ------------------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`             | Used           | Backend Azure `/api/v1` base URL.                                                  |
| `VITE_SUPABASE_URL`             | Used           | Public Supabase Auth project URL.                                                  |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Used           | Public Supabase publishable key.                                                   |
| `VITE_APP_NAME`                 | Reserved       | Present in the example environment file but not currently read by frontend source. |
| `VITE_APP_ENV`                  | Reserved       | Present in the example environment file but not currently read by frontend source. |

Only public-safe configuration may be exposed through `VITE_` variables.

## Deployment

The repository contains a Gitea Actions workflow intended to build and deploy the frontend to Azure App Service after successful verification.

## AI Declaration

The preceding document was reviewed and expanded with the assistance of ChatGPT-Web[GPT-5.6 Sol].
