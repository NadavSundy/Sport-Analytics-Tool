# Migrations

Store ordered SQL migrations here. Use a sortable timestamp prefix, for example:

```text
202608041900_create_competitions.sql
202608051030_create_fixtures.sql
```

Migrations are managed with `node-pg-migrate`. Create a new migration with:

```bash
npm run db:migrate:create --workspace=@sport-analytics/backend -- <name>
```

This produces a UTC-timestamped `.sql` file with `-- Up Migration` and
`-- Down Migration` sections. Both must be completed; the down section is tested
before the migration is merged. Do not commit generated API endpoints or database credentials.
