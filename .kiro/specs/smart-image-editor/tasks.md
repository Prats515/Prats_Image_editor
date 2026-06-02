# Implementation Plan: Smart AI Image Editor

## Overview

Implement the Smart AI Image Editor as a Next.js 14 (App Router) web platform. The build proceeds in layers: project scaffolding and shared types first, then backend API routes, then frontend components, then wiring them together into the full pipeline. Property-based tests (using `fast-check` + Vitest) are placed immediately after the code they validate to catch errors early.

## Tasks

- [x] 1. Project scaffolding and shared type definitions
  - Bootstrap Next.js 14 App Router project with TypeScript; install `fast-check`, `vitest`, `sharp`, `zod`, and `@aws-sdk/client-s3` (for R2 S3-compatible access)
  - Create `app/`, `app/editor/`, `app/components/`, and `app/api/` directory structure matching the design
  - Define all shared TypeScript interfaces in `lib/types.ts`: `IntentRecord`, `ClarifyingQuestion`, `ClarificationAnswer`, `StyleDNA`, `HistoryEntry`, `Session`, `InpaintState`, `ReferenceFile`
  - Create `vitest.config.ts` with `globals: true`, `environment: 'node'`, `include: ['**/*.{test,prop,spec}.ts']`
  - _Requirements: 10.1_


- [x] 2. Validation utilities and property tests
  - [x] 2.1 Implement all pure validation functions in `lib/validators.ts`
    - `validatePromptLength(s: string): boolean` — accepts 1–2000 chars (Property 1)
    - `validateReferenceFileCount(files: ReferenceFile[]): boolean` — accepts 1–5 files (Property 2)
    - `validateReferenceFile(file: ReferenceFile): boolean` — size ≤ 10 MB AND MIME in allowed set (Property 3)
    - `validateOtherAnswer(s: string): boolean` — trimmed length 1–200 chars (Property 9)
    - `validateEnhancedPromptFieldLength(s: string): boolean` — ≤ 4000 chars (Property 13)
    - `validateBrushSize(n: number): boolean` — integer 5–100 inclusive (Property 20)
    - `validateMaskDataUrl(s: string): boolean` — starts with `data:image/png;base64,` (Property 22)
    - `validateInpaintRequestBody(body: unknown): boolean` — all three fields present and valid (Property 22)
    - `mapModeToModel(mode: "fast" | "quality"): string` — returns correct FLUX model ID (Property 14)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 3.5, 5.6, 8.3, 8.5, 6.3, 6.4_

  - [ ]* 2.2 Write property tests for prompt and file validators
    - **Property 1: Casual Prompt Length Enforcement** — `fc.string()` covering empty, length 1, length 2000, length 2001
    - **Property 2: Reference File Count Enforcement** — `fc.array()` with sizes 0, 1–5, 6+
    - **Property 3: Reference File Size and Format Validation** — arbitrary size + MIME combos
    - **Property 13: Enhanced Prompt Field Length Cap** — strings at 4000 and 4001 chars
    - File: `__tests__/validation/promptInput.prop.ts`, `__tests__/validation/referenceFiles.prop.ts`
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 5.6_

  - [ ]* 2.3 Write property tests for answer and inpainting validators
    - **Property 9: "Other" Field Validation** — empty string, 1-char, 200-char, 201-char
    - **Property 20: Inpainting Brush Size Range Enforcement** — integers at 4, 5, 100, 101
    - **Property 22: Inpainting Request Body Completeness** — arbitrary objects with missing/invalid fields
    - File: `__tests__/clarification/questions.prop.ts`, `__tests__/inpainting/maskOps.prop.ts`
    - _Requirements: 3.5, 8.3, 8.5_

  - [ ]* 2.4 Write property test for generation mode mapping
    - **Property 14: Generation Mode to Model Mapping** — only `"fast"` and `"quality"` map to valid models; any other string returns 400
    - File: `__tests__/generation/modeMapping.prop.ts`
    - _Requirements: 6.3, 6.4_


