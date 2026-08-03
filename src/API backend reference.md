# GovtPrep Backend — API Reference

Generated from the codebase (`index.js`, `routes/`, `controllers/`, `middleware/`, `models/`) for frontend integration. Every endpoint below reflects the **actual current implementation**, including inconsistencies — read the "Known Inconsistencies" section before integrating a generic API client/error handler.

## Base URL

```
http://<HOST>:<PORT>/api
```

`HOST`/`PORT` come from `.env` (default `0.0.0.0:5000` if unset/empty). All routes below are relative to `/api` unless noted. There is also `GET /api/health` (no prefix logic difference, still under `/api`).

## Authentication

- Scheme: `Authorization: Bearer <token>` header (JWT). Obtain `token` + `refreshToken` from **Register** or **Login**.
- Token payload subject is the user id; `JWT_EXPIRES_IN` controls access-token lifetime (currently `15d`). There is a separate long-lived `refreshToken` (opaque, stored in Mongo `RefreshToken` collection) used only to mint a new access token via `POST /api/auth/refresh`. `RefreshToken` fields: `user` (ref), `token` (the opaque string, unique), `expiresAt`, `device` (string, default `""`), `revoked` (boolean, default `false`), `createdAt`/`updatedAt`. Expired documents are auto-deleted by a Mongo TTL index on `expiresAt` — no cron needed. ⚠️ `device`/`revoked` exist on the schema but **no route currently sets or reads them** — there is no "list my sessions" or "revoke a specific device" endpoint; `POST /api/auth/logout` only revokes-by-deleting the single token you send it.
- ⚠️ **No rate limiting anywhere in the app** — login, register, forgot-password, etc. all have no request-throttling middleware (confirmed: no `express-rate-limit` or similar in `package.json`). A frontend can hammer these endpoints without hitting a 429; don't build UI that assumes one exists, and consider client-side debouncing on auth forms yourself.
- Roles: `student` (default), `instructor`, `admin`. Many endpoints are gated with `authorize("admin")` etc. — see each endpoint's **Auth** line.
- **Public browsing endpoints (2026-07-28, `GET /api/tests` added 2026-07-28 in a follow-up):** `GET /api/categories`, `GET /api/categories/:id`, `GET /api/test-series`, `GET /api/test-series/:id`, `GET /api/current-affairs`, `GET /api/current-affairs/:id`, and `GET /api/tests` no longer require a token at all — they use a new `optionalAuth` middleware instead of `authMiddleware`. Sending no `Authorization` header, or an invalid/expired/malformed one, is **not an error** on these routes — the request just proceeds as anonymous (`req.user` is `null`), never a 401. If you *do* send a valid token and that user is `admin`, the query-filter behavior documented per-endpoint below (e.g. `isActive=`/`isPublished=`) still applies; anonymous and non-admin callers always get the public-safe filtered view. ⚠️ **`GET /api/tests/:id` was deliberately left protected and still requires a token** — browsing the test list is public, but fetching a single test's detail (and therefore starting it) is not; see the Tests section. This means a frontend can render test cards from the list for anonymous visitors, but must gate the "Start Test" / detail-fetch action behind a login check itself, since `GET /api/tests/:id` and `POST /api/test-attempts/start` will both still 401 for anonymous users.
- CORS: server currently allows a **hardcoded** origin list in `index.js` (`http://localhost:8080`, `http://localhost:3000`, `http://89.116.20.193:8080`) with `credentials: true`. The `ALLOWED_ORIGINS` env var exists in `.env` but is **not read by the code** — changing it has no effect unless `index.js` is updated. If your frontend runs on a different origin, it will be blocked by CORS regardless of `.env`.

### Auth error responses (from `authMiddleware` / `authorize` — apply to every protected route below)

| Case | Status | Body |
|---|---|---|
| Missing/malformed `Authorization` header | 401 | `{ "message": "Access denied. No token provided." }` |
| Invalid/expired/malformed JWT | 401 | `{ "message": "Invalid Token" }` |
| Token valid but user no longer exists | 401 | `{ "message": "User not found" }` |
| User account deactivated (`isActive:false`) | 403 | `{ "message": "Your account has been deactivated by an admin" }` |
| Authenticated but wrong role | 403 | `{ "message": "Forbidden" }` |

**Note:** these auth-layer errors use `{ message }` only — **no `success` key** — unlike almost every controller response below, which uses `{ success, message, ... }`. Don't assume `success` is always present; check status code first, and treat any 4xx/5xx as a failure regardless of body shape. This table applies to every protected route in this doc — it does **not** apply to the six public browsing endpoints listed above (`optionalAuth` never returns any of these).

## Standard response envelope

Most controllers return:
```json
{ "success": true, "data": ... }
{ "success": true, "message": "...", "data": ... }
{ "success": false, "message": "...", "error": "..." }
```
`error` (raw `err.message` from Mongoose/Node) is only present on 500s, and is not meant for end-user display.

### Known inconsistencies (verified in code — build your API client defensively)

