# Issue #105 endpoint response times

| Document Information | Details                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Issue                | #105 Database round-trip latency constrains API response times                                                                            |
| Measured by          | Ben Swartz                                                                                                                                |
| Date                 | 2026-08-20                                                                                                                                |
| Environment          | Backend running locally in Johannesburg against the shared hosted database in eu-west-2, holding 14,011 fixtures and 3,207,109 deliveries |

## 1. Purpose

This issue recorded a round-trip latency of 173 to 185 ms and argued from it that
an endpoint issuing several sequential queries would be slow. That was
arithmetic. With the full corpus imported, the endpoints can be measured
directly.

## 2. Method

Each endpoint was requested three times with curl, reporting `time_total`. The
backend was freshly started, and the proxy was bypassed for loopback requests.

Measurements were taken against a local backend, so they exclude the network hop
between a browser and a deployed API but include the full 173 ms floor between
the backend and the database, which is the cost this issue concerns.

## 3. Results

| Endpoint                                           | First request | Subsequent         |
| -------------------------------------------------- | ------------- | ------------------ |
| `GET /api/v1/health`                               | 8 ms          | 8 ms               |
| `GET /api/v1/fixtures?limit=50`                    | 1,366 ms      | 189 ms, 192 ms     |
| `GET /api/v1/fixtures/8937/statistics`             | 2,428 ms      | 2,339 ms, 2,389 ms |
| `GET /api/v1/participants/14261/fixtures?limit=50` | 3,735 ms      | 2,386 ms, 2,469 ms |

## 4. Interpretation

`/health` performs no database work and costs 8 ms, so the framework and the
local hop are negligible. Everything above that figure is database round trips.

`/fixtures` costs approximately 190 ms, which is one round trip against a floor
of 173 ms. It issues a single query for a page of fifty fixtures and is the shape
this issue asks for.

`/fixtures/{id}/statistics` costs approximately 2,360 ms and does not improve on
repeated requests, so the cost is not connection setup. At 173 ms per round trip
that is on the order of thirteen sequential queries for one response.

`/participants/{id}/fixtures` costs approximately 2,430 ms for a page of fifty,
and its first request cost 3,735 ms.

Neither figure is defensible as a page load. The intermediate tier requires the
platform to state and meet a response time under load, and two and a half seconds
for a single read would not meet any reasonable statement of one.

## 5. A separate defect found while measuring

Before the backend was restarted, every endpoint returned in exactly 2.03
seconds, including `/health`, which performs no database work. `time_connect` was
zero and `time_starttransfer` was 2.03 seconds, so the socket opened immediately
and the response was withheld.

Restarting the backend removed the delay entirely and `/health` returned in 8 ms.

The process had been running for some hours. The most likely explanation is that
its database connection had lapsed and each request paid a fixed reconnection
cost, though this has not been confirmed. It is recorded because a deployed
backend that has been idle would exhibit the same behaviour silently, and because
any measurement taken from a long-running process is unreliable.

## 6. Recommendations

The endpoints issuing many sequential queries should be examined. The contrast
between `/fixtures` at one round trip and the statistics endpoints at thirteen
suggests the latter query per entity where they could query per page, which is
the pattern this issue warned against.

A stated response target should follow from what is achievable rather than what
is currently observed. A single-query read costs approximately 190 ms from this
location, so a target in the region of 500 ms for a page view is reachable if the
number of sequential queries is reduced. It is not reachable at thirteen.

The team should decide whether the latency justifies revisiting the database
region. The move to eu-west-2 under ADR-005 did not reduce it, and no free option
currently offers a South African region.

## AI Declaration

The preceding document was generated with the assistance of Claude-Web[Claude Opus 5].
