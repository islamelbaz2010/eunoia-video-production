# EES-003: Publishing

| Field | Value |
|-------|-------|
| **ID** | EES-003 |
| **Title** | Publishing |
| **Status** | Draft |
| **Owner** | Engineering |
| **Last Updated** | 2026-06-29 |

---

## 1. Mission

Deliver creator content to the right platforms, at the right time, with the right metadata — consistently, at scale, and with full visibility into the status of every publish operation from submission through live confirmation.

---

## 2. Business Goal

Creators managing multi-platform distribution face a fragmented workflow: each platform has its own upload interface, metadata requirements, scheduling tools, and post-publish verification process. The overhead compounds as channel count grows. Errors — missing tags, incorrect thumbnails, misaligned publish times — are costly and difficult to reverse once content is live.

The Publishing system centralises distribution into a single operation: the creator confirms metadata via EES-002, selects platforms and schedule, and the system handles all platform-specific adaptation, upload, scheduling, and post-publish verification. The goal is to reduce the time spent on distribution mechanics per video from an average of 45 minutes to under 5 minutes, while eliminating platform-specific errors through structured metadata validation before upload.

---

## 3. Scope

- Multi-platform publish management: YouTube, Instagram, TikTok, Twitter/X, LinkedIn (Phase 1 platforms).
- Platform-specific metadata adaptation (title truncation, description formatting, hashtag injection, aspect ratio selection).
- Scheduled publishing with timezone-aware delivery windows.
- AI-recommended publish time optimisation per platform per channel.
- Post-publish verification: confirms the content is live and accessible within expected time windows.
- Publish failure detection, retry, and creator notification.
- Cross-platform publish history with per-platform status visibility.
- Domain event publication for all publish lifecycle transitions.

---

## 4. Out of Scope

- Content moderation or platform policy compliance review. Creators are responsible for policy compliance.
- Paid promotion, ad creation, or boosted posts. Publishing covers organic distribution only.
- Comment moderation or community engagement after publish.
- Platform-specific analytics ingestion (handled by EES-004 Learning Engine).
- Live streaming scheduling or management.
- Content ownership transfer or licensing to platforms beyond what standard platform APIs require.

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| End-to-end publish time (submit to live) | < 5 minutes creator active time | Creator session timing |
| Platform delivery success rate | > 99.5% of scheduled publishes succeed on first attempt | Publish job success rate |
| Post-publish verification rate | 100% of publishes confirmed live within 30 minutes | Verification job completion rate |
| AI publish time recommendation acceptance | > 60% creator acceptance rate | Recommendation tracking |
| Metadata validation error rate pre-upload | 0% (all errors caught before submission) | Validation failure before upload vs. after |
| Cross-platform metadata consistency | 100% of publishes use creator-approved metadata variants | Audit of published content |

---

## 6. Actors

| Actor | Type | Description |
|-------|------|-------------|
| Creator | Human | Reviews platform-adapted metadata, selects platforms, sets schedule, confirms publish. |
| Publishing Orchestrator | System | Coordinates publish jobs across platforms, manages retry, publishes events. |
| Platform Connector | System | Platform-specific adapter that translates `PublishRequest` to each platform's upload API. |
| AI Schedule Optimiser | AI System | Recommends optimal publish times per platform based on audience engagement patterns. |
| Verification Agent | System | Polls platform APIs post-publish to confirm content is live. |
| Job Queue | System | Schedules and executes time-triggered publish jobs. |
| Event Bus | System | Publishes domain events on all state transitions. |
| EES-002 Media Pipeline | System | Source of accepted, publication-ready assets and metadata. |
| EES-001 Revenue Intelligence | System | Receives video publish events to correlate revenue with content. |
| EES-004 Learning Engine | System | Receives publish and post-publish verification data as performance input. |

---

## 7. Inputs

| Input | Source | Format | Trigger |
|-------|--------|--------|---------|
| Accepted video asset | EES-002 (pipeline.metadata.accepted event) | `VideoAsset` + `VideoMetadataDraft` | On creator metadata acceptance |
| Platform selection | Creator | Set of `PublishPlatform` enum values | At publish configuration |
| Publish schedule | Creator or AI recommendation | Per-platform datetime | At publish configuration |
| Platform-specific overrides | Creator | Per-platform metadata fields | Optional, at publish configuration |
| Channel platform credentials | Creator settings | OAuth tokens (stored encrypted) | Resolved at publish time |

