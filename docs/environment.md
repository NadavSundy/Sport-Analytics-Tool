# Environment Variables

## Frontend

| Variable                      | Required | Secret |
| ----------------------------- | -------- | ------ |
| VITE_API_BASE_URL             | Yes      | No     |
| VITE_APP_NAME                 | No       | No     |
| VITE_APP_ENV                  | No       | No     |
| VITE_SUPABASE_URL             | Yes      | No     |
| VITE_SUPABASE_PUBLISHABLE_KEY | Yes      | No     |

The Supabase values configure managed browser authentication. Only the public project URL and
publishable key may use the `VITE_` prefix; secret and `service_role` keys must never be exposed to
the frontend.

## Backend

| Variable             | Required | Secret |
| -------------------- | -------- | ------ |
| NODE_ENV             | Yes      | No     |
| API_VERSION          | Yes      | No     |
| PORT                 | Azure    | No     |
| DATABASE_URL         | Yes      | Yes    |
| CORS_ALLOWED_ORIGINS | Yes      | No     |
| AUTH_CLIENT_SECRET   | Yes      | Yes    |

## AI Declaration

The frontend authentication environment documentation was updated with the assistance of
Codex[GPT-5.6 Sol].