- [x] 3. Session API route and session utilities
  - [x] 3.1 Implement `lib/session.ts` with `createSession()`, `getSession()`, `updateSessionActivity()`, and `deleteSession()` functions that read/write `Session` objects to R2 at `sessions/{sessionId}/session.json`
    - Set HTTP-only secure cookie: `HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
    - `updateSessionActivity` re-issues `Set-Cookie` header to slide the 24 h window
    - _Requirements: 9.1, 9.2, 9.5_

  - [x] 3.2 Implement `app/api/session/route.ts` (`POST /api/session`)
    - If cookie absent or expired → `createSession()`, return `{ sessionId, isNew: true, historyCount: 0 }`
    - If cookie valid → `getSession()`, load entry count from `session.json`, return `{ sessionId, isNew: false, historyCount }`
    - _Requirements: 9.1, 9.3, 9.4_

  - [ ]* 3.3 Write unit tests for session route
    - Test new session creation, session restoration, expired session creates new session, cookie attributes
    - File: `__tests__/api/session.test.ts`
    - _Requirements: 9.1–9.7_


- [x] 4. Intent analysis API route
  - [x] 4.1 Implement `lib/groq.ts` with a `callGroq(messages, timeoutMs)` helper that wraps the Groq API with a 30 s `AbortSignal`, one retry after 2 s on failure, and throws a typed `GroqError` on second failure
    - _Requirements: 4.4, 10.6_

  - [x] 4.2 Implement `app/api/analyze/route.ts` (`POST /api/analyze`)
    - Validate request: `prompt` ≤ 2000 chars, `referenceFiles` 0–5 items each ≤ 10 MB with allowed MIME; return 400 with field details on failure (Property 25)
    - Reject payloads > 15 MB with 413 (Property 27)
    - Build system prompt instructing Llama 3.3 70B to return a strict `IntentRecord` JSON
    - When `referenceFiles` present, augment the structured attributes; Reference_Input values take precedence (Property 5)
    - Validate response with Zod against `IntentRecord` schema; retry once with explicit JSON instruction if malformed
    - If `primarySubject === null`, return HTTP 422 `{ error: "no_primary_subject" }` (Property 6)
    - Return `{ intentRecord, hasAmbiguities }` as JSON
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.5_

  - [ ]* 4.3 Write property tests for IntentRecord structure
    - **Property 4: IntentRecord Structural Completeness** — for arbitrary prompts, all five keys always present, value is string or null
    - **Property 5: Reference Input Attribute Precedence** — when both prompt and reference have non-null values, reference wins
    - **Property 6: No-Primary-Subject Pipeline Guard** — when `primarySubject` is null, returns error, never calls downstream
    - File: `__tests__/analysis/intentRecord.prop.ts`
    - _Requirements: 2.2, 2.3, 2.5_

  - [ ]* 4.4 Write property tests for API validation and payload guard
    - **Property 25: API Input Validation Returns 400 with Field Details** — arbitrary bad inputs return 400 + field name
    - **Property 27: Payload Size Guard Returns 413** — payloads > 15 MB return 413 before any external call
    - File: `__tests__/api/validation.prop.ts`
    - _Requirements: 10.2, 10.5_


- [x] 5. Clarification engine API route
  - [x] 5.1 Implement `app/api/clarify/route.ts` (`POST /api/clarify`)
    - Validate `intentRecord` matches `IntentRecord` schema; return 400 on failure
    - Build system prompt instructing the LLM to return exactly 2–3 `ClarifyingQuestion` objects, each with a distinct `attribute`, and `options` array of 3–5 items
    - Validate response with Zod: array length 2–3, all `attribute` values distinct, each `options` array 3–5 items
    - Return `{ questions: ClarifyingQuestion[] }`
    - _Requirements: 3.1, 3.4, 3.6, 10.1, 10.2_

  - [ ]* 5.2 Write property tests for clarifying questions
    - **Property 7: Clarifying Question Count and Attribute Uniqueness** — length 2 or 3, all attributes distinct
    - **Property 8: Clarifying Question Option Count** — every question's `options` array has 3–5 items
    - File: `__tests__/clarification/questions.prop.ts`
    - _Requirements: 3.1, 3.4, 3.6_

  - [ ]* 5.3 Write unit tests for clarification skip logic
    - Test that when `hasAmbiguities === false`, `/api/clarify` is never called and pipeline proceeds to enhance
    - Test that "Approve" button is disabled until all question cards have a selection
    - File: `__tests__/pipeline/clarificationSkip.test.ts`
    - _Requirements: 3.2, 3.3_


- [x] 6. Prompt enhancement API route
  - [x] 6.1 Implement `lib/styleDna.ts` with `buildStyleDnaSystemPrompt(styleDNA: StyleDNA): string` that injects all four StyleDNA attributes into the system prompt string for the Groq call (Property 11)
    - Also implement `fallbackStyleDNA(finalPrompt: string): StyleDNA` that extracts color words via regex and uses defaults for other fields
    - _Requirements: 4.3, 7.1, 7.2_

  - [x] 6.2 Implement `app/api/enhance/route.ts` (`POST /api/enhance`)
    - Validate `intentRecord`, `clarificationAnswers`, optional `styleDNA`, optional `isInpainting` flag
    - When `styleDNA` is present, call `buildStyleDnaSystemPrompt()` and include all four attributes in the Groq system prompt (Property 11)
    - When `isInpainting === true`, append explicit "only modify the masked region; preserve everything outside the mask" clause to the system prompt (Property 23)
    - Call Groq with 15 s timeout; retry once after 2 s on failure; on second failure return user to clarification step with answers preserved (Req 4.4)
    - Validate response: Enhanced_Prompt is a string of 50–500 chars (Property 10)
    - Return `{ enhancedPrompt: string }`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 8.8, 10.1, 10.2_

  - [ ]* 6.3 Write property tests for prompt enhancement
    - **Property 10: Enhanced Prompt Length Bounds** — output always 50–500 chars
    - **Property 11: StyleDNA Injection in Enhanced Prompt** — when StyleDNA present, all four attribute values appear in the system prompt string
    - **Property 12: Approved Prompt Is Final Prompt** — the value typed in review field equals `finalPrompt` in POST body
    - File: `__tests__/enhancement/promptEnhancer.prop.ts`
    - _Requirements: 4.2, 4.3, 7.2, 5.4_

  - [ ]* 6.4 Write unit tests for content policy and retry logic
    - Test Groq 451 content policy violation returns error message, blocks generation
    - Test retry once after 2 s then failure preserves clarification answers
    - File: `__tests__/api/contentPolicy.test.ts`, `__tests__/api/retryLogic.test.ts`
    - _Requirements: 4.4, 4.5_


- [ ] 7. Image generation API route and R2 storage
  - [x] 7.1 Implement `lib/r2.ts` with typed helpers: `putObject`, `getObject`, `deleteObject`, `listObjects` wrapping the S3-compatible R2 client
    - Key conventions: `sessions/{sessionId}/history/{entryId}/image.png`, `thumbnail.jpg`, `metadata.json`, `session.json`
    - `putObject` retries once after 500 ms on failure; `getObject` (for history restore) returns null on failure with no retry
    - _Requirements: 6.6, 7.5, 9.5, 10.4_

  - [x] 7.2 Implement `lib/thumbnail.ts` using `sharp` to resize source PNG to 160×160 JPEG server-side
    - _Requirements: 7.3_

  - [-] 7.3 Implement `app/api/generate/route.ts` (`POST /api/generate`)
    - Validate `finalPrompt` ≤ 4000 chars and `mode` is `"fast"` or `"quality"`; reject 400 otherwise
    - Call `mapModeToModel()` to select FLUX model; call Cloudflare Workers AI with 30 s timeout; retry once after 2 s
    - On success: call `computeStyleDNA(finalPrompt)` via Groq (retry 1×, 1 s delay); use `fallbackStyleDNA()` if Groq fails
    - Generate 160×160 JPEG thumbnail with `sharp`
    - Enforce 50-entry cap: if `session.entryCount >= 50`, delete oldest entry's three R2 objects before writing new entry
    - Write `image.png`, `thumbnail.jpg`, `metadata.json` to R2; update `session.json` incrementing `entryCount`
    - Return `{ historyEntryId, imageUrl, styleDNA }` with signed R2 URL (24 h expiry)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 7.1, 7.7, 10.1, 10.2_

  - [ ]* 7.4 Write property tests for history operations and metadata round-trip
    - **Property 15: History Entry Append Invariant** — count increases by exactly 1, new entry is last chronologically
    - **Property 16: Generated Metadata Round-Trip Completeness** — `metadata.json` contains exact `finalPrompt` as `enhancedPrompt`, StyleDNA has 3–8 `dominantColors`, all string fields non-empty
    - **Property 17: Edit History Chronological Sort** — sort function always returns entries in ascending `createdAt` order
    - **Property 19: Edit History FIFO Eviction at Capacity** — at 50 entries, oldest is removed, new entry present, total stays 50
    - File: `__tests__/history/historyOps.prop.ts`, `__tests__/generation/metadata.prop.ts`
    - _Requirements: 6.6, 6.8, 7.1, 7.3, 7.7_

  - [ ]* 7.5 Write unit tests for generation timeout and error handling
    - Test 60 s UI timeout shows error with retry option (client-side AbortController 65 s)
    - Test Cloudflare Workers AI error triggers one retry, then shows "Try Again" without clearing prompt review
    - File: `__tests__/components/generationTimeout.test.ts`, `__tests__/api/retryLogic.test.ts`
    - _Requirements: 6.5, 6.7_


- [ ] 8. Edit history API route
  - [x] 8.1 Implement `app/api/history/route.ts` (`GET /api/history`)
    - Read `sessionId` from cookie; list all `sessions/{sessionId}/history/*/metadata.json` objects from R2
    - Parse each into `HistoryEntry`; generate signed R2 URLs (24 h) for `imageUrl` and thumbnail
    - Sort entries by `createdAt` ascending and return `{ entries: HistoryEntry[] }`
    - On R2 read failure, return empty array (no retry per design)
    - _Requirements: 7.3, 7.4, 7.5, 9.3_

  - [ ]* 8.2 Write property test for history context restoration
    - **Property 18: History Context Restoration Round-Trip** — selecting any HistoryEntry restores `casualPrompt`, `enhancedPrompt`, `styleDNA` exactly, no transformation
    - File: `__tests__/history/historyOps.prop.ts`
    - _Requirements: 7.4_


- [ ] 9. Inpainting API route
  - [-] 9.1 Implement `app/api/inpaint/route.ts` (`POST /api/inpaint`)
    - Validate `sourceImageKey` (non-empty string), `maskDataUrl` (valid PNG data URL), `finalPrompt` (non-empty, ≤ 4000 chars), `mode`; return 400 with field details on failure (Property 22, 25)
    - Download source image from R2 using `sourceImageKey`
    - Convert `maskDataUrl` to `ArrayBuffer`; forward source image + mask + prompt to Cloudflare Workers AI img2img endpoint
    - Apply same retry (1×, 2 s), StyleDNA computation, thumbnail generation, and R2 write as `/api/generate`
    - On failure after retry: return error allowing resubmit without clearing mask or prompt
    - Return `{ historyEntryId, imageUrl, styleDNA }`
    - _Requirements: 8.5, 8.9, 10.1, 10.2_

  - [ ]* 9.2 Write property test for inpainting prompt scope
    - **Property 23: Inpainting Prompts Are Scope-Limited** — system prompts for both analyzer and enhancer contain scope-limiting language; final Enhanced_Prompt states only masked region modified, content outside mask preserved
    - File: `__tests__/inpainting/promptScope.prop.ts`
    - _Requirements: 8.6, 8.7, 8.8_

  - [ ]* 9.3 Write property tests for mask operations
    - **Property 21: Clear Mask Produces All-Transparent Canvas** — after `clearMask()`, every pixel alpha = 0 regardless of initial state
    - **Property 24: Small Mask Warning Threshold** — warning triggers if and only if `maskCoverage < 0.01`
    - File: `__tests__/inpainting/maskOps.prop.ts`
    - _Requirements: 8.4, 8.10_

  - [ ]* 9.4 Write unit tests for inpainting tool behaviors
    - Test "Edit a specific area" option activates InpaintingTool; brush pointer events produce mask paint; "Clear Mask" resets canvas
    - Test small-mask warning dialog: confirm proceeds, decline returns to tool with mask intact
    - File: `__tests__/components/inpaintingTool.test.ts`
    - _Requirements: 8.1, 8.2, 8.9_


- [x] 10. API middleware: error handling, timeout, and payload guard
  - [x] 10.1 Implement `lib/apiMiddleware.ts` with shared middleware applied to all routes
    - `payloadSizeGuard`: rejects requests > 15 MB with HTTP 413 + JSON error before any processing (Property 27)
    - `globalErrorHandler`: catches unhandled exceptions, logs `{ requestId, errorType, timestamp }` server-side, returns HTTP 500 with generic message (no stack trace, no file paths)
    - `timeoutGuard`: wraps all outbound `fetch()` calls to Groq and Cloudflare with a 30 s `AbortSignal`; returns 504 on timeout
    - All routes use `Content-Type: application/json` on every response (Property 26)
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 10.2 Write property test for JSON response guarantee
    - **Property 26: All API Responses Are Valid JSON** — for any input (valid or invalid) to any route, response body is parseable JSON with correct Content-Type
    - File: `__tests__/api/validation.prop.ts`
    - _Requirements: 10.3_

  - [ ]* 10.3 Write unit tests for error sanitization and timeout
    - Test 500 response contains no stack trace, file path, or env var values
    - Test 504 returned after 30 s external timeout
    - File: `__tests__/api/errorSanitization.test.ts`, `__tests__/api/timeoutHandling.test.ts`
    - _Requirements: 10.4, 10.6_

- [~] 11. Checkpoint — API layer complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. Editor context, step machine, and root layout
  - [~] 12.1 Implement `lib/EditorContext.tsx` with React context providing the step machine state
    - Steps: `IDLE → ANALYZING → CLARIFYING → ENHANCING → REVIEWING → GENERATING → DONE`
    - State includes: `currentStep`, `casualPrompt`, `referenceFiles`, `intentRecord`, `clarifyingQuestions`, `clarificationAnswers`, `enhancedPrompt`, `finalPrompt`, `generationMode`, `currentImage`, `editHistory`, `inpaintState`, `sessionId`
    - Expose actions: `setStep()`, `setPrompt()`, `setFiles()`, `setIntentRecord()`, `setQuestions()`, `setAnswers()`, `setEnhancedPrompt()`, `setMode()`, `appendHistory()`, `restoreFromHistory()`, `setInpaintState()`
    - _Requirements: 7.4, 9.3_

  - [~] 12.2 Implement `app/layout.tsx` that bootstraps a session on mount via `POST /api/session`, stores `sessionId`, and loads Edit_History via `GET /api/history`
    - _Requirements: 9.1, 9.2, 9.3_

  - [~] 12.3 Implement `app/editor/page.tsx` as the main editor shell rendering the step-appropriate panel from `EditorContext`
    - _Requirements: 9.3_


- [ ] 13. PromptInput component
  - [~] 13.1 Implement `app/components/PromptInput/PromptInput.tsx`
    - `<textarea>` wired to `EditorContext` `casualPrompt`; enforces `maxLength=2000`; shows `CharCounter` turning red at limit
    - File drop zone accepts JPEG, PNG, WebP, PDF, TXT; validates MIME and size client-side before accepting
    - "Submit" button disabled until prompt has at least 1 non-whitespace character
    - "Clear" / "Start Over" control removes prompt text and all Reference_Inputs from session state
    - Calls `POST /api/analyze` with `AbortController` 20 s timeout on submit
    - _Requirements: 1.1, 1.6_

  - [~] 13.2 Implement `app/components/PromptInput/FilePreview.tsx`
    - Image files: display thumbnail ≥ 80×80 px
    - Document files: display filename + file type chip
    - Reject with inline `ErrorBanner`: >10 MB shows file size + limit message; unsupported format lists allowed formats
    - _Requirements: 1.3, 1.4, 1.5_


- [ ] 14. ClarificationPanel component
  - [~] 14.1 Implement `app/components/ClarificationPanel/QuestionCard.tsx`
    - Renders one `ClarifyingQuestion` as radio button options (3–5 choices) plus an "Other" toggle
    - When "Other" is selected, show a text input capped at 200 chars; disable "Submit Answers" if "Other" field is empty
    - _Requirements: 3.4, 3.5_

  - [~] 14.2 Implement `app/components/ClarificationPanel/ClarificationPanel.tsx`
    - Renders 2–3 `QuestionCard` components
    - "Submit Answers" button disabled until every card has a selection (including non-empty "Other" values)
    - On submit: calls `POST /api/enhance` with `AbortController` 20 s timeout; advances step to `ENHANCING`
    - _Requirements: 3.3, 3.4_


- [ ] 15. PromptReview component
  - [~] 15.1 Implement `app/components/PromptReview/PromptReview.tsx`
    - Read-only field showing original `casualPrompt`; editable textarea for `enhancedPrompt` (max 4000 chars with `CharCounter`)
    - "Approve & Generate" button enabled only when `enhancedPrompt.trim().length > 0` AND `!isRegenerating`
    - On approve: passes the current value of the editable field as `finalPrompt` to `POST /api/generate` (Property 12)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [~] 15.2 Implement `app/components/PromptReview/ModeSelector.tsx`
    - Radio toggle between "Fast" (default, FLUX.1-schnell) and "Quality" (FLUX.1-dev) with descriptive labels per requirements
    - _Requirements: 6.2_

  - [~] 15.3 Implement `app/components/PromptReview/RegenerateButton.tsx`
    - On click: sets `isRegenerating = true`, clears `enhancedPrompt`, disables "Approve & Generate", re-calls `POST /api/enhance` with same intent + answers, re-enables on response
    - _Requirements: 5.5_

  - [ ]* 15.4 Write unit tests for PromptReview component
    - Test "Approve & Generate" is disabled when enhancedPrompt is empty or isRegenerating is true
    - Test "Regenerate" clears prompt, disables approve button, re-enables on response
    - Test edited text in review field is the value sent as `finalPrompt`
    - File: `__tests__/components/promptReview.test.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.5_


- [ ] 16. ImageViewer and EditHistory components
  - [~] 16.1 Implement `app/components/ImageViewer/ImageViewer.tsx` and `GenerationOverlay.tsx`
    - Display generated PNG image with overlay controls ("Edit a specific area", "New Edit from this image")
    - Show `LoadingSpinner` during generation; show timeout error at 60 s with retry option
    - _Requirements: 6.5_

  - [~] 16.2 Implement `app/components/EditHistory/EditHistoryPanel.tsx` and `HistoryThumb.tsx`
    - Horizontal thumbnail timeline in chronological order (oldest → newest); each thumbnail is 160×160 px
    - Clicking a thumbnail restores `casualPrompt`, `enhancedPrompt`, `styleDNA` into `EditorContext` (Property 18)
    - _Requirements: 7.3, 7.4, 7.5_


- [ ] 17. InpaintingTool component
  - [~] 17.1 Implement `app/components/InpaintingTool/MaskCanvas.tsx`
    - HTML5 Canvas overlay on top of source image; `pointerdown/pointermove/pointerup` draw semi-transparent red filled circles at brush position
    - After each stroke, compute `maskCoverage` = non-transparent pixels ÷ total pixels and write to `InpaintState`
    - _Requirements: 8.2, 8.3_

  - [~] 17.2 Implement `app/components/InpaintingTool/BrushSizeSlider.tsx`
    - Range input 5–100 px; updates `brushSize` in `InpaintState`; validates value on change with `validateBrushSize()` (Property 20)
    - _Requirements: 8.3_

  - [~] 17.3 Implement `app/components/InpaintingTool/InpaintingTool.tsx`
    - Wraps source image + `MaskCanvas` + `BrushSizeSlider`
    - "Clear Mask" button calls `ctx.clearRect()` on the mask canvas, resetting all pixels to alpha=0 (Property 21)
    - "Submit" button: if `maskCoverage < 0.01`, show confirmation dialog; if confirmed, call `POST /api/inpaint` with `maskDataUrl` + `sourceImageKey` + `finalPrompt` (Property 24)
    - Client-side `AbortController` 65 s timeout on inpaint fetch
    - _Requirements: 8.1, 8.4, 8.5, 8.9, 8.10_


- [ ] 18. Shared components and error display
  - [~] 18.1 Implement `app/components/shared/ErrorBanner.tsx`, `LoadingSpinner.tsx`, and `CharCounter.tsx`
    - `ErrorBanner`: compact (inline, beneath field) and full-width (step-level) variants
    - `CharCounter`: shows remaining characters; turns red at limit
    - Add a root error boundary in `app/layout.tsx` for fatal errors (e.g., session creation failure) with a "Reload" button
    - _Requirements: 1.1, 1.4, 1.5, 10.4_

- [ ] 19. Pipeline wiring and pipeline ordering tests
  - [~] 19.1 Wire all pipeline steps in `app/editor/page.tsx` and `EditorContext`
    - Ensure analyze runs before enhance and review runs before generate; step machine enforces order
    - When `hasAmbiguities === false` from `/api/analyze`, skip `CLARIFYING` step and advance directly to `ENHANCING`
    - When User selects a HistoryEntry for new edit, pre-populate `EditorContext` with that entry's `styleDNA`, `casualPrompt`, `enhancedPrompt`; feed `styleDNA` to `/api/enhance` on next submission
    - _Requirements: 2.1, 2.4, 3.2, 5.1, 7.2, 7.4_

  - [ ]* 19.2 Write unit tests for pipeline ordering
    - Test analyze is called before enhance; review gate prevents generate without approval
    - Test clarification is skipped when `hasAmbiguities === false`
    - File: `__tests__/pipeline/ordering.test.ts`, `__tests__/pipeline/clarificationSkip.test.ts`
    - _Requirements: 2.1, 2.4, 3.2, 5.1_

- [ ] 20. Session expiry cron job
  - [~] 20.1 Implement `app/api/cron/cleanup/route.ts` (`GET /api/cron/cleanup`)
    - List all `sessions/*/session.json` objects in R2
    - Parse `lastActiveAt`; delete entire `sessions/{sessionId}/` prefix for sessions older than 24 h
    - Secure the route with a `CRON_SECRET` environment variable check (Bearer token)
    - Configure in `vercel.json` as a daily cron (free-tier: 1 invocation/day)
    - _Requirements: 7.6, 9.7_

- [~] 21. Final checkpoint — full system integration
  - Ensure all unit, property, and integration tests pass (`vitest --run`), ask the user if questions arise.


## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements and design properties for full traceability
- Property-based tests use `fast-check` with Vitest (`vitest --run` for CI single-pass execution)
- Unit tests cover integration points, retry logic, and UI behaviors not amenable to PBT
- All API keys live exclusively in Next.js API routes — never in client-side code (Req 10.1)
- The step machine in `EditorContext` strictly enforces pipeline ordering, eliminating a class of integration bugs
- Checkpoints at tasks 11 and 21 ensure incremental validation at API-layer and full-system boundaries

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "4.1", "7.1", "7.2", "10.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "3.1", "4.2", "5.1", "6.1"] },
    { "id": 3, "tasks": ["3.2", "4.3", "4.4", "5.2", "5.3", "6.2", "7.3", "8.1", "9.1"] },
    { "id": 4, "tasks": ["3.3", "6.3", "6.4", "7.4", "7.5", "8.2", "9.2", "9.3", "9.4", "10.2", "10.3"] },
    { "id": 5, "tasks": ["12.1", "12.2", "12.3"] },
    { "id": 6, "tasks": ["13.1", "13.2", "14.1", "14.2", "15.1", "15.2", "15.3", "16.1", "16.2", "17.1", "17.2", "18.1"] },
    { "id": 7, "tasks": ["15.4", "17.3", "19.1", "20.1"] },
    { "id": 8, "tasks": ["19.2"] }
  ]
}
```