---

## 8. Outputs

| Output | Consumer | Format | Trigger |
|--------|----------|--------|---------|
| `PublishRequest` record | Platform Connectors | `PublishRequest` entity | On creator confirmation |
| `PublishResult` record | Creator dashboard, EES-004 | `PublishResult` entity | On publish success or failure |
| Platform content URL | Creator dashboard | String | On post-publish verification |
| `publishing.scheduled` event | Event Bus | Domain event | On schedule creation |
| `publishing.started` event | Event Bus | Domain event | On publish job start |
| `publishing.succeeded` event | Event Bus | Domain event | On successful delivery |
| `publishing.failed` event | Event Bus | Domain event | On terminal failure |
| `publishing.verified` event | Event Bus | Domain event | On post-publish live confirmation |

---

## 9. Business Rules

**BR-001 — Metadata Gate:** A publish job may not be created for an asset whose metadata has not been explicitly accepted by the creator (as defined in EES-002 BR-005). The orchestrator enforces this at job creation time.

**BR-002 — Platform Credential Requirement:** A publish job may not be submitted for a platform for which the creator has not connected a valid OAuth credential. Expired credentials surface as a blocked status, not a silent failure.

**BR-003 — Metadata Adaptation Is Non-Destructive:** Platform-specific adaptations (title truncation, hashtag injection) create a derivative metadata record. The creator's approved metadata is never overwritten. Creators may review and override adaptations before confirming each platform publish.

**BR-004 — Schedule Minimum Lead Time:** Scheduled publishes must be set at least 5 minutes in the future. Same-minute scheduling is not supported due to queue processing latency.

**BR-005 — Publish Retry Policy:** Platform upload failures are retried up to 3 times with exponential backoff (initial delay 60 seconds, multiplier 2). After 3 failures, the job enters terminal failure state and the creator is notified. The asset is not marked as unrecoverable; the creator may re-trigger manually.

**BR-006 — Post-Publish Verification Window:** After a successful platform upload, the Verification Agent checks for live content availability every 3 minutes for up to 30 minutes. If the content is not confirmed live within 30 minutes, a `publishing.verification_timeout` event is published and the creator is notified. This does not indicate a failure — platform processing delays may extend beyond 30 minutes for large files.

**BR-007 — Simultaneous Platform Limit:** A single publish operation may target a maximum of 10 platforms simultaneously. This limit protects against credential quota exhaustion on any single channel.

**BR-008 — No Duplicate Active Publishes:** If a publish job for a given asset and platform combination is already active (Pending, Scheduled, or Running), a second job for the same combination is rejected. Creators must cancel the existing job before creating a new one.

---

## 10. AI Decision Flow

### 10.1 Publish Time Optimisation

**Intent:** Recommend the optimal publish time per platform to maximise early audience engagement.

**Inputs:**
- Creator's historical publish times and corresponding engagement rates per platform (from EES-004)
- Platform-specific audience activity heatmaps derived from EES-004 analytics
- Day of week and upcoming calendar events (holidays, platform events)
- Video topic category (informs audience timezone distribution)
- Current publish queue (avoids clustering with other scheduled publishes)

**Reasoning Chain:**
1. Load the creator's engagement rate matrix: publish hour × day of week × platform.
2. Identify the top 3 engagement windows per platform in the next 7 days.
3. Apply a recency bias: windows from the trailing 14 days are weighted 2× over older windows.
4. Check for calendar event proximity; apply a penalty to windows within 2 hours of major events that historically suppress engagement.
5. Apply a queue spacing rule: recommended windows are at least 2 hours apart from other scheduled publishes on the same platform.
6. Return ranked recommendations per platform with engagement score and rationale.

**Output Contract:**
```json
{
  "optimisationId": "string (uuid)",
  "assetId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "recommendations": {
    "youtube": [
      { "scheduledAt": "ISO 8601 timestamp", "engagementScore": "number", "rationale": "string" }
    ],
    "instagram": [ ],
    "tiktok": [ ]
  },
  "confidenceLevel": "high | medium | low"
}
```