1. **`authController`** register/login success responses omit `success` entirely (`{ message, token, refreshToken, user }`), while refresh/logout/forgot/reset-password use `{ success, message, ... }`. Auth *error* responses across the whole app also never include `success` (see table above). Every other controller (categories, tests, questions, etc.) consistently uses `{ success: true/false, ... }`.
2. Duplicate-key (Mongo error 11000) is only handled explicitly in `registerUser` and `updateMe` (→ 400 `"<field> already taken"`). Everywhere else (e.g. `updateUserByAdmin`, `createCategory`, updating a `Page` slug to a colliding value) a duplicate key falls through to a generic `500`.
3. Soft-delete success messages are inconsistent: `"Category deleted (soft)"`, `"Test Series deleted (soft)"`, `"Article deleted (soft)"` vs plain `"Test deleted"` — all four are soft deletes (flip `isActive`/`isPublished`), wording just differs. `Media` and `Page` deletes are **hard** deletes (`"Media deleted"`, `"Page deleted"`).
4. `Category`, `TestSeries`, and `CurrentAffairs` admin create/update all now take real file uploads, but each under a **different field name** — Category uses `categoryImage`, TestSeries uses `image` (plus `notificationPdf`), CurrentAffairs uses `currentAffairsImage`. Don't reuse the same upload field-name config across these.
5. A test attempt can silently flip to `status: "auto-submitted"` in the background (cron sweep every 60s past `expiresAt`) without the frontend calling submit — treat `auto-submitted` identically to `completed` everywhere in the UI (results, leaderboard, attempt history).
6. `submitTest` has no explicit 400 for a missing `attemptId` — it resolves to the generic 404 `"Attempt not found"`.
7. `importantDates` validation (`{from,to}` date-range shape) is enforced on `POST /api/admin/test-series` but **not** on `PATCH /api/admin/test-series/:id` — the same malformed input is rejected with 400 on create but can be silently written on update.
8. `Test.duration` is **never accepted from the client** on `POST`/`PATCH /api/admin/tests` — it's always recomputed server-side as the sum of `sections[].duration`. A client that sends `duration` directly (matching the field's presence in the schema) will have it silently ignored; omitting `sections` entirely on create fails with a validation error since `sections` must have at least one entry.
9. `Test` has **no `category` field at all** — a test's category is only reachable indirectly via `test.testSeries.category`. Sending `category` in a Test create/update body is silently dropped (Mongoose strict mode). `GET /api/tests?category=` still works, but internally resolves to "all tests whose `testSeries` belongs to that category" — see the Tests section.
10. `Question.section` is a **required** field referencing a specific entry inside `Test.sections[]` (by that subdocument's own `_id`, not a separate collection) — it is not a Mongoose `ref`, so it's validated manually in the controller against the parent Test's `sections` array. Creating a question without a valid `section` fails with a 400, not a schema-level 500.
11. Browsing GET endpoints are now public/token-optional (Categories, Test Series, Current Affairs, and `GET /api/tests` — see the Authentication section above), but `GET /api/tests/:id` was deliberately **not** included and still 401s without a token — the *list* of tests is public, but a single test's *detail* (and starting it) is not. Don't assume every list+detail pair in this API shares one auth pattern — check each endpoint's own line, not just its section header.

## Environment variables (backend `.env`)

Not directly consumed by the frontend, but useful when something behaves unexpectedly and the cause is a missing/wrong backend config value rather than an API bug. `.env.example` in the repo is incomplete — the actual variables read by the code are:

| Var | Read by | Purpose | In `.env.example`? |
|---|---|---|---|
| `mongoDB_URL` | `db.js` (and the Python scrapers — see below) | Mongo connection string | Yes |
| `JWT_SECRET` | `middleware/authMiddleware.js`, `utils/generateToken.js` | JWT sign/verify | Yes |
| `JWT_EXPIRES_IN` | `utils/generateToken.js` | Access-token TTL. Code default is `7d`, but the deployed value is `15d` (see Authentication section) | Yes |
| `PORT` / `HOST` | `index.js` | Listen address, default `0.0.0.0:5000` | Yes |
| `ALLOWED_ORIGINS` | — | ⚠️ **Dead** — not read anywhere in code. CORS origins are hardcoded in `index.js` instead (see CORS note above) | Yes, but unused |
| `GMAIL_USER` | `utils/emailService.js` | Gmail SMTP auth user, also the `from` fallback for outgoing emails | **No** |
| `GMAIL_PASSWORD` | `utils/emailService.js` | Gmail SMTP auth password — must be a Google **App Password** (2FA account), not the regular login password | **No** |
| `EMAIL_FROM` | `utils/emailService.js` | Overrides the `from` address on outgoing emails; falls back to `GMAIL_USER`, then `"noreply@govtprep.com"` | **No** |

⚠️ Email sending (password reset) currently goes through Gmail SMTP, which has its own sending-rate limits and is sometimes flagged by spam filters — if reset emails aren't arriving in testing, that's a likely first place to check, not necessarily an API bug.

---

## File uploads (multer)

| Field name | Used by | Storage | Allowed types | Max size |
|---|---|---|---|---|
| `image`, `notificationPdf` | `POST/PATCH /admin/test-series` | disk → `/uploads/testseries_image/<file>` and `/uploads/notificationPDF/<file>` respectively (two independent fields, both optional) | `image/*`, `video/*`, `application/pdf` | 20 MB each |
| `categoryImage` | `POST/PATCH /admin/categories` | disk → `/uploads/category_image/<file>` | same as above | 20 MB |
| `currentAffairsImage` | `POST/PATCH /admin/current-affairs` | disk → `/uploads/current_affairs_image/<file>` | same as above | 20 MB |
| `profilePicture` | `PUT /users/me` | disk → `/uploads/<file>` (flat, no subfolder) | same as above | 20 MB |
| `file` | `POST /admin/media/upload` | disk → `/uploads/<file>` (flat, no subfolder) | same as above | 20 MB |
| `file` | `POST /admin/questions/bulk` | memory (CSV parsed, not persisted) | `.csv` / `text/csv` / `application/vnd.ms-excel` | 5 MB |

Uploaded files are served back at whatever `GET /uploads/...` path the response's `image`/`notificationPdf`/`url` field says (static, no auth) — **don't hardcode a flat `/uploads/<filename>` path**, some fields now land in a subfolder (see table above) while others stay flat; always use the URL string the API returned rather than constructing it yourself. A file-type rejection from multer's `fileFilter` bubbles to the **global error handler**, not a clean 400 — it comes back as `{ success:false, message:"Unsupported file type. Only images, videos, and PDFs are allowed." }` with status **500** (no `.status` set on that error), not 400. Handle it as a generic failure, don't branch on status code for this specific case.

⚠️ **One exception to "these are all backend-relative paths":** `CurrentAffairs.image` can be a **full external URL** instead of a relative one, for articles ingested by the GKToday scraper (see "Current Affairs data ingestion" below) — those images live on `gktoday.in`, not on this backend. Any frontend image-rendering logic that touches `CurrentAffairs.image` should check for an `http(s)://` prefix and render it as-is in that case, rather than always prepending the API host.

---

## 1. Auth — `/api/auth` (all public, no token required)

### POST `/api/auth/register`
**Body**
```json
{ "name": "Jane Doe", "email": "jane@example.com", "mobile": "9876543210", "password": "secret123", "role": "student" }
```
`email`, `password` required (password min 6 chars). `name`, `mobile` optional strings. `role` optional enum `student|instructor|admin`, defaults `student`.

**Success — 201**
```json
{
  "message": "User registered successfully!",
  "token": "<jwt>",
  "refreshToken": "<opaque>",
  "user": { "id": "...", "name": "Jane Doe", "email": "jane@example.com", "mobile": "9876543210", "role": "student", "isActive": true }
}
```
**Errors**
- 400 `{ "message": "Email and password are required" }`
- 400 `{ "message": "Password must be at least 6 characters" }`
- 400 `{ "message": "email already registered" }`
- 400 `{ "message": "<field> already taken" }` (other unique-field clash, e.g. username)
- 500 `{ "message": "Server error", "error": "..." }`

### POST `/api/auth/login`
**Body**: `{ "email": "...", "password": "..." }` (both required)

**Success — 200**
```json
{
  "message": "Login successful!",
  "token": "<jwt>",
  "refreshToken": "<opaque>",
  "user": { "id": "...", "name": "...", "email": "...", "username": "...", "profilePicture": "...", "role": "student", "isActive": true }
}
```
**Errors**
- 400 `{ "message": "Please provide email and password" }`
- 401 `{ "message": "Invalid email or password" }`
- 403 `{ "message": "Your account has been deactivated by an admin" }`
- 500 `{ "message": "Server error", "error": "..." }`

### POST `/api/auth/refresh`
**Body**: `{ "refreshToken": "..." }` (required). Rotates the refresh token — the old one is revoked.

**Success — 200**: `{ "success": true, "token": "<new jwt>", "refreshToken": "<new opaque>" }`
**Errors**
- 400 `{ "success": false, "message": "refreshToken is required" }`
- 401 `{ "success": false, "message": "Invalid or expired refresh token" }`
- 401 `{ "success": false, "message": "Account not available" }`
- 500 `{ "success": false, "message": "Server error", "error": "..." }`

### POST `/api/auth/logout`
**Body**: `{ "refreshToken": "..." }` (required). Idempotent — 200 even if the token was already revoked/doesn't exist.

**Success — 200**: `{ "success": true, "message": "Logged out" }`
**Errors**: 400 `{ "success": false, "message": "refreshToken is required" }`

### POST `/api/auth/forgot-password`
**Body**: `{ "email": "..." }` (required). Always returns the same generic success message regardless of whether the email exists (anti-enumeration) — **do not** branch UI logic on this response to reveal account existence.

If the account exists, the server emails a 6-digit OTP (built in `authController.js`, sent via Gmail SMTP through `utils/emailService.js`'s `sendPasswordResetOtpEmail`). The OTP is never returned in the API response — only the hashed form is stored (`resetPasswordOtp` on the User doc). The OTP expires **10 minutes** after the request (`RESET_OTP_TTL_MS`) and allows at most **5** incorrect guesses (`RESET_OTP_MAX_ATTEMPTS`) before it must be re-requested.

**Success — 200**: `{ "success": true, "message": "If an account with that email exists, a password reset code has been sent." }`
**Errors**
- 400 `{ "success": false, "message": "Email is required" }`
- 500 `{ "success": false, "message": "Server error", "error": "..." }`

### POST `/api/auth/reset-password`
**Body**: `{ "email": "...", "otp": "...", "newPassword": "..." }` (`otp` is the 6-digit code emailed by forgot-password; `newPassword` min 6 chars). Verifies the OTP and sets the new password in one step — there is no separate "verify OTP" call.

**Success — 200**: `{ "success": true, "message": "Password has been reset successfully" }`
**Errors**
- 400 `{ "success": false, "message": "email, otp and newPassword are required" }`
- 400 `{ "success": false, "message": "Password must be at least 6 characters" }`
- 400 `{ "success": false, "message": "Invalid or expired OTP" }` (wrong/expired/missing OTP)
- 400 `{ "success": false, "message": "Too many incorrect attempts. Please request a new OTP." }`
- 500 `{ "success": false, "message": "Server error", "error": "..." }`

---

## 2. Users — `/api/users` (auth required, any role)

### GET `/api/users/me`
**Success — 200**: `{ "success": true, "data": { ...full User doc minus password... } }`

### PUT `/api/users/me` — `multipart/form-data`
**Form fields** (all optional): `name`, `email`, `mobile`, `username`, `address`, `country`, `city`, `password` (string), `currentPassword` (string), `profilePicture` (file — see upload table above).

⚠️ If `password` is present, `currentPassword` is **required** and must match the account's existing password — this is the logged-in "change password" flow (distinct from the OTP-based `/api/auth/forgot-password` + `/api/auth/reset-password` flow above, which is for users who can't log in).

**Success — 200**
```json
{
  "success": true,
  "message": "Profile updated",
  "data": { "id":"...", "name":"...", "email":"...", "mobile":"...", "username":"...", "profilePicture":"...", "address":"...", "country":"...", "city":"...", "role":"student", "isActive":true }
}
```
**Errors**
- 404 `{ "success": false, "message": "User not found" }`
- 400 `{ "success": false, "message": "<field> already taken" }`
- 400 `{ "success": false, "message": "Current password is required to set a new password" }`
- 400 `{ "success": false, "message": "Password must be at least 6 characters" }`
- 400 `{ "success": false, "message": "Current password is incorrect" }`
- 500 `{ "success": false, "message": "Error updating profile", "error": "..." }`

### POST `/api/users/me/report-question`
**Body**: `{ "questionId": "<ObjectId>", "reason": "Answer key seems incorrect" }` (both required)

**Success — 201**: `{ "success": true, "message": "Report submitted", "data": { ...Report doc, status:"pending"... } }`
**Errors**
- 400 `{ "success": false, "message": "questionId and reason are required" }`
- 404 `{ "success": false, "message": "Question not found" }`
- 500 `{ "success": false, "message": "Error submitting report", "error": "..." }`

---

## 3. Users (admin) — `/api/admin/users` (auth + `admin` role)

### GET `/api/admin/users?role=&isActive=`
Query: `role` (optional exact match), `isActive` (optional `"true"`/`"false"` string).
**Success — 200**: `{ "success": true, "count": N, "data": [ ...users, password excluded, sorted newest first... ] }`

### GET `/api/admin/users/:id`
**Success — 200**: `{ "success": true, "data": { ...user... } }`
**Errors**: 404 `{ "success": false, "message": "User not found" }`

### PATCH `/api/admin/users/:id`
**Body** (all optional): `role` (`student|instructor|admin`), `isActive` (boolean), `name`, `email`, `mobile`.
**Success — 200**: `{ "success": true, "message": "User updated", "data": { ...user... } }`
**Errors**: 404 `{ "success": false, "message": "User not found" }`. ⚠️ No duplicate-key handling — colliding `email` throws a generic 500.

---

## 4. Categories — `/api/categories` (**public — no token required**, `optionalAuth`)

Token is fully optional here and has **zero effect on the response** either way — neither endpoint branches on `req.user` at all, admin or not.

### GET `/api/categories`
No query filters supported. Only active categories returned, trimmed to `{ _id, name, slug, image }`.
**Success — 200**: `{ "success": true, "count": N, "data": [{ "_id":"...", "name":"...", "slug":"...", "image":"..." }] }`

### GET `/api/categories/:id`
**Success — 200**: `{ "success": true, "data": { ...full Category doc... } }`
**Errors**: 404 `{ "success": false, "message": "Category not found" }` (also returned if the category is soft-deleted)

## Categories (admin) — `/api/admin/categories` (auth + `admin`, `multipart/form-data`)

### POST `/api/admin/categories`
**Form fields**: `name` (required), `description` (optional), `categoryImage` (file, optional — ⚠️ field name is `categoryImage`, **not** `image`; see upload table below). `image` is never accepted as a plain string anymore — it's fully server-derived from the uploaded file (`""` if no file is sent).
**Success — 201**: `{ "success": true, "message": "Category created", "data": { ...category, "image": "/uploads/category_image/<file>" } }`
**Errors**: 500 `{ "success": false, "message": "Error creating category", "error": "..." }` (covers missing `name` and duplicate `name` — no 400 differentiation here)

### PATCH `/api/admin/categories/:id`
**Body**: any subset of `name/description/isActive` (text fields) plus an optional new `categoryImage` file, which replaces the stored image and deletes the old file from disk. ⚠️ Not validated via Mongoose (`runValidators` not set) — invalid values can be persisted silently. Renaming `name` here also regenerates `slug` (a schema hook now keeps `slug` in sync on `PATCH`, not just on initial create).
**Success — 200**: `{ "success": true, "message": "Category updated", "data": { ...category... } }`
**Errors**: 404 `{ "success": false, "message": "Category not found" }` (also returned if a new `categoryImage` was sent for a category that turns out not to exist)

### DELETE `/api/admin/categories/:id` (soft delete: `isActive:false`)
**Success — 200**: `{ "success": true, "message": "Category deleted (soft)" }` (no `data`)
**Errors**: 404 `{ "success": false, "message": "Category not found" }`

---

## 5. Test Series — `/api/test-series` (**public — no token required**, `optionalAuth`)

### GET `/api/test-series?category=&isActive=&isPublished=`
`category` (ObjectId, optional). `isActive`/`isPublished` (`"true"/"false"`) **only apply if you send a valid token for an `admin` user** — anonymous callers (no token) and non-admin/invalid/expired-token callers are always forced to `isActive:true, isPublished:true` regardless of query.
**Success — 200**: `{ "success": true, "count": N, "data": [{ ...series, "category": { "_id":"...", "name":"...", "slug":"..." } }] }`

### GET `/api/test-series/:id`
**Success — 200**: `{ "success": true, "data": { ...full TestSeries doc... } }`
**Errors**: 404 `{ "success": false, "message": "Test Series not found" }` (also if inactive, or unpublished + caller isn't an authenticated admin)

## Test Series (admin) — `/api/admin/test-series` (auth + `admin`, `multipart/form-data`)

### POST `/api/admin/test-series`
**Form fields**: `name` (required), `category` (ObjectId, required), `description`, `officialWebsite` (string, optional), `applyLink` (string, optional), `isActive`, `isPublished`, `isPaid` (boolean), `price` (number), `negativeMarking` (boolean), `negativeMarksPerQuestion` (number), `marksPerQuestion` (number), `importantDates` (optional), `image` (file), `notificationPdf` (file).

`importantDates` ⚠️ must be a **JSON-stringified object** sent as a form-data text field (not raw JSON), where every value is an exact date range — free text like `"July 2025"` is rejected:
```json
{ "Application Start": { "from": "2026-08-01", "to": "2026-08-01" }, "Application End": { "from": "2026-08-01", "to": "2026-08-20" } }
```
Each entry must be `{ from: "YYYY-MM-DD", to: "YYYY-MM-DD" }` with `from <= to`, or the request fails with **400** `{ "success": false, "message": "Invalid importantDates: \"<label>\" must be { from: \"YYYY-MM-DD\", to: \"YYYY-MM-DD\" } with from <= to" }`.

**Success — 201**: `{ "success": true, "message": "Test Series created", "data": { ...series, "image": "/uploads/testseries_image/<file>", "notificationPdf": "/uploads/notificationPDF/<file>" } }`

**Errors**
- 400 `{ "success": false, "message": "Invalid importantDates: ..." }`
- 500 `{ "success": false, "message": "Error creating test series", "error": "..." }` (missing required fields, etc.)

### PATCH `/api/admin/test-series/:id`
Same fields as create, all optional; sending a new `image` and/or `notificationPdf` file replaces and deletes the old one(s) on disk independently. Unlike create, `importantDates` here is **not** validated for the `{from,to}` shape — malformed JSON just throws and surfaces as a generic 500, and a syntactically-valid-but-wrong-shaped object is accepted as-is. Renaming `name` here also regenerates `slug`.
**Success — 200**: `{ "success": true, "message": "Test Series updated", "data": { ...series... } }`
**Errors**: 404 `{ "success": false, "message": "Test Series not found" }`

### DELETE `/api/admin/test-series/:id` (soft delete: `isActive:false, isPublished:false`)
**Success — 200**: `{ "success": true, "message": "Test Series deleted (soft)" }`
**Errors**: 404 `{ "success": false, "message": "Test Series not found" }`

---

## 6. Tests — `/api/tests` (list is **public — no token required**, `optionalAuth`; detail below is still protected)

### GET `/api/tests?category=&testSeries=&isActive=&isPublished=&paperType=&year=`
**Public — no token required.** Same admin-only filter behavior for `isActive`/`isPublished` as test-series (only unlocked with a valid `admin` token; anonymous/non-admin/invalid-token callers are forced to `isActive:true, isPublished:true`). List items are **projected**, not full docs.

- `testSeries` (ObjectId, optional) — direct match, **takes precedence over `category` if both are sent**.
- `category` (ObjectId, optional) — ⚠️ `Test` has no `category` field of its own; this is resolved by first finding every `TestSeries` in that category, then matching `testSeries: { $in: [...those series ids...] }`. If a category has no test series, this returns an empty list rather than an error.
- `paperType` (optional, enum `mock|previous_year`) — exact match.
- `year` (optional, number, e.g. `2025`) — filters `examDate` to that calendar year (`Jan 1 00:00:00` to `Dec 31 23:59:59` UTC). Only meaningful for `paperType=previous_year` tests, since `examDate` is otherwise unset.

**Success — 200**
```json
{
  "success": true, "count": N,
  "data": [{ "_id":"...", "title":"...", "description":"...", "duration":60, "totalQuestions":50, "totalMarks":50, "isPublished":true, "isPaid":false, "testSeries":"<id>", "paperType":"mock", "examDate":null, "attemptsCount":12 }]
}
```
(no `sections` in list view, and — ⚠️ note — no `category` field either; get a test's category via `testSeries.category` on the `GET /:id` detail response or the test-series endpoints)

### GET `/api/tests/:id`
⚠️ **Still requires a valid Bearer token** — unlike the list endpoint above, this one was deliberately left behind `authMiddleware`/`authorize("student","admin","instructor")`. A frontend that renders public test cards from the list must still gate any click-through to a test's detail (and to `POST /api/test-attempts/start`, also protected) behind its own login check, since both will 401 for anonymous users.
**Success — 200**: `{ "success": true, "data": { ...full Test doc incl. sections[]... } }`
**Errors**: 401/403 per the standard auth-error table (see Authentication section) if no/invalid token; 404 `{ "success": false, "message": "Test not found" }` once authenticated, if the test doesn't exist/isn't visible to the caller

## Tests (admin) — `/api/admin/tests` (auth + `admin`, JSON body)

### POST `/api/admin/tests`
**Body**
```json
{
  "title": "SSC CGL Tier 1 Mock 1",
  "testSeries": "<TestSeries ObjectId>",
  "paperType": "mock",
  "examDate": "2025-06-15",
  "sections": [{ "name": "Quant", "no_of_questions": 25, "no_of_marks": 50, "duration": 30 }],
  "isActive": true,
  "isPublished": false,
  "isPaid": false
}
```
`title`, `testSeries` required. ⚠️ **Do not send `category`** — `Test` has no `category` field; it's silently dropped (schema is strict) and has zero effect either way. `sections` is **effectively required too** (schema validator rejects an empty array with `"At least one section is required"`), each entry needs `name`, `no_of_questions`, `no_of_marks`, `duration` (minutes) — all required. `paperType` optional enum `mock|previous_year`, defaults `"mock"`. `examDate` optional Date, only meaningful when `paperType` is `"previous_year"`. `attemptsCount` is server-managed (starts at 0, incremented by `POST /api/test-attempts/start`) — don't send it.

⚠️ **`duration` is never taken from the request body — do not send it.** The top-level `Test.duration` is always **server-computed** as the sum of every section's `duration`. Concretely: the controller destructures `duration` out of `req.body` and discards it, then — only if `sections` is present — sets `payload.duration = sum(sections[].duration)`. Practical effect: if you omit `sections`, `payload.duration` is never set at all, and creation fails (`duration` is `required` in the schema) with a 500 validation error. So `sections` must always be sent with at least one entry, and any client-computed total duration is redundant/ignored — just make sure each section's own `duration` sums to what you want the test's overall duration to be.

Creating a test increments its `testSeries.totalTests`.
**Success — 201**: `{ "success": true, "message": "Test created", "data": { ...test, "duration": 30 } }` (note `duration` in the response is the server-computed sum, not anything sent by the client)
**Errors**: 500 `{ "success": false, "message": "Error creating test", "error": "..." }` (covers missing/empty `sections`, missing `title`/`testSeries`, and any section missing its own required sub-fields)

### PATCH `/api/admin/tests/:id`
Any subset of the create fields (`category` still has no effect, same as create). Same `duration` behavior as create: sending `duration` directly has no effect; if you include `sections` in the update, `duration` is recomputed as the new sum and overwrites the stored value — if you omit `sections`, the existing `sections`/`duration` are left untouched. Changing `testSeries` decrements the old series' `totalTests` and increments the new one's. Renaming `title` here also regenerates `slug` (same fixed behavior as Category/TestSeries — see their sections).
**Success — 200**: `{ "success": true, "message": "Test updated", "data": { ...test... } }`
**Errors**: 404 `{ "success": false, "message": "Test not found" }`

### DELETE `/api/admin/tests/:id` (soft delete)
**Success — 200**: `{ "success": true, "message": "Test deleted" }` (⚠️ note: no "(soft)" suffix, unlike category/test-series, despite being the same soft-delete pattern)
**Errors**: 404 `{ "success": false, "message": "Test not found" }`

---

## 7. Questions — `/api/questions` (student-facing, roles `student|admin`)

Every question belongs to a **specific section** within its Test (`Test.sections[]._id`), not just to the Test as a whole — see `Question.section` in the model reference. This is enforced server-side, not just a convention.

### GET `/api/questions?test=<TestId>&section=<SectionId>`
`test` query param **required**. `section` (the section subdocument's `_id`, from that test's `sections[]`) optional — narrows results to just that section. Returns questions with `correctAnswer`/`explanation` **stripped**.
**Success — 200**: `{ "success": true, "count": N, "data": [{ "_id":"...", "questionText":"...", "options":[{"text":"..."}], "test":"<id>", "section":"<sectionId>", "marks":1, "order":0 }] }`
**Errors**: 400 `{ "success": false, "message": "test query param is required" }`

## Questions (admin) — `/api/admin/questions` (auth + `admin`)

### POST `/api/admin/questions`
**Body**
```json
{
  "test": "<Test ObjectId>",
  "section": "<Test.sections[]._id — a section subdocument id, not a separate collection>",
  "questionText": "What is the capital of India?",
  "options": [{ "text": "Mumbai" }, { "text": "New Delhi" }, { "text": "Kolkata" }, { "text": "Chennai" }],
  "correctAnswer": 1,
  "explanation": "New Delhi is the capital.",
  "marks": 1,
  "order": 0
}
```
`test` and `section` are both explicitly required (checked before touching the DB). The server then verifies `test` actually exists, and that `section` is one of that test's own `sections[]._id` values — a section id borrowed from a *different* test is rejected. `options` **must be 4 or 5 items** (schema-enforced) — 5 is for banking-style exams (e.g. IBPS) that use options a-e. `correctAnswer` is a **0-based index** into `options`. `order` auto-assigned (count of existing questions in that test **+ section** combination) if omitted — i.e. ordering restarts per section, not per test. Creating/updating/deleting a question recalculates the parent Test's `totalQuestions`/`totalMarks`.
**Success — 201**: `{ "success": true, "message": "Question created", "data": { ...question... } }`
**Errors**
- 400 `{ "success": false, "message": "test (Test ID) is required" }`
- 400 `{ "success": false, "message": "section (section ID) is required" }`
- 400 `{ "success": false, "message": "test not found" }`
- 400 `{ "success": false, "message": "section does not belong to this test" }`
- 500 for schema violations (e.g. not 4 or 5 options)

### GET `/api/admin/questions?test=<TestId>&section=<SectionId>` (both filters optional — omit `test` for all questions across all tests)
**Success — 200** (note: plain `res.json`, still HTTP 200): `{ "success": true, "count": N, "data": [{ ...full question incl. correctAnswer/explanation/section... }] }`

### PATCH `/api/admin/questions/:id`
Any subset of question fields, schema-validated. (`test`/`section` can technically be changed here too — the server does not re-validate that a new `section` still belongs to the (possibly also-changed) `test`, unlike on create, so double-check both together if you ever let an admin move a question between sections/tests.)
**Success — 200**: `{ "success": true, "message": "Question updated", "data": { ...question... } }`
**Errors**: 404 `{ "success": false, "message": "Question not found" }`

### DELETE `/api/admin/questions/:id` (soft delete: `isActive:false`)
**Success — 200**: `{ "success": true, "message": "Question deleted" }`
**Errors**: 404 `{ "success": false, "message": "Question not found" }`

⚠️ Soft-deleting a question that a student already answered doesn't just vanish from lists — it also affects that student's **already-submitted** results: `getResult`'s `unattempted` count and `finalizeAttempt`'s scoring both now exclude answers pointing at an inactive question (see Test Attempts section).

### GET `/api/admin/questions/bulk/template`
Returns a **CSV file** (not JSON): `Content-Type: text/csv`, `Content-Disposition: attachment; filename="questions-template.csv"`. Header row: `test,section,questionText,option1,option2,option3,option4,correctAnswer,marks,explanation,order`. `section` in the CSV is matched by that section's **name** (e.g. `"General Awareness"`), not its ObjectId — the server looks it up against the given `test`'s `sections[]` by name. ⚠️ `correctAnswer` in the CSV is **1-based** (e.g. `2` = option2), unlike the JSON API's 0-based `correctAnswer`. The downloadable template only shows the 4-option baseline — see below for the optional 5th option.

### POST `/api/admin/questions/bulk` — `multipart/form-data`, field `file` (CSV, ≤5MB)
CSV columns: `test` (ObjectId, required), `section` (section **name**, required — must match a `sections[].name` on the given `test`), `questionText` (required), `option1`..`option4` (required), `option5` (optional — banking-style exams with 5 options), `correctAnswer` (1-based, up to however many options the row has: 1-4 or 1-5, required), `marks` (optional, default 1), `explanation` (optional), `order` (optional, auto-incremented per test+section if blank).
**Success — 201**: `{ "success": true, "message": "<N> questions uploaded successfully", "data": [ ...inserted questions... ] }`
**Errors**
- 400 `{ "success": false, "message": "CSV file is required (field name: file)" }`
- 400 `{ "success": false, "message": "Could not parse CSV file", "error": "..." }`
- 400 `{ "success": false, "message": "CSV file has no data rows" }`
- 400 `{ "success": false, "message": "Row <n>: test, section, questionText and options 1-4 are required (option5 is optional)" }`
- 400 `{ "success": false, "message": "Row <n>: test \"<id>\" not found" }`
- 400 `{ "success": false, "message": "Row <n>: section \"<name>\" does not belong to test \"<id>\"" }`
- 400 `{ "success": false, "message": "Row <n>: correctAnswer must be a number from 1 to 4" }` (or `1 to 5` if the row has an `option5`)
- 500 `{ "success": false, "message": "Bulk upload failed", "error": "..." }`

---

## 8. Test Attempts — `/api/test-attempts` (auth required, any role)

### POST `/api/test-attempts/start`
**Body**: `{ "testId": "<Test ObjectId>" }` (required). Resumes an existing non-expired `in-progress` **or `paused`** attempt for this user+test if one exists — a paused attempt is never silently superseded by a new one just because the student reopened the page. On a genuinely new attempt, also increments `Test.attemptsCount`.

The database enforces **at most one `in-progress` attempt, and separately at most one `paused` attempt, per (user, test)** via two unique partial indexes — this closes a race where two near-simultaneous `start` calls could otherwise both slip past the "no active attempt yet" check and each create one. If that race is lost, the server catches the resulting duplicate-key error and transparently returns the *other* request's attempt as a normal 200 "resumed" response — from the client's perspective this just looks like the usual resume path, never a 409/500.

**Success — 200 (resumed, in-progress)**: `{ "success": true, "resumed": true, "message": "Resuming your in-progress attempt", "data": { ...attempt, "remainingSeconds": 2400 } }`
**Success — 200 (resumed, paused)**: `{ "success": true, "resumed": true, "message": "You have a paused attempt for this test — resume it to continue", "data": { ...attempt, "status": "paused", "remainingSeconds": 2400 } }` — see "Pause / resume" below; `remainingSeconds` here is frozen at whatever it was when the attempt was paused.
**Success — 201 (new)**: `{ "success": true, "resumed": false, "data": { ...attempt, "expiresAt": "...", "totalMarks": 50, "currentQuestionIndex": 0, "status": "in-progress", "remainingSeconds": 2400 } }`
**Errors**
- 400 `{ "success": false, "message": "testId is required" }`
- 404 `{ "success": false, "message": "Test not found" }`
- 400 `{ "success": false, "message": "This test has no questions yet" }`

### GET `/api/test-attempts/:id/question/:index` (`:index` is 0-based)
This is the endpoint the test-taking page uses to hydrate itself (loading a question also refreshes the timer). **Works while `paused`, not just `in-progress`** — a paused attempt can still be viewed (read-only) so the frontend can render a "Paused" overlay with the frozen timer over the last-loaded question; it just won't persist `currentQuestionIndex` while paused (no writes happen to a paused attempt at all).
**Success — 200**
```json
{
  "success": true,
  "data": {
    "question": { "_id":"...", "questionText":"...", "options":[...] },
    "index": 0, "totalQuestions": 50, "selectedOption": null, "expiresAt": "...",
    "status": "in-progress", "remainingSeconds": 2385
  }
}
```
`question` never includes `correctAnswer`/`explanation`. `selectedOption` is `null` if unanswered, else the previously saved index. `status`/`remainingSeconds` were added alongside the pause/resume feature (see below) — `remainingSeconds` is **frozen** (returns the same value on every call) whenever `status` is `"paused"`.
**Errors**
- 404 `{ "success": false, "message": "Attempt not found" }`
- 403 `{ "success": false, "message": "Forbidden" }` (not the attempt's owner)
- 400 `{ "success": false, "message": "This attempt has already been submitted", "status": "completed" }` (only for a truly-ended attempt — `"paused"` is not treated as ended here)
- 400 `{ "success": false, "message": "Invalid question index" }`
- 404 `{ "success": false, "message": "No question at this index", "totalQuestions": 50 }`

### POST `/api/test-attempts/save-answer`
**Body**: `{ "attemptId": "...", "questionId": "...", "selectedOption": 2 }` (all required; `0` is a valid `selectedOption`)
**Success — 200**: `{ "success": true, "message": "Answer saved", "isCorrect": true }` (⚠️ no `data` wrapper — `isCorrect` is top-level)
**Errors**
- 400 `{ "success": false, "message": "attemptId, questionId and selectedOption are required" }`
- 404 `{ "success": false, "message": "Attempt not found" }`
- 403 `{ "success": false, "message": "Forbidden" }`
- 400 `{ "success": false, "message": "This attempt is paused. Resume it before continuing.", "status": "paused" }` — ⚠️ **new**: unlike the list above, a paused attempt is explicitly rejected here (and on `/submit` below), distinct from the generic "already submitted" case, so a stale tab can't sneak in an answer while paused.
- 400 `{ "success": false, "message": "This attempt has already been submitted", "status": "..." }`
- 404 `{ "success": false, "message": "Question not found for this test" }` (also returned if the question was **soft-deleted** since the attempt started — it must be `isActive:true` to accept an answer for it)
- 400 `{ "success": false, "message": "Invalid selectedOption" }`

### POST `/api/test-attempts/submit`
**Body**: `{ "attemptId": "..." }`. Idempotent — safe to call twice.
**Success — 200**: `{ "success": true, "message": "Test submitted", "data": { "score":40, "totalMarks":50, "correctCount":20, "wrongCount":5, "status":"completed" } }` (message becomes `"Attempt was already <status>"` if called again)
**Errors**
- 404 `{ "success": false, "message": "Attempt not found" }` (also thrown if `attemptId` is missing entirely)
- 403 `{ "success": false, "message": "Forbidden" }`
- 400 `{ "success": false, "message": "This attempt is paused. Resume it before submitting.", "status": "paused" }` — must resume first; checked before the idempotent "already submitted" branch above so a paused attempt isn't misreported as finished.

### GET `/api/test-attempts/:id/result`
Auto-finalizes if the attempt expired but is still marked `in-progress`. Accessible by the owner or an admin. Treats a **`paused`** attempt the same as `in-progress` — "not submitted yet", not a result to show.
**Success — 200**
```json
{
  "success": true,
  "data": {
    "attemptId": "...",
    "test": { "title":"...", "duration":60, "totalMarks":50, "totalQuestions":50, "testSeries": { "negativeMarking": true, "negativeMarksPerQuestion": 0.5 } },
    "status": "completed", "score": 40, "totalMarks": 50, "percentage": 80.0,
    "correctCount": 20, "wrongCount": 5, "unattempted": 25,
    "startedAt": "...", "submittedAt": "...",
    "breakdown": [
      { "questionId":"...", "questionText":"...", "options":[...], "correctAnswer":1, "explanation":"...", "selectedOption":1, "isCorrect":true, "attempted":true }
    ]
  }
}
```
**Errors**
- 404 `{ "success": false, "message": "Attempt not found" }`
- 403 `{ "success": false, "message": "Forbidden" }`
- 400 `{ "success": false, "message": "This attempt has not been submitted yet", "status": "in-progress" }` (`status` here will be `"in-progress"` or `"paused"`)

### Pause / Resume

Adds a `"paused"` value to `TestAttempt.status` (alongside the existing `in-progress`/`completed`/`auto-submitted`) plus three new fields: `pausedAt` (Date, null unless currently paused), `totalPausedDurationMs` (cumulative ms spent paused across the whole attempt), and `pauseCount` (times paused so far). **No separate `durationSeconds` field was added** — the attempt's total duration is derived from the existing `expiresAt - startedAt`, which is fixed at start and never changes, so it's already a single source of truth for "how long is this test."

`remainingSeconds` (returned by `/start`, `/question/:index`, `/pause`, `/resume`) is computed as:
```
effectiveExpiresAt = expiresAt + totalPausedDurationMs
remainingSeconds   = max(0, floor((effectiveExpiresAt - now) / 1000))
```
i.e. every millisecond spent paused pushes the deadline out by the same amount, so pausing never burns down the timer. While `status === "paused"`, `now` in that formula is pinned to `pausedAt` instead of the real clock — that's what freezes the value across repeated calls.

⚠️ The same `remainingSeconds <= 0` check (using the formula above, so it already excludes paused time) drives the lazy auto-submit that used to just compare `now > expiresAt` — this only ever fires while `status === "in-progress"`, so **a paused attempt can never auto-submit while paused**, no matter how long it sits paused.

#### POST `/api/test-attempts/:attemptId/pause`
Auth required, owner only.
**Success — 200**: `{ "success": true, "message": "Attempt paused", "data": { "status": "paused", "remainingSeconds": 2385 } }`
**Errors**
- 404 `{ "success": false, "message": "Attempt not found" }`
- 403 `{ "success": false, "message": "Forbidden" }` (not the owner)
- 400 `{ "success": false, "message": "This attempt has already ended", "status": "..." }` (the lazy expiry check fired first — it had actually already timed out)
- 400 `{ "success": false, "message": "Cannot pause an attempt with status \"<status>\"" }` (already `paused`, or already `completed`/`auto-submitted`)
- 400 `{ "success": false, "message": "Maximum number of pauses (<N>) reached for this attempt" }` — only if the test has `maxPauses` configured (see below)
- 400 `{ "success": false, "message": "Maximum total paused time reached for this attempt" }` — only if the test has `maxPauseDurationMs` configured

#### POST `/api/test-attempts/:attemptId/resume`
Auth required, owner only.
**Success — 200 (normal)**: `{ "success": true, "message": "Attempt resumed", "data": { "status": "in-progress", "remainingSeconds": 2385 } }`
**Success — 200 (edge case)**: `{ "success": true, "message": "Attempt auto-submitted (time was already up)", "data": { "status": "auto-submitted", "remainingSeconds": 0 } }` — if the accumulated paused time still leaves the timer exhausted the instant you resume (e.g. paused with 1 second left), the attempt is auto-submitted immediately instead of handing back a 0-second "in-progress" attempt.
**Errors**
- 404 `{ "success": false, "message": "Attempt not found" }`
- 403 `{ "success": false, "message": "Forbidden" }`
- 400 `{ "success": false, "message": "Cannot resume an attempt with status \"<status>\"" }` (not currently `paused`)

#### Pause-abuse limits (opt-in, per test)
`Test` gained two optional admin-configurable fields, both `null` by default (= unlimited, so existing tests are unaffected unless an admin explicitly sets one): `maxPauses` (number — caps `pauseCount`) and `maxPauseDurationMs` (number — caps `totalPausedDurationMs`). Neither is currently exposed on any admin create/update endpoint's documented field list above — they exist on the schema and are enforced by `/pause` if set directly in the DB, but there's no admin UI/API wiring for them yet. **Recommendation:** yes, some limit is worth having before this ships broadly — an unpaused/forgotten "paused" attempt otherwise gives a student effectively unlimited time on a timed exam. Wiring `maxPauses`/`maxPauseDurationMs` into `POST`/`PATCH /api/admin/tests` is a small, low-risk follow-up (same pattern as any other optional numeric field on that resource) rather than something that needed to block this change.

### GET `/api/test-attempts/my-attempts`
**Success — 200**: `{ "success": true, "count": N, "data": [{ "test": {"title":"...","duration":60,"totalMarks":50}, "status":"completed", "score":40, "correctCount":20, "wrongCount":5, "startedAt":"...", "submittedAt":"..." }] }` (sorted newest first)

## Leaderboard — `/api/leaderboard/:testId` (auth required, any role)

### GET `/api/leaderboard/:testId?limit=`
`limit` optional, default 20, capped at 100. Only includes `completed`/`auto-submitted` attempts, best attempt per user. The target test itself must be `isActive:true`, and (for non-admin callers) `isPublished:true` — an inactive or, for students, unpublished test's leaderboard now 404s instead of returning (possibly stale) data.
**Success — 200**
```json
{
  "success": true,
  "test": { "id":"...", "title":"...", "totalMarks":50 },
  "count": 20,
  "data": [{ "rank":1, "userId":"...", "attemptId":"...", "name":"...", "score":48, "correctCount":24, "wrongCount":1, "timeTakenMs":1234567, "submittedAt":"..." }]
}
```
**Errors**
- 400 `{ "success": false, "message": "Invalid testId" }`
- 404 `{ "success": false, "message": "Test not found" }`

---

## 9. Current Affairs — `/api/current-affairs` (**public — no token required**, `optionalAuth`)

### GET `/api/current-affairs?isPublished=&date=YYYY-MM-DD&category=&q=&limit=`
`isPublished` filter only honored if you send a valid token for an `admin` user — anonymous and non-admin/invalid-token callers are forced to `isPublished:true, isActive:true`. `q` uses a MongoDB text index. List items now include the full `content` field (an earlier `.select("-content")` that trimmed it from list responses was removed — don't assume the list view is a lightweight/summary-only payload anymore). The controller does not project fields at all, so every field on the model — including the scraper-only ones below — comes back on both list and detail responses.
**Success — 200**: `{ "success": true, "count": N, "data": [{ "_id":"...", "title":"...", "content":"...", "summary":"...", "date":"...", "category":"...", "category_link":"...", "tags":["..."], "image":"...", "url":"...", "source":"...", "source_link":"...", "views":123, "createdBy":"<userId or absent>" }] }`

⚠️ `url`, `source`, `source_link`, `category_link` are **not documented anywhere else** and default to `""` — they exist mainly to carry attribution for auto-ingested articles (see "Current Affairs data ingestion" below) but are plain optional string fields on `POST`/`PATCH /api/admin/current-affairs` too, so admin-authored articles can set them as well. Don't assume they're always populated — hand-written admin articles will typically leave them blank.

### GET `/api/current-affairs/streak` — auth required (`authMiddleware`, unlike the rest of this section)
⚠️ Registered before the `GET /:id` route below in `routes/currentAffairsRoutes.js` — otherwise Express would match the literal path segment `streak` as an `:id`. Returns the current user's reading streak plus a Monday–Sunday activity row for the current week (server-week, Monday start).
**Success — 200**
```json
{
  "success": true,
  "data": {
    "currentStreak": 4,
    "longestStreak": 12,
    "weekActivity": [
      { "date": "2026-07-27", "label": "M", "completed": true },
      { "date": "2026-07-28", "label": "T", "completed": true },
      { "date": "2026-07-29", "label": "W", "completed": false },
      { "date": "2026-07-30", "label": "T", "completed": false },
      { "date": "2026-07-31", "label": "F", "completed": false },
      { "date": "2026-08-01", "label": "S", "completed": false },
      { "date": "2026-08-02", "label": "S", "completed": false }
    ]
  }
}
```
`weekActivity` always has exactly 7 entries covering Monday through Sunday of the **current** week, regardless of when in the week you call it — it's not a rolling 7-day window. `date` is `YYYY-MM-DD` (UTC).
**Errors**: 401 (no/invalid token — see Authentication section)

### POST `/api/current-affairs/:id/record-view` — auth required (`authMiddleware`, unlike the rest of this section)
Call this when a student opens/reads an article, to advance their reading streak. Purely additive — does **not** touch `CurrentAffairs.views` (see `GET /:id` above) or any bookmark logic; it only writes to `User.currentStreak`/`longestStreak`/`lastActiveDate` and a `StreakActivity` log row.

"Today" is always the **server's UTC date** — the endpoint does not accept or trust a client-supplied date (a client could otherwise fake/extend a streak by sending an arbitrary date). Trade-off: a user far from UTC may see their streak roll over at a local time other than midnight.

Logic: if `lastActiveDate` is already today → no-op (idempotent, safe to call on every article open, not just the first). If `lastActiveDate` was yesterday → `currentStreak += 1`. If `lastActiveDate` is older than yesterday, or the user has never recorded a view → `currentStreak` resets to `1`. `longestStreak` is updated to `max(longestStreak, currentStreak)` in every case. Today is then logged in `StreakActivity` (idempotent — a duplicate insert for the same user+day is swallowed, not an error).

**Success — 200**: `{ "success": true, "data": { "currentStreak": 4, "longestStreak": 12 } }`
**Errors**
- 401 (no/invalid token)
- 404 `{ "success": false, "message": "Article not found" }` (missing, inactive, or unpublished-and-caller-isn't-admin — same indistinguishable-404 pattern as `GET /:id`)

### GET `/api/current-affairs/:id`
Increments `views` by 1 on every fetch (including anonymous requests — there's no dedup/rate-limit on this). Returns the full doc incl. `content`.
**Success — 200**: `{ "success": true, "data": { ...full article... } }`
**Errors**: 404 `{ "success": false, "message": "Article not found" }` (same message whether truly missing, inactive, or unpublished + caller isn't an authenticated admin — deliberately indistinguishable)

## Current Affairs (admin) — `/api/admin/current-affairs` (auth + `admin`, `multipart/form-data`)

### POST `/api/admin/current-affairs`
**Form fields**: `title` (required by schema), `content` (required by schema), `summary`, `category`, `date`, `currentAffairsImage` (file, optional — ⚠️ field name is `currentAffairsImage`, **not** `image`; `image` in the response is fully server-derived from this upload, same pattern as Category/TestSeries). `tags` and `isPublished` need explicit coercion since multipart fields are strings:
```json
{
  "title": "Union Budget 2026 Highlights",
  "content": "Full article content...",
  "summary": "Key highlights of the Union Budget 2026.",
  "category": "Economy",
  "tags": "[\"budget\", \"economy\"]",
  "date": "2026-07-24",
  "isPublished": "true"
}
```
`tags` ⚠️ must be a **JSON-stringified array**, e.g. `'["budget","economy"]'` (parsed server-side; malformed JSON throws and surfaces as a 500). `isPublished` ⚠️ must be sent as the literal string `"true"`/`"false"` (anything else is treated as falsy). No explicit 400 check for missing `title`/`content` — validation errors fall through to 500. `date` defaults to now, `category` defaults `"General"`, `isPublished` **defaults `false` here** (⚠️ contrast with the scraper pipeline below, which always writes `isPublished: true`). `url`, `source`, `source_link`, `category_link` (all optional plain strings, not in the example above) are also accepted and stored as-is — mainly useful if an admin is manually re-entering a scraped/attributed article.
**Success — 201**: `{ "success": true, "message": "Article created", "data": { ...article, "image": "/uploads/current_affairs_image/<file>" } }`

### PATCH `/api/admin/current-affairs/:id`
Any subset of the create fields (same `tags`/`isPublished`/`currentAffairsImage` handling as create); sending a new `currentAffairsImage` file replaces the stored image and deletes the old file from disk.
**Success — 200**: `{ "success": true, "message": "Article updated", "data": { ...article... } }`
**Errors**: 404 `{ "success": false, "message": "Article not found" }` (also returned if a new `currentAffairsImage` was sent for an article that turns out not to exist)

### DELETE `/api/admin/current-affairs/:id` (soft delete)
**Success — 200**: `{ "success": true, "message": "Article deleted (soft)" }` (no `data`)
**Errors**: 404 `{ "success": false, "message": "Article not found" }`

### Current Affairs data ingestion (scrapers) — not part of this HTTP API

Some `CurrentAffairs` documents a frontend fetches from `GET /api/current-affairs` were **never created through the API at all** — they're written directly into MongoDB by a standalone Python subsystem in `govt-backend-code/scrapers/`. There is **no admin endpoint to trigger, schedule, or monitor this** — `index.js` has zero knowledge of it, it's not a cron job, and it's not wired into the Node process in any way. It's run manually (or via an external OS scheduler not present in this repo) as two separate scripts per source:

1. **Scrape** → writes a local JSON file: `python drishti_ias_scraper.py [--date DD-MM-YYYY]` or `python gktoday_scraper.py`.
2. **Dump** → reads that JSON and upserts into Mongo: `python drishti_dump.py` / `python gktoday_dump.py`.

**Sources scraped:**
| Source | URL pattern | Method |
|---|---|---|
| Drishti IAS | `drishtiias.com/current-affairs-news-analysis-editorials/news-analysis/{DD-MM-YYYY}` | `requests` + BeautifulSoup |
| GKToday | `gktoday.in/current-affairs/` (up to 3 listing pages) | headless Chromium via Crawl4AI |

**What gets written** — both dump scripts connect with `pymongo` straight to the `mongoDB_URL` from the same `.env` the Node backend uses, and upsert into the **same `currentaffairs` collection** the API serves, keyed by `url` (dedup). They only ever process articles dated **today** — running the dump script against a stale JSON file is a no-op. Fields written:

```json
{
  "title": "...", "content": "...", "summary": "",
  "date": "<midnight UTC of the article's date>",
  "category": "General",       // GKToday fills the real category instead
  "category_link": "",         // GKToday fills this
  "tags": ["..."],
  "image": "",                 // GKToday fills this from image_link
  "url": "...", "source": "...", "source_link": "...",
  "isPublished": true, "isActive": true
}
```
plus `createdAt`/`views: 0` on first insert only.

**Frontend-relevant gotchas:**
- Scraped articles are **auto-published with no review step** (`isPublished: true` immediately) — unlike admin-created articles, which default `isPublished` to `false`. If you need a "pending review" queue in the UI, there isn't one for scraped content.
- Scraped articles never set `createdBy` (it's left `undefined`), so `data.createdBy` being absent is a reasonable (not guaranteed) signal that an article is scraper-sourced rather than admin-authored.
- Drishti-sourced articles always have `category: "General"` (the source site has no category concept) and empty `summary` — don't assume every "General" article is uncategorized-by-choice; it may just mean "came from Drishti." **`image` is always `""` for Drishti articles** (the scraper never extracts one) — the frontend must render a fallback/placeholder image for these, not treat the empty string as an error state.
- GKToday-sourced articles get real `category`/`category_link` values, and usually an `image` too — but ⚠️ **that `image` is a full absolute external URL on the `gktoday.in` domain** (their own WordPress media host, typically under `/wp-content/uploads/...`), **not** a backend-relative `/uploads/...` path like every other image field in this API. Render it as-is; do **not** prepend the API base URL to it, or you'll get a broken, double-prefixed URL. It can still legitimately come back `""` if that particular article's image extraction failed, so keep the same placeholder fallback as Drishti as a safety net.
- If articles you expect from a given day never appear, it's almost certainly because nobody ran the two scripts that day — there's no automatic schedule to check.

---

## 10. Media (admin only) — `/api/admin/media`

### POST `/api/admin/media/upload` — `multipart/form-data`
**Form fields**: `file` (required — field name must be exactly `file`), `usedInRefType` (optional enum `Test|Question|Page|TestSeries|CurrentAffairs|Category`), `usedInRefId` (optional ObjectId string).
**Success — 201**: `{ "success": true, "message": "File uploaded", "data": { "_id":"...", "url":"/uploads/<file>", "type":"image", "mimeType":"...", "size":12345 } }`
**Errors**: 400 `{ "success": false, "message": "No file uploaded" }`. ⚠️ Unsupported file type comes back as a **500**, not 400 (see File uploads section above).

### GET `/api/admin/media?type=&usedInRefType=`
`type` optional enum `image|video|document`.
**Success — 200**: `{ "success": true, "count": N, "data": [{ ...media... }] }`

### DELETE `/api/admin/media/:id` (hard delete — also removes the file from disk, best-effort)
**Success — 200**: `{ "success": true, "message": "Media deleted" }`
**Errors**: 404 `{ "success": false, "message": "Media not found" }`

---

## 11. Pages — `/api/pages` (public, no auth) & `/api/admin/pages` (admin)

### GET `/api/pages/:slug` (public)
Only ever returns pages with `status:"published"` — drafts return 404 even to admins via this endpoint.
**Success — 200**: `{ "success": true, "data": { "slug":"about-us", "title":"About Us", "content": "...", "status":"published" } }`
**Errors**: 404 `{ "success": false, "message": "Page not found" }`

### GET `/api/admin/pages?status=` (admin)
`status` optional enum `draft|published`.
**Success — 200**: `{ "success": true, "count": N, "data": [{ ...pages, sorted by updatedAt desc... }] }`

### POST `/api/admin/pages` (admin)
**Body**: `{ "slug": "about-us", "title": "About Us", "content": "<p>...</p>", "status": "published" }` (`slug`, `title` required; `content` can be a string or structured object; `status` defaults `"draft"`)
**Success — 201**: `{ "success": true, "message": "Page created", "data": { ...page... } }`
**Errors**: 400 `{ "success": false, "message": "A page with this slug already exists" }` (explicit pre-check on create only — not re-checked on update)

### PATCH `/api/admin/pages/:id` (admin)
Any subset of `slug/title/content/status`.
**Success — 200**: `{ "success": true, "message": "Page updated", "data": { ...page... } }`
**Errors**: 404 `{ "success": false, "message": "Page not found" }`

### DELETE `/api/admin/pages/:id` (admin, hard delete)
**Success — 200**: `{ "success": true, "message": "Page deleted" }`
**Errors**: 404 `{ "success": false, "message": "Page not found" }`

---

## 12. Settings — `/api/settings` (public) & `/api/admin/settings` (admin)

### GET `/api/settings` (public, no auth)
Singleton document, auto-created with defaults on first call.
**Success — 200**: `{ "success": true, "data": { "siteName":"GovtPrep", "logo":"", "contactEmail":"", "socialLinks":{}, "maintenanceMode":false } }`

### PUT `/api/admin/settings` (admin)
**Body** (all optional, only provided keys applied): `{ "siteName": "GovtPrep", "contactEmail": "support@govtprep.com", "socialLinks": { "facebook":"https://facebook.com/govtprep" }, "maintenanceMode": false }`
**Success — 200**: `{ "success": true, "message": "Settings updated", "data": { ...settings... } }`

---

## 13. Notifications — `/api/notifications` (auth, any role) & `/api/admin/notifications` (admin)

### GET `/api/notifications/me?limit=` (default 50)
Returns notifications targeted at the user **plus** broadcasts (`user: null`). For broadcasts, `isRead` is computed per-request from server-side `readBy` membership (the raw `readBy` array itself is never sent to the client).
**Success — 200**: `{ "success": true, "count": N, "unreadCount": 3, "data": [{ "_id":"...", "title":"...", "message":"...", "type":"info", "isRead": false, "createdAt":"..." }] }`

### PATCH `/api/notifications/:id/read`
**Success — 200**: `{ "success": true, "message": "Marked as read" }` (no `data`) — idempotent for broadcasts.
**Errors**
- 404 `{ "success": false, "message": "Notification not found" }`
- 403 `{ "success": false, "message": "Forbidden" }` (not the recipient and not a broadcast)

### POST `/api/admin/notifications` (admin)
**Body**: `{ "userId": "<ObjectId or omit for broadcast>", "title": "New mock test available", "message": "SSC CGL Tier 1 mock test is now live.", "type": "info" }` (`title`, `message` required; `type` optional enum `info|reminder|result|offer|system`, default `"info"`). Omit/falsy `userId` → broadcast to all users.
**Success — 201**: `{ "success": true, "message": "Notification sent", "data": { ...notification... } }`
**Errors**: 400 `{ "success": false, "message": "title and message are required" }`

### GET `/api/admin/notifications?limit=` (admin, default 100)
Returns raw `isRead`/`readBy` fields unmodified (unlike the `/me` endpoint), `user` populated with `name, email`.
**Success — 200**: `{ "success": true, "count": N, "data": [{ ...notifications... }] }`

---

## 14. Search — `/api/search?q=` (auth required, any role)

Case-insensitive regex search across Categories, Tests, TestSeries, CurrentAffairs (10 results per type max).
**Success — 200**
```json
{
  "success": true, "query": "history", "totalResults": 7,
  "data": {
    "categories": [{ "name":"...", "slug":"...", "image":"..." }],
    "tests": [{ "title":"...", "description":"...", "testSeries":"...", "duration":60 }],
    "testSeries": [{ "name":"...", "description":"...", "category":"..." }],
    "currentAffairs": [{ "title":"...", "summary":"...", "date":"...", "category":"..." }]
  }
}
```
**Errors**: 400 `{ "success": false, "message": "Query param q is required" }`

---

## 15. Reports (admin) — `/api/admin/reports`

### GET `/api/admin/reports?status=`
`status` optional enum `pending|reviewed|resolved`. Populates `user` (name, email), `question` (questionText), `test` (title).
**Success — 200**: `{ "success": true, "count": N, "data": [{ ...reports... }] }`

### PATCH `/api/admin/reports/:id`
**Body**: `{ "status": "resolved", "adminNote": "Verified and corrected the answer key." }` (both optional; setting `status` to anything but `"pending"` auto-sets `resolvedBy` to the acting admin)
**Success — 200**: `{ "success": true, "message": "Report updated", "data": { ...report... } }`
**Errors**: 404 `{ "success": false, "message": "Report not found" }`

(See section 2 above for the student-facing `POST /api/users/me/report-question` that creates reports.)

---

## 16. Analytics (admin) — `/api/admin/analytics/overview`

### GET `/api/admin/analytics/overview`
**Success — 200**
```json
{
  "success": true,
  "data": {
    "users": { "total":500, "students":480, "admins":2, "instructors":18, "blocked":5, "newLast7Days":30 },
    "content": { "categories":10, "testSeries":25, "tests":120, "publishedTests":100, "questions":6000, "currentAffairs":300 },
    "attempts": { "total":5000, "inProgress":50, "completed":4800, "autoSubmitted":150, "last7Days":600, "avgScorePercentage":68.42 },
    "moderation": { "pendingReports": 12 }
  }
}
```

---

## 17. Misc

### GET `/api/health`
Simple liveness check (inline handler in `app.js`, not JSON-audited above but returns 200 when the server is up).

### Unmatched routes
Any request not matching a route above returns **404**: `{ "success": false, "message": "Route not found" }`.

### Uncaught server errors
The global error handler returns `err.status || 500` with `{ "success": false, "message": err.message || "Internal server error" }`.

### No WebSocket / real-time channel
There is no `socket.io`, `ws`, or any push-based transport anywhere in this backend. Anything that feels like it should be "live" is actually poll-based server-side:
- Test attempt auto-submission on timeout: poll `GET /api/test-attempts/:id/result` (or refetch attempt status) after `expiresAt` rather than expecting a push.
- Notifications: poll `GET /api/notifications/me`, there's no server-initiated delivery.

### Path prefixes & static files
Every route in the app is mounted under `/api/...` (including `/api/health`), with exactly one exception: `/uploads/...`, served via a single `express.static` mount in `index.js` for uploaded files (see File uploads section). There is no other prefix (`/v1`, bare `/`, a served frontend build, etc.) — if a request isn't under one of those two, it 404s.

---

## Background job affecting attempt state

A `setInterval`-based sweep (`cron/autoSubmitJob.js`) runs every 60 seconds and auto-submits any `in-progress` `TestAttempt` whose `expiresAt` has passed, setting `status: "auto-submitted"`. This happens **without any client request** — if a user is mid-test and their timer runs out, poll `GET /api/test-attempts/:id/result` (or refetch attempt status) shortly after `expiresAt` rather than assuming the attempt is still `in-progress` until an explicit submit call succeeds. Treat `completed` and `auto-submitted` identically in all UI (results screen, leaderboard, attempt history) — both mean "graded, final". ⚠️ The sweep only ever queries `status: "in-progress"`, so a `paused` attempt is automatically skipped by this job too — consistent with the pause/resume feature's guarantee that a paused attempt never auto-submits while paused (see "Pause / Resume" under Test Attempts).

---

## Reference: enums

| Field | Values |
|---|---|
| `User.role` | `student`, `instructor`, `admin` |
| `TestAttempt.status` | `in-progress`, `paused`, `completed`, `auto-submitted` |
| `Report.status` | `pending`, `reviewed`, `resolved` |
| `Notification.type` | `info`, `reminder`, `result`, `offer`, `system` |
| `Page.status` | `draft`, `published` |
| `Media.type` | `image`, `video`, `document` |
| `Media.usedInRefType` | `Test`, `Question`, `Page`, `TestSeries`, `CurrentAffairs`, `Category`, `null` |
| `Test.paperType` | `mock`, `previous_year` |
