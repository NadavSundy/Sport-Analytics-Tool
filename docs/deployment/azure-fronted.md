# Azure Frontend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS

## Resource

statsthegame-web-dev

## Framework

React
Vite

## Environment Variables

| Variable | Description |
|-----------|-------------|
| VITE_API_BASE_URL | Backend Azure URL |
| VITE_APP_NAME | Stat'sTheGame |
| VITE_APP_ENV | production |

Only public configuration is exposed through VITE_ variables.

## Deployment

The frontend is deployed through Gitea Actions after successful builds.