---

### 10.2 Platform Metadata Adaptation

**Intent:** Transform approved metadata into platform-specific variants that comply with each platform's constraints while preserving the creator's intent.

**Inputs:**
- Approved title, description, tags, chapters from EES-002 metadata draft
- Platform-specific metadata constraints (character limits, supported fields, hashtag rules)
- Creator's platform-specific customisation preferences (e.g., "always add #shorts to TikTok")
- Channel brand guidelines

**Reasoning Chain:**
1. For each target platform, apply constraint rules: truncate title to platform limit, format description to platform conventions.
2. Select the most relevant tags from the approved tag list, within the platform's tag count limit.
3. Inject platform-required hashtags (e.g., #Shorts for YouTube Shorts).
4. Reformat chapters for platforms that support chapter markers (YouTube) and omit for those that do not.
5. Return per-platform metadata variants with a diff from the original for creator review.

**Output Contract:**
```json
{
  "adaptationId": "string (uuid)",
  "assetId": "string",
  "platforms": {
    "youtube": {
      "title": "string",
      "description": "string",
      "tags": ["string"],
      "chapters": [{ "timestampSeconds": "number", "title": "string" }],
      "diff": { "titleTruncated": "boolean", "tagsDropped": "number" }
    },
    "tiktok": {
      "caption": "string",
      "hashtags": ["string"],
      "diff": {}
    }
  }
}
```

---

## 11. Data Model

### PublishRequest

```typescript
interface PublishRequest {
  readonly id: string;
  readonly assetId: string;
  readonly channelId: string;
  readonly platforms: ReadonlyArray<PlatformPublishConfig>;
  readonly status: PublishRequestStatus;   // enum: Draft | Confirmed | Scheduled | InProgress | Completed | Failed | Cancelled
  readonly createdAt: Date;
  readonly confirmedAt: Date | null;
}

interface PlatformPublishConfig {
  readonly platform: PublishPlatform;      // enum: YouTube | Instagram | TikTok | TwitterX | LinkedIn
  readonly scheduledAt: Date;
  readonly metadata: PlatformMetadata;
  readonly status: PlatformPublishStatus;  // enum: Pending | Scheduled | Running | Succeeded | Failed | Cancelled
  readonly platformContentId: string | null;
  readonly platformContentUrl: string | null;
  readonly publishedAt: Date | null;
  readonly verifiedAt: Date | null;
  readonly attempts: number;
  readonly lastError: string | null;
}
```

### PlatformMetadata

```typescript
interface PlatformMetadata {
  readonly title: string | null;
  readonly description: string | null;
  readonly tags: ReadonlyArray<string>;
  readonly hashtags: ReadonlyArray<string>;
  readonly chapters: ReadonlyArray<Chapter>;
  readonly visibility: ContentVisibility;  // enum: Public | Unlisted | Private
  readonly thumbnailStorageKey: string | null;
  readonly platformSpecific: Record<string, unknown>;
}
```

### PublishResult

```typescript
interface PublishResult {
  readonly id: string;
  readonly publishRequestId: string;
  readonly platform: PublishPlatform;
  readonly succeeded: boolean;
  readonly platformContentId: string | null;
  readonly platformContentUrl: string | null;
  readonly publishedAt: Date | null;
  readonly verifiedLiveAt: Date | null;
  readonly failureReason: string | null;
  readonly attempts: number;
}
```

---

## 12. Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `publishing.request.created` | Creator confirms publish configuration | `{ requestId, assetId, platforms: string[] }` |
| `publishing.scheduled` | Job created for future delivery | `{ requestId, platform, scheduledAt }` |
| `publishing.started` | Upload job begins | `{ requestId, platform, assetId }` |
| `publishing.succeeded` | Platform accepts upload | `{ requestId, platform, platformContentId, publishedAt }` |
| `publishing.failed` | Job reaches terminal failure | `{ requestId, platform, lastError, attempts }` |
| `publishing.verified` | Content confirmed live by verification agent | `{ requestId, platform, platformContentUrl, verifiedLiveAt }` |
| `publishing.verification_timeout` | Live confirmation not received within 30 minutes | `{ requestId, platform }` |
| `publishing.cancelled` | Creator or system cancels a pending job | `{ requestId, platform, cancelledBy }` |

---

## 13. APIs

### POST /api/v1/channels/:channelId/publish/requests

Creates a new publish request. Asset must have accepted metadata (enforced by BR-001).

**Request Body:**
```json
{
  "assetId": "string",
  "platforms": [
    {
      "platform": "youtube | instagram | tiktok | twitterX | linkedin",
      "scheduledAt": "ISO 8601 timestamp",
      "visibility": "public | unlisted | private",
      "metadataOverrides": {}
    }
  ]
}
```

**Response 201:** Full `PublishRequest` object including AI-adapted metadata variants per platform.

---

### POST /api/v1/channels/:channelId/publish/requests/:requestId/confirm

Creator confirms the adapted metadata and schedule. Triggers scheduling of platform jobs.

---

### GET /api/v1/channels/:channelId/publish/requests

Returns paginated publish request history.

**Query Parameters:** `status`, `assetId`, `platform`, `page`, `limit` (max 100).

---

### GET /api/v1/channels/:channelId/publish/requests/:requestId

Returns full publish request with per-platform status detail.

---

### DELETE /api/v1/channels/:channelId/publish/requests/:requestId/platforms/:platform

Cancels a pending or scheduled publish job for a specific platform. Running jobs cannot be cancelled.

---

### GET /api/v1/channels/:channelId/publish/schedule-recommendations

Returns AI publish time recommendations for the next 7 days.

**Query Parameters:** `assetId` (optional, personalises recommendation to asset topic), `platforms` (comma-separated).

---

### GET /api/v1/channels/:channelId/publish/history

Returns a timeline of all published content across platforms. Used to render the publish calendar.

---

## 14. Plugin Contracts

### PlatformConnectorPlugin

Extends publishing to additional platforms not natively supported.

```typescript
interface PlatformConnectorPlugin extends IPlugin {
  readonly platform: string;
  readonly platformDisplayName: string;
  uploadVideo(request: PlatformUploadRequest): Promise<PlatformUploadResult>;
  verifyLive(platformContentId: string): Promise<PlatformLiveStatus>;
  validateCredentials(credentials: Record<string, unknown>): Promise<boolean>;
  getMetadataConstraints(): PlatformMetadataConstraints;
  revokeCredentials(credentials: Record<string, unknown>): Promise<void>;
}

interface PlatformUploadRequest {
  readonly assetStorageKey: string;
  readonly thumbnailStorageKey: string | null;
  readonly metadata: PlatformMetadata;
  readonly credentials: Record<string, unknown>;
}

interface PlatformUploadResult {
  readonly platformContentId: string;
  readonly platformContentUrl: string;
  readonly publishedAt: Date;
}

interface PlatformMetadataConstraints {
  readonly maxTitleLength: number;
  readonly maxDescriptionLength: number;
  readonly maxTagCount: number;
  readonly maxTagLength: number;
  readonly supportedVisibilityOptions: ReadonlyArray<ContentVisibility>;
  readonly supportsChapters: boolean;
  readonly supportsScheduling: boolean;
}
```

Plugins must declare the `Publishing` and `Network` permissions. The platform connector is the only system component that holds platform OAuth credentials; credentials are passed in at execution time and never logged.

---

## 15. Security

**OAuth Credential Storage:** Platform OAuth tokens are stored encrypted at rest using AES-256. The encryption key is managed separately from the application database. Tokens are decrypted only at job execution time and are never logged, included in event payloads, or transmitted outside the Platform Connector.

**Credential Scoping:** OAuth tokens are requested with the minimum required scopes for upload and basic publish management. Read scopes for analytics are managed separately by EES-004.

**Platform Webhook Validation:** When receiving post-publish callbacks from platform APIs, the signature is validated before processing. Unsigned or incorrectly signed callbacks are rejected.

**Cross-Channel Isolation:** A publish job may only access assets and credentials belonging to the same channel. Channel membership is validated at both the API layer and the job queue execution layer.

**Credential Revocation:** Creator-initiated credential revocation immediately suspends all pending publish jobs for that platform. In-progress jobs are allowed to complete. Revoked credentials are purged from storage within 24 hours.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Platform API rate limits block concurrent uploads | High | Medium | Stagger platform uploads by 30 seconds; implement per-platform rate limit tracking |
| Platform changes upload API without notice | Medium | High | Abstract all platform interaction behind PlatformConnectorPlugin; hot-swap connector without code changes |
| Creator credential OAuth token expires mid-publish | Medium | High | Proactively refresh tokens before job start; notify creator if refresh fails |
| Metadata adaptation AI produces non-compliant output | Low | Medium | Apply hard constraint validation after AI adaptation; block upload if constraint violated |
| Post-publish verification returns false positive (content unavailable briefly) | Medium | Low | Apply 3-attempt verification with 3-minute intervals before reporting timeout |

---

## 17. Future Improvements

- Podcast distribution: RSS-based publishing to Spotify, Apple Podcasts, and similar platforms.
- Automatic short-form derivatives: publish YouTube Shorts, Instagram Reels, and TikToks from long-form content clips identified by EES-002.
- Localised metadata: translate titles and descriptions into secondary languages for international audience segments.
- Collaborative publish approval workflows for team channels (EES-007 Agency OS).
- Platform AB testing: publish the same video at different times to different audience segments and surface results to EES-004.

---

## 18. Acceptance Criteria

**AC-001 — Metadata Gate Enforcement:** Given an asset whose metadata has not been accepted by the creator, when a publish request is submitted for that asset, then the system returns a validation error and no publish job is created.

**AC-002 — Multi-Platform Scheduling:** Given a confirmed publish request targeting three platforms with distinct scheduled times, when each scheduled time arrives, then an independent publish job starts for each platform and completion of one does not block the others.

**AC-003 — Metadata Adaptation Review:** Given a confirmed publish request, when the creator views the request, then per-platform metadata variants are shown with a diff from the approved original, and each variant may be independently edited before confirmation.

**AC-004 — Retry on Failure:** Given a platform upload that fails, when fewer than 3 attempts have been made, then the job is retried with exponential backoff without creator intervention.

**AC-005 — Post-Publish Verification:** Given a successful platform upload, when the Verification Agent runs, then a `publishing.verified` event is published within 30 minutes if the content is confirmed live.

**AC-006 — Duplicate Job Rejection:** Given an active publish job for asset A on platform YouTube, when a second publish request is submitted for asset A on YouTube, then the system rejects the request and returns an error referencing the existing active job.

**AC-007 — Schedule Recommendation Delivery:** Given a publish request creation, when schedule optimisation is requested, then recommendations are returned within 5 seconds for at least 3 time slots per selected platform.

**AC-008 — Credential Error Surfacing:** Given an expired or revoked platform credential, when a publish job attempts to run, then the job is immediately set to blocked status and the creator is notified with actionable reconnect instructions.

---

## 19. Dependencies

| Dependency | Type | Reference |
|------------|------|-----------|
| EES-002 Media Pipeline | Internal | Source of publication-ready assets |
| EES-004 Learning Engine | Internal | Audience engagement signals for schedule optimisation |
| EES-001 Revenue Intelligence | Internal | Receives publish events for revenue correlation |
| YouTube Data API v3 | External API | Upload and management |
| Core Job Queue + Scheduler | Internal | `src/core/queue/JobQueue.ts`, `src/core/scheduler/SchedulerService.ts` |
| Core Event Bus | Internal | `src/core/events/InMemoryEventBus.ts` |
| AI Provider Framework | Internal | `src/ai/application/AIService.ts` |
| Supabase (Auth + Database) | Infrastructure | `src/core/config/AppConfig.ts` |

---

## 20. Current Status

**Status:** Draft

The following decisions are required before this specification can advance to Approved:

- Phase 1 platform list must be confirmed and prioritised. YouTube is certain. Instagram, TikTok, Twitter/X, and LinkedIn require API access evaluation per platform's current developer terms.
- OAuth credential encryption key management strategy must be specified (envelope encryption, key rotation policy).
- Decision on whether post-publish verification is a pull model (polling) or push model (platform webhooks) for each platform.
- Confirmation of storage strategy for video file transmission to platforms (direct stream from Google Drive, or stage through Eunoia storage first).
