# Azure Backend Deployment

## Hosting Platform

Azure App Service (Linux)

## Runtime

Node.js 22 LTS

## Resource

App Service

statsthegame-api-dev

## Environment

Development

## Environment Variables

| Variable | Description |
|-----------|-------------|
| NODE_ENV | production |
| API_VERSION | v1 |
| CORS_ALLOWED_ORIGINS | Frontend Azure URL |
| LOG_LEVEL | info |

Database credentials are configured through Azure App Service and are never committed.

## Logging

Application logging uses the Azure File System logger.

## Deployment

Deployments are performed automatically through Gitea Actions.

## Rollback

Azure supports redeploying any previous successful deployment by rerunning the workflow.