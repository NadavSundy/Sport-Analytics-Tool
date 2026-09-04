# Issue #369 — delayed backend responses after idle periods

## Purpose

Issue #369 investigated the observed delay affecting database-backed API requests after the backend had been idle. The goal was to determine whether the delay represented application processing time, backend hosting cold-start behaviour, or database connection establishment, so that Intermediate performance measurements can distinguish cold-start effects from steady-state API performance.

## Controlled reproduction

The hosted development backend was measured using `/api/v1/health` and the database-backed `/api/v1/competitions` endpoint.

A representative warm hosted run produced:

| Request                        |   Total |
| ------------------------------ | ------: |
| Health                         | 0.709 s |
| First database-backed request  | 1.546 s |
| Second health request          | 0.260 s |
| Second database-backed request | 0.427 s |

The backend database latency diagnostic was then executed three times using a fresh PostgreSQL connection for each run.

| Run | Connect | Query median |
| --- | ------: | -----------: |
| 1   | 1642 ms |       232 ms |
| 2   | 1305 ms |       200 ms |
| 3   | 1285 ms |       199 ms |

This showed that establishing a new remote PostgreSQL connection costs approximately 1.3–1.6 seconds, while an established connection serves the measured queries in approximately 0.2 seconds.

## Local idle reproduction before the fix

The backend process was kept alive while its PostgreSQL pool was allowed to become idle.

Representative measurements were:

| Request           |   Total |
| ----------------- | ------: |
| Local health      | 0.039 s |
| First DB request  | 1.503 s |
| Second DB request | 0.215 s |

A later idle cycle reproduced the same pattern:

| Request                     |   Total |
| --------------------------- | ------: |
| Local health                | 0.003 s |
| First DB request after idle | 1.485 s |
| Next DB request             | 0.190 s |

The health endpoint remained responsive while only the first database-backed request incurred the delay. This ruled out application-process wake-up as the primary cause of the reproduced local delay.

## Cause

The PostgreSQL pool was configured with a 30-second idle timeout and no retained minimum connection.

Once all idle clients were evicted, the next database-backed request had to establish a new remote PostgreSQL/TLS connection. The measured connection cost closely matched the observed first-request penalty.

## Fix

The backend PostgreSQL pool now retains one idle client while the backend process is alive:

```ts
max: options.max ?? 10,
min: 1,
connectionTimeoutMillis: 10_000,
idleTimeoutMillis: 30_000,
```

Additional clients may still be reclaimed after the idle timeout, so this does not retain the full maximum pool during low traffic.

A focused regression test verifies the minimum, maximum and idle-timeout pool configuration.

## Verification after the fix

After restarting the backend with the updated pool configuration:

| Request                                |   Total |
| -------------------------------------- | ------: |
| First DB request after process startup | 2.863 s |
| Warm DB request                        | 0.183 s |
| Health after idle period               | 0.003 s |
| First DB request after idle period     | 0.201 s |
| Next DB request                        | 0.191 s |

The first database request after backend process startup still pays initial connection cost, as expected.

However, once the application has established its database connection, an ordinary idle period no longer produces the previous approximately 1.5-second reconnection penalty. The measured post-idle request decreased from approximately 1.485 seconds to 0.201 seconds.

A further three-cycle idle check confirmed the distinction between process-start connection establishment and ordinary idle behaviour. The first cycle's initial database request took 1.367 seconds because no PostgreSQL client had yet been established, while the immediately following request took 0.183 seconds. After two subsequent 45-second idle periods, the first database-backed requests remained at 0.184 and 0.183 seconds respectively. This confirms that once established, the retained pool client survives ordinary idle periods and prevents the previous reconnection penalty.

## Performance measurement rule

Steady-state API performance measurements must not include application/database startup warm-up as ordinary endpoint latency.

Before recording season-scale response-time measurements:

1. Confirm the backend health endpoint responds successfully.
2. Issue at least one successful database-backed request such as `/api/v1/competitions?limit=1`.
3. Discard that warm-up measurement.
4. Begin the measured sample only after the warm-up request succeeds.
5. Repeat the warm-up after any backend process restart or deployment.

Cold-start behaviour may be measured separately when required, but it must not be mixed with steady-state response-time targets.

## Acceptance criteria

- Delay reproduced in a controlled local test: **yes**
- Cause identified: **yes — idle PostgreSQL pool eviction followed by remote connection establishment**
- Fix or deployment limitation documented: **yes — retain one pool connection; process-start cold connection remains documented**
- Performance procedure excludes invalid cold measurements: **yes**
- Regression coverage added where practical: **yes — database pool configuration test**

## AI Declaration

The investigation plan, diagnosis, implementation guidance, test design, performance procedure and evidence document were produced with the assistance of ChatGPT-Web[GPT-5.6 Sol].
