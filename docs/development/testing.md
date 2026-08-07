npm ci

npm run db:test:reset --workspace=@sport-analytics/backend
npm run db:test:seed --workspace=@sport-analytics/backend

npm run test:unit
npm run test:frontend
npm run test:api
npm run test:contracts
npm run test:database
npm run test:e2e
npm run test:coverage
npm run check