# Email Verification Pipeline — Architecture Documentation

This document describes the end-to-end flow of how emails are verified in the backend, the workers involved, how priority is managed for fairness, and how a different verification API provider can be plugged in.

The explanations are deliberately written in plain language. No code is referenced — only concepts, names of components, and the messages that flow between them.

---

## 1. The Big Picture

The system is built around three independent concerns:

1. Accepting requests from users (HTTP API).
2. Doing the slow work of actually verifying emails against an external provider (background workers + queues).
3. Telling the user in near real time how the work is going (WebSocket + REST polling).

Everything between request and result flows through Redis-backed BullMQ queues. The HTTP layer never blocks waiting for the provider for bulk jobs. Single verifications are answered synchronously because they take only a couple of seconds.

There are two completely separate stories: **single email verification** (one address at a time) and **bulk verification** (a CSV with thousands of addresses). They share the provider call but use very different machinery around it.

---

## 2. Components at a Glance

### Queues

There are four background queues. Each queue is consumed by its own worker.

| Queue       | What it carries                              |
|-------------|----------------------------------------------|
| verify.high | Single-email verifications                   |
| verify.bulk | Bulk-list verifications (per email or batched) |
| csv.parse   | A request to read an uploaded CSV file       |
| db.write    | A finished verification result that needs to land in the database |

### Workers

| Worker                       | Reads from   | Default parallel workers | Tuned by env variable        |
|------------------------------|--------------|--------------------------|------------------------------|
| Verification High Processor  | verify.high  | 4                        | VERIFY_HIGH_CONCURRENCY      |
| Verification Bulk Processor  | verify.bulk  | 8                        | VERIFY_BULK_CONCURRENCY      |
| CSV Parse Processor          | csv.parse    | 2                        | CSV_PARSE_CONCURRENCY        |
| DB Write Processor           | db.write     | 16                       | DB_WRITE_CONCURRENCY         |

Total moving workers in the default configuration: **30**. They are all independent processes inside the same Node application — concurrency just means how many jobs each worker handles in parallel.

### Supporting services

- **Key Pool** — a small in-process registry that owns one or more provider API keys and rents them out one slot at a time.
- **Redis Rate Limiter** — a token-bucket implementation in Redis. The Key Pool asks it whether a key has capacity right now.
- **Starvation Guard** — a background watcher that promotes any list whose jobs have been waiting too long.
- **Progress Throttler / Progress Notifier** — collapses many tiny updates into one event per second per list and pushes it to clients.
- **Verification Gateway** — the WebSocket endpoint clients listen on.
- **DLQ Service** — the Dead-Letter Queue. Any job that exhausts its retries lands here for inspection.

---

## 3. Single Email Verification — Step by Step

When a user clicks "Verify Now" with one email address in the input, the request never touches a queue. It is handled inline.

```
Browser
  │  POST /verify/single  {email}
  ▼
Single Verify Controller        (auth + rate limit per user)
  │
  ▼
Single Verify Service
  │
  │  ── calls ──▶ Mail Tester Service ──▶ External Provider
  │                                            (HTTPS)
  │  ◀── result ──
  ▼
Saves the result into the "emails" table
  │
  ▼
Returns the verdict to the browser as JSON
```

Why it is synchronous: a single API call takes about one to three seconds, well within an HTTP request budget. There is nothing to gain by enqueueing it. The user gets the answer in the same response.

There is still a per-user rate-limit guard sitting in front of the controller (50 verifications per minute combined with bulk uploads). When that bucket is empty, the response is a 429.

---

## 4. Bulk Verification — Step by Step

This is the interesting one. It has four hops: parse the file, fan out per-email work, call the provider, and write the results back.

```
                         ┌─────────────────────────────────────────────┐
   Browser (CSV upload)  │                                             │
        │                ▼                                             │
        │     ┌──────────────────────┐                                 │
        └────▶│ Bulk Verify          │                                 │
              │ Controller (HTTP)    │                                 │
              └──────────┬───────────┘                                 │
                         │ create EmailList row (status = PENDING)     │
                         │ save file to disk                           │
                         │ push job onto "csv.parse" queue             │
                         ▼                                             │
                ┌────────────────────┐                                 │
                │ csv.parse queue    │                                 │
                └────────┬───────────┘                                 │
                         │                                             │
                         ▼                                             │
                ┌────────────────────┐                                 │
                │ CSV Parse          │   read file, dedupe,            │
                │ Processor          │   insert email rows into DB,    │
                │   (2 workers)      │   collect IDs,                  │
                └────────┬───────────┘   compute one stride for the    │
                         │               full list size                │
                         │                                             │
                         │ push one job per email (or per batch        │
                         │ of 50) onto the "verify.bulk" queue,        │
                         │ each with a priority number computed        │
                         │ from the stride                             │
                         ▼                                             │
                ┌────────────────────┐                                 │
                │ verify.bulk queue  │◀────────────────────────────────┘
                │                    │   Starvation Guard scans this
                │                    │   queue every 5 s and re-prioritises
                │                    │   any list that has been waiting
                │                    │   longer than 15 s
                └────────┬───────────┘
                         │
                         ▼
                ┌──────────────────────┐
                │ Verification Bulk    │   ask Key Pool for an API key
                │ Processor            │   that has free quota,
                │   (8 workers)        │   call the provider,
                └────────┬─────────────┘   collect successes and failures
                         │
                         │ push a single result job
                         │ onto the "db.write" queue
                         ▼
                ┌────────────────────┐
                │ db.write queue     │
                └────────┬───────────┘
                         │
                         ▼
                ┌────────────────────┐
                │ DB Write Processor │   save the email's verdict,
                │   (16 workers)     │   increment the EmailList
                └────────┬───────────┘   counters,
                         │               advance the now-serving cursor,
                         │               schedule a progress update
                         ▼
                ┌────────────────────┐
                │ Progress Throttler │   coalesces many tiny updates
                │   (once per sec)   │   into one event per list
                └────────┬───────────┘
                         │
                         ▼
                ┌────────────────────┐
                │ WebSocket Gateway  │
                └────────┬───────────┘
                         │
                         ▼
                  Browser updates the
                  progress bar in real time
```

Failure handling: jobs that fail (rate-limited, network error, provider 5xx) go back to the queue with exponential backoff. After a configurable number of attempts they are moved to the Dead-Letter Queue so an operator can inspect them. No record is silently dropped.

---

## 5. Worker Roles — Why Each One Exists

- **Verification High Processor (4 workers).** Exists so that "instant" single verifications never wait behind a huge bulk job. It has its own queue, so its work is physically separate.
- **CSV Parse Processor (2 workers).** Reading and de-duplicating a large CSV is mostly I/O bound and only happens at upload time. Two workers are plenty; more would just thrash the disk.
- **Verification Bulk Processor (8 workers).** This is the workhorse that talks to the external provider. The number is tuned so that the combined throughput stays within the provider's per-key limits but still keeps the workers busy. It also handles batched jobs (50 emails at a time) so we make fewer trips to the provider.
- **DB Write Processor (16 workers).** Writes are cheap individually but happen very often. Twice the count of the verification workers means writes can never become the bottleneck — verification finishes producing results, the DB writers absorb them.

---

## 6. How Priority Works When Multiple Bulk Uploads Run Together

The goal is simple to describe and a bit subtle to implement: a small list must not have to wait for a huge list to finish, but a huge list must also not be paused entirely. Everybody makes progress, just at different speeds.

### The size tiers

When a bulk list is enqueued, we look at its total email count and assign it a tier:

| Total emails    | Tier  | Stride |
|-----------------|-------|--------|
| Up to 5,000     | High  | 2      |
| 5,001 – 10,000  | Mid   | 3      |
| More than 10,000| Low   | 6      |

### What "stride" does to priority

Every queued job has a priority number. BullMQ always processes the lowest priority number first. The first job of a list gets a small starting number, and each next job inside that list adds the stride to that number.

A list with stride 2 spreads its jobs across priority numbers like 100, 102, 104, 106, ...  
A list with stride 3 spreads its jobs across 100, 103, 106, 109, ...  
A list with stride 6 spreads its jobs across 100, 106, 112, 118, ...

When workers pull from a mixed queue with all three lists, they always pick the lowest number first. The result is that for every window of priority numbers, the smaller-stride list has more jobs in it.

Mathematically, the throughput ratio between concurrent lists settles at one over the stride. With strides 2 / 3 / 6, that ratio becomes **3 : 2 : 1** for high / mid / low.

### The example you described

- User 1 uploads 11,000 emails → low tier, stride 6
- User 2 uploads 7,000 emails → mid tier, stride 3
- User 3 uploads 4,000 emails → high tier, stride 2

While all three are running, per slice of clock time the workers complete roughly:

- 3 emails for User 3
- 2 emails for User 2
- 1 email for User 1

User 1 is *slowed down* but never *stopped*. As soon as one of the smaller lists finishes, User 1's effective throughput goes back up because the remaining workers stop being shared.

### What stops a slow list from being forgotten

The Starvation Guard scans the queue every five seconds. If it finds a list whose oldest waiting job is more than fifteen seconds old, it lowers (i.e. improves) the priority number of that list's pending jobs. This puts a hard ceiling on how long anyone can wait, no matter how many smaller uploads keep coming in.

### The now-serving counter

Redis holds a single integer called the "now-serving cursor." Every time a job finishes (and writes its result), the cursor increases. When a brand-new list arrives, its first priority number is computed relative to this cursor. That keeps priority numbers from growing forever and gives the Starvation Guard a meaningful anchor for promotions.

---

## 7. Live Progress Back to the Browser

The browser has two ways to learn how a bulk job is going.

1. **WebSocket (preferred).** After upload, the browser opens a connection to the Verification Gateway and subscribes to a room named after the list ID. The Progress Throttler buffers all the increments coming in from the DB Write Processor and emits one rolled-up event per second per list. Status changes (e.g. "completed") are emitted immediately.

2. **REST polling (fallback).** The progress endpoint can be hit at any time and returns the current counters and an ETA. The frontend uses this when the WebSocket is not available.

Either way, the source of truth is the EmailList counters in the database, which are bumped atomically by the DB Write Processor.

---

## 8. The Provider Call (Currently MailTester)

A single component, the Mail Tester Service, owns the actual HTTP call to the external provider. The Verification Workers never talk to the provider directly — they ask the Key Pool for an available API key, hand that key to the Mail Tester Service, and forward the answer.

```
Verification Worker
        │
        │ "Give me a key"
        ▼
   Key Pool ──── checks ────▶ Redis Rate Limiter
        │                              │
        │ ◀──────── "ok, use key K" ───┘
        ▼
   Mail Tester Service ──── HTTPS ────▶ External Provider
        │
        │ ◀──────── verdict ────────────
        ▼
 returns to the worker
```

Key Pool responsibilities:

- Tracks how many requests each key has spent inside the current rate window.
- Puts a key on a short cool-down if the provider answers with 429.
- Rotates between keys so no single key is hammered.

If no key is currently available, the worker is asked to wait briefly and try again. If the wait would exceed roughly thirty seconds the worker releases its claim on the email and the job is re-queued — that way other lists can still be processed while the provider catches its breath.

---

## 9. Plugging in a Different Verification API

The Mail Tester Service is the only thing in the system that knows about the provider's URL, request shape, and response shape. Everything above it speaks in a generic "give me a verdict for this email address" interface.

To swap or add another provider:

### What stays the same

- The four queues.
- All four workers.
- The Key Pool and the Redis Rate Limiter.
- The Starvation Guard, the priority/stride logic, the now-serving cursor.
- The DB Write Processor and everything downstream (progress events, websocket fan-out, completed email storage).

### What changes

A new service (call it for example "Provider B Service") is added that knows how to:

- Take an email address.
- Take an API key for that provider.
- Build the right HTTPS request.
- Translate the response into the same internal verdict format (valid / invalid / risky / unknown plus extra fields like MX, SMTP, disposable, score).
- Translate errors into the same "rate-limit / transient / fatal" categories.

The Key Pool grows a new dimension: instead of just "keys," it now has "keys per provider." A worker that wants to verify an email picks a provider (configurable, e.g. via env or per-list setting), asks the Key Pool for a key for that provider, and routes the call through the matching service.

### Flow with two providers side by side

```
                            ┌─────────────────────────────┐
                            │ Verification Bulk Processor │
                            │       (or High Processor)   │
                            └──────────────┬──────────────┘
                                           │
                                           │ "verify this email"
                                           ▼
                                ┌──────────────────────┐
                                │ Provider Router      │
                                │ (chooses A or B per  │
                                │  list / env / quota) │
                                └──────────┬───────────┘
                                           │
                            ┌──────────────┴──────────────┐
                            │                             │
                            ▼                             ▼
                ┌──────────────────────┐   ┌──────────────────────┐
                │ Mail Tester Service  │   │ Provider B Service   │
                └──────────┬───────────┘   └──────────┬───────────┘
                           │                          │
                           ▼                          ▼
                   ┌─────────────┐            ┌─────────────┐
                   │ External    │            │ External    │
                   │ Provider A  │            │ Provider B  │
                   └──────┬──────┘            └──────┬──────┘
                          │                          │
                          ▼                          ▼
                  same internal             same internal
                  verdict object            verdict object
                          │                          │
                          └──────────────┬───────────┘
                                         │
                                         ▼
                                push the verdict
                                onto the db.write
                                queue, as today
```

The important property is that **none of the workers, none of the queues, none of the priority logic and none of the database tables change.** Only the small adapter that wraps the new provider, and the rule that decides which provider to use.

### A useful side effect

Because the Key Pool can already keep separate buckets, you can run Provider A and Provider B at the same time and let the system spread load across both. If Provider A returns 429, the router temporarily picks Provider B. The user-facing throughput improves automatically, and the rest of the pipeline (priority, progress, DB writes, websocket fan-out) does not need to know any of this is happening.

---

## 10. Summary

- The backend uses **four queues** and **four kinds of workers** with a default total of **30 parallel slots**.
- Single verifications skip queues and answer synchronously.
- Bulk uploads are parsed once, then their emails are scheduled through the queue with a **size-aware stride** so smaller lists finish faster but no list is ever paused.
- A **Starvation Guard** guarantees no list waits more than about fifteen seconds without being promoted.
- The provider is called through a single adapter; the rest of the pipeline is provider-agnostic, so adding a second verification API is a small, localised change.
