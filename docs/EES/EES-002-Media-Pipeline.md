# EES-002: Media Pipeline

| Field | Value |
|-------|-------|
| **ID** | EES-002 |
| **Title** | Media Pipeline |
| **Status** | Draft |
| **Owner** | Engineering |
| **Last Updated** | 2026-06-29 |

---

## 1. Mission

Establish a reliable, observable, and AI-augmented pipeline that ingests raw media assets, processes them into publication-ready derivatives, extracts structured metadata, and delivers them to downstream systems with full lineage tracking and zero untracked failures.

---

## 2. Business Goal

Content creators spend a disproportionate share of production time on mechanical tasks: organising files, generating thumbnails, writing descriptions, tagging videos, and preparing platform-specific versions. These tasks are low-creativity and high-repetition, making them ideal candidates for automation.

The Media Pipeline aims to reduce the time between a creator finishing a recording session and having a publication-ready asset with complete metadata from an average of 4 hours to under 20 minutes. This is achieved through automated ingestion from connected storage sources, AI-driven metadata extraction, and parallel processing of multiple output derivatives.

The pipeline also serves as the foundation for EES-004 Learning Engine's performance feedback loop: processed videos with AI-extracted metadata become the training signal for optimisation recommendations.

---

## 3. Scope

- Ingestion from Google Drive folders (configured in `AppConfig.GOOGLE_DRIVE_FOLDER`).
- Ingestion from local file system uploads via the Eunoia web interface.
- Detection of new and modified media files via polling and webhook triggers.
- Video validation: codec compatibility, file integrity, minimum resolution enforcement.
- AI metadata extraction: title suggestions, description drafts, keyword/tag generation, chapter markers.
- Automated thumbnail frame extraction from video keyframes.
- Storage of processed assets and metadata in the configured storage provider.
- Per-video processing job tracking with status, retry, and failure visibility.
- Domain event publication on all pipeline state transitions.
- Full processing lineage: every asset retains a reference to its source, all transformations applied, and all AI decisions made.

---

## 4. Out of Scope

- Transcoding to platform-specific codecs (h.264, VP9, AV1). Eunoia delegates transcoding to platform upload APIs and only validates format compatibility prior to upload.
- Audio production or mixing. The pipeline processes completed media, not works-in-progress.
- Copyright fingerprinting or Content ID matching. This is a platform-level capability.
- Live streaming ingest or real-time media processing.
- Video editing automation. AI metadata is extracted from the final cut, not used to edit it.

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Ingestion-to-metadata-ready time | < 20 minutes for files under 10 GB | Pipeline job duration logs |
| AI metadata acceptance rate | > 70% creator acceptance of AI-generated titles | Creator action tracking (accept/edit/reject) |
| Pipeline job failure rate | < 2% of submitted jobs | Job queue failure rate monitoring |
| Asset lineage completeness | 100% of processed assets traceable to source | Lineage integrity check on write |
| Duplicate ingestion rate | < 0.5% | Hash-based deduplication checks |
| Thumbnail selection accuracy | > 65% of AI-suggested thumbnails used without replacement | Creator action tracking |

---

## 6. Actors

| Actor | Type | Description |
|-------|------|-------------|
| Creator | Human | Uploads or connects cloud storage. Accepts, edits, or rejects AI-generated metadata. |
| Ingestion Agent | System | Monitors Google Drive and local upload endpoints for new assets. |
| Media Processor | System | Executes validation, frame extraction, and format analysis jobs. |
| AI Metadata Extractor | AI System | Generates titles, descriptions, tags, chapters, and thumbnail recommendations. |
| Storage Provider | System | Persists raw and processed assets. Local or Google Drive-backed per `AppConfig`. |
| Job Queue | System | Schedules and tracks all processing jobs via `src/core/queue/JobQueue`. |
| Event Bus | System | Publishes pipeline state transitions as domain events. |
| Publishing System | System (EES-003) | Consumes processed assets and metadata for platform delivery. |

---

## 7. Inputs

| Input | Source | Format | Trigger |
|-------|--------|--------|---------|
| Raw video file | Google Drive or direct upload | MP4, MOV, MKV, WebM | New file detected / upload complete |
| Creator-provided working title | Creator | Free text (optional) | At upload time |
| Creator-provided notes | Creator | Free text (optional) | At upload time |
| Google Drive change notification | Google Drive API (push webhook) | JSON | On file change |
| Video transcript (if available) | Creator or EES-004 | Plain text | Optional, enriches AI metadata |
| Channel content guidelines | Creator configuration | Structured JSON | From creator profile |

---

## 8. Outputs

| Output | Consumer | Format | Trigger |
|--------|----------|--------|---------|
| Processed video asset record | Storage Provider, EES-003 | `VideoAsset` entity | On processing complete |
| AI-generated metadata draft | Creator review UI | `VideoMetadataDraft` entity | On AI extraction complete |
| Thumbnail candidates | Creator review UI | Image files + `ThumbnailCandidate[]` | On frame extraction complete |
| Processing job status | Creator dashboard | `ProcessingJob` entity | Continuous |
| `pipeline.asset.ingested` event | Event Bus | Domain event | On ingestion |
| `pipeline.processing.completed` event | Event Bus | Domain event | On job completion |
| `pipeline.processing.failed` event | Event Bus | Domain event | On job terminal failure |
| `pipeline.metadata.ready` event | Event Bus | Domain event | On AI extraction complete |

---

## 9. Business Rules

**BR-001 — Accepted Formats:** The pipeline accepts MP4 (H.264/H.265), MOV (H.264/ProRes), MKV (H.264), and WebM (VP8/VP9). Files in unsupported formats are rejected at ingestion with a clear error message. The creator is not charged processing against rejected files.

**BR-002 — File Size Limits:** Maximum supported file size is 128 GB. Files exceeding this limit are rejected at ingestion. The limit may be raised in a future version without a specification revision.

**BR-003 — Deduplication:** Each ingested file is identified by a SHA-256 content hash computed during ingestion. If a matching hash exists in the asset store, the ingestion is treated as a re-submission of an existing asset and no duplicate processing job is created. The creator is informed of the match.

**BR-004 — Minimum Quality Floor:** Videos with a resolution below 720p (1280×720) or a frame rate below 24 fps are flagged with a quality warning but are not rejected. The warning is displayed in the creator review UI.

**BR-005 — AI Metadata Is Non-Binding:** All AI-generated metadata is a draft. No metadata generated by the AI Metadata Extractor may be published without explicit creator review and acceptance. The system must not forward AI drafts to EES-003 Publishing without a confirmed creator approval action.

**BR-006 — Processing Job Retry Policy:** Failed processing jobs are retried up to 3 times with exponential backoff (initial delay 30 seconds, multiplier 2). After 3 failures the job moves to the Dead Letter Queue and the creator is notified. DLQ entries are retained for 30 days.

**BR-007 — Asset Lineage Immutability:** Once an asset's lineage record is written, the source reference and ingestion hash may not be modified. Downstream transformations are appended, never overwritten.

**BR-008 — Concurrent Processing Limit:** A maximum of 5 processing jobs may run concurrently per channel. Additional jobs are queued and executed as slots become available. The queue has no expiry for valid submitted jobs.

---

## 10. AI Decision Flow

### 10.1 Metadata Extraction

**Intent:** Generate a high-quality metadata draft (title, description, tags, chapters) from a video and optional creator-provided context.

**Inputs:**
- Video transcript (auto-generated via speech-to-text if not provided — speech-to-text is a future capability; if absent, visual context and creator notes serve as primary signals)
- Creator-provided working title and notes
- Channel's historical video titles and top-performing keywords (from EES-004)
- Channel content guidelines from creator profile
- Video duration, frame count, estimated pacing

**Reasoning Chain:**
1. Identify the video's primary topic and secondary topics from transcript or creator notes.
2. Generate 5 title candidates using the channel's established titling patterns (hook, specificity, search intent balance).
3. Generate a description draft: hook paragraph, body with chapters timestamped at detected topic shifts, call-to-action aligned with channel template.
4. Extract 15–30 keyword tags ranked by estimated search volume relevance.
5. Identify chapter boundaries from transcript topic transitions or visual pacing signals.
6. Score all generated metadata against channel brand guidelines.

**Output Contract:**
```json
{
  "extractionId": "string (uuid)",
  "videoAssetId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "titleCandidates": [
    { "text": "string", "score": "number", "rationale": "string" }
  ],
  "descriptionDraft": "string",
  "tags": ["string"],
  "chapters": [
    { "timestampSeconds": "number", "title": "string" }
  ],
  "modelVersion": "string",
  "confidence": "high | medium | low"
}
```

---

### 10.2 Thumbnail Frame Selection

**Intent:** Identify the best candidate frames from the video to serve as thumbnail base images.

**Inputs:**
- Extracted keyframes at 10-second intervals throughout the video
- Creator's historical thumbnail performance data (click-through rate per thumbnail type from EES-004)
- Channel thumbnail style guide (if configured)

**Reasoning Chain:**
1. Score each keyframe for visual quality: sharpness, lighting, face prominence, colour contrast.
2. Score for narrative representativeness: does the frame communicate the video's core promise?
3. Score for consistency with the channel's established thumbnail aesthetic.
4. Return the top 5 frames ranked by composite score.

**Output Contract:**
```json
{
  "selectionId": "string (uuid)",
  "videoAssetId": "string",
  "candidates": [
    {
      "frameId": "string",
      "timestampSeconds": "number",
      "storageKey": "string",
      "scores": {
        "visualQuality": "number",
        "narrativeRelevance": "number",
        "aestheticConsistency": "number",
        "composite": "number"
      }
    }
  ],
  "recommendedFrameId": "string"
}
```

---

## 11. Data Model

### VideoAsset

```typescript
interface VideoAsset {
  readonly id: string;                     // uuid
  readonly channelId: string;
  readonly sourceType: AssetSourceType;    // enum: GoogleDrive | DirectUpload | LocalStorage
  readonly sourceReference: string;        // Google Drive file ID or upload path
  readonly contentHash: string;            // SHA-256
  readonly filename: string;
  readonly fileSizeBytes: number;
  readonly durationSeconds: number;
  readonly resolution: VideoResolution;    // { width, height }
  readonly frameRate: number;
  readonly codec: string;
  readonly status: AssetStatus;            // enum: Ingested | Processing | Ready | Failed | Archived
  readonly metadata: VideoMetadataDraft | null;
  readonly thumbnailCandidates: ReadonlyArray<ThumbnailCandidate>;
  readonly lineage: AssetLineage;
  readonly qualityWarnings: ReadonlyArray<QualityWarning>;
  readonly ingestedAt: Date;
  readonly processedAt: Date | null;
}
```

### AssetLineage

```typescript
interface AssetLineage {
  readonly assetId: string;
  readonly sourceType: AssetSourceType;
  readonly sourceReference: string;
  readonly ingestedAt: Date;
  readonly contentHash: string;
  readonly transformations: ReadonlyArray<AssetTransformation>;
}

interface AssetTransformation {
  readonly type: string;                   // e.g., "thumbnail_extraction", "metadata_extraction"
  readonly appliedAt: Date;
  readonly systemVersion: string;
  readonly modelVersion: string | null;
}
```

### ProcessingJob

```typescript
interface ProcessingJob {
  readonly id: string;
  readonly assetId: string;
  readonly channelId: string;
  readonly type: ProcessingJobType;        // enum: MetadataExtraction | ThumbnailExtraction | Validation
  readonly status: JobStatus;              // from src/core/queue/types.ts
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly lastError: string | null;
  readonly scheduledAt: Date;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
}
```

### VideoMetadataDraft

```typescript
interface VideoMetadataDraft {
  readonly id: string;
  readonly assetId: string;
  readonly titleCandidates: ReadonlyArray<TitleCandidate>;
  readonly descriptionDraft: string;
  readonly tags: ReadonlyArray<string>;
  readonly chapters: ReadonlyArray<Chapter>;
  readonly acceptedTitle: string | null;
  readonly acceptedDescription: string | null;
  readonly creatorReviewedAt: Date | null;
  readonly generatedAt: Date;
  readonly modelVersion: string;
}
```

---

## 12. Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `pipeline.asset.ingested` | New file detected and logged | `{ assetId, channelId, sourceType, fileSizeBytes }` |
| `pipeline.asset.duplicate_detected` | Ingestion matches existing content hash | `{ newSourceReference, existingAssetId }` |
| `pipeline.validation.failed` | File fails format or integrity check | `{ assetId, reason, code }` |
| `pipeline.processing.started` | Processing job begins execution | `{ jobId, assetId, jobType }` |
| `pipeline.processing.completed` | Job finishes successfully | `{ jobId, assetId, jobType, durationMs }` |
| `pipeline.processing.failed` | Job exhausts retries | `{ jobId, assetId, lastError, attempts }` |
| `pipeline.metadata.ready` | AI metadata extraction complete | `{ assetId, extractionId, confidence }` |
| `pipeline.thumbnail.ready` | Thumbnail candidates extracted | `{ assetId, selectionId, candidateCount }` |
| `pipeline.metadata.accepted` | Creator approves metadata | `{ assetId, acceptedTitle }` |

---

## 13. APIs

### POST /api/v1/channels/:channelId/assets/upload

Initiates a direct upload. Returns a pre-signed upload URL and a pending `VideoAsset` record.

**Request Body:** `{ filename: string, fileSizeBytes: number, mimeType: string, workingTitle?: string, notes?: string }`

**Response 201:**
```json
{
  "assetId": "string",
  "uploadUrl": "string",
  "uploadUrlExpiresAt": "ISO 8601 timestamp"
}
```

---

### POST /api/v1/channels/:channelId/assets/upload/:assetId/complete

Called by the client after the file has been transferred to the upload URL. Triggers ingestion pipeline.

---

### GET /api/v1/channels/:channelId/assets

Returns paginated list of video assets.

**Query Parameters:** `status`, `page`, `limit` (max 100).

---

### GET /api/v1/channels/:channelId/assets/:assetId

Returns full `VideoAsset` including metadata draft and thumbnail candidates.

---

### POST /api/v1/channels/:channelId/assets/:assetId/metadata/accept

Creator accepts AI metadata. Required before asset may proceed to EES-003 Publishing.

**Request Body:** `{ title: string, description: string, tags: string[], chapters: Chapter[] }`

---

### GET /api/v1/channels/:channelId/assets/:assetId/jobs

Returns all processing jobs for an asset.

---

### POST /api/v1/channels/:channelId/assets/:assetId/jobs/:jobId/retry

Manually retries a failed job that has not yet reached the DLQ.

---

### GET /api/v1/channels/:channelId/assets/:assetId/lineage

Returns the full lineage record for an asset.

---

## 14. Plugin Contracts

### MediaProcessorPlugin

Enables third-party processing steps to be inserted into the pipeline as additional transformation stages.

```typescript
interface MediaProcessorPlugin extends IPlugin {
  readonly processorType: string;
  readonly supportedFormats: ReadonlyArray<string>;
  process(assetId: string, input: ProcessorInput): Promise<ProcessorOutput>;
  validateInput(input: ProcessorInput): boolean;
}

interface ProcessorInput {
  readonly assetId: string;
  readonly storageKey: string;
  readonly metadata: Record<string, unknown>;
}

interface ProcessorOutput {
  readonly transformationType: string;
  readonly outputStorageKey: string | null;
  readonly metadata: Record<string, unknown>;
  readonly modelVersion: string;
}
```

Plugins must declare the `Storage` and `Filesystem` permissions. They receive read-only access to asset storage keys and may write additional derivative files. They may not modify the source asset or its content hash.

---

## 15. Security

**Upload Authorisation:** Pre-signed upload URLs are scoped to a single asset, a single channel, and expire after 30 minutes. They may not be reused. The server validates the final file hash against the hash declared at upload initiation.

**Content Validation:** All uploaded files are scanned for MIME type consistency between declared and actual file header bytes before processing begins. Files that fail this check are rejected and the upload URL is invalidated.

**Storage Isolation:** Each channel's assets are stored under a namespaced storage prefix. Cross-channel read access is prohibited at the storage layer, not only the API layer.

**AI Model Access:** The AI Metadata Extractor operates on transcripts and metadata only. It does not receive access to raw video file bytes. Frame images for thumbnail selection are processed in an isolated context and are not logged or retained beyond the selection pipeline.

**DLQ Visibility:** Dead Letter Queue entries are visible only to the channel owner and to internal platform operators. They are retained for 30 days and then purged.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Large file uploads fail intermittently on unstable connections | High | Medium | Implement resumable uploads using the TUS protocol in a future version; pre-signed URL approach is adequate for MVP |
| AI metadata quality degrades for non-English content | High | Medium | Detect video language at extraction time; label confidence accordingly; prompt in detected language |
| Google Drive API change notification delivery is unreliable | Medium | Medium | Supplement webhooks with 15-minute polling as a fallback; reconcile on each poll cycle |
| Processing job queue backlog during high-upload periods | Medium | Low | Enforce per-channel concurrency limit (BR-008); scale queue workers horizontally |
| Creator rejects AI thumbnail suggestions repeatedly | Medium | Low | Use rejection signals as negative examples in thumbnail scoring model; surface feedback to EES-004 |

---

## 17. Future Improvements

- Speech-to-text transcription service integration (Whisper or equivalent) to provide video transcripts as primary AI metadata input.
- Resumable upload support via TUS protocol for files over 2 GB.
- Automated chapter detection from audio cues and scene transitions.
- AI-generated short-form clips from long-form content (Shorts/Reels derivatives).
- Custom processing pipeline stages via MediaProcessorPlugin contract.
- Batch ingestion API for migrating legacy video libraries.

---

## 18. Acceptance Criteria

**AC-001 — Ingestion Trigger:** Given a new MP4 file placed in the configured Google Drive folder, when the ingestion agent's polling cycle runs, then a `VideoAsset` record is created and a `pipeline.asset.ingested` event is published within 15 minutes.

**AC-002 — Deduplication:** Given a file that matches the SHA-256 hash of an existing asset, when ingestion is triggered, then no new processing job is created and a `pipeline.asset.duplicate_detected` event is published.

**AC-003 — Format Rejection:** Given a file with an unsupported format (e.g., AVI), when ingestion runs, then the file is rejected with a `pipeline.validation.failed` event and the creator is notified.

**AC-004 — Metadata Extraction:** Given a processed video asset, when AI metadata extraction completes, then the result contains at least 3 title candidates, a description draft, and at least 10 tags.

**AC-005 — Thumbnail Extraction:** Given a processed video asset, when thumbnail extraction completes, then at least 3 candidate frames are stored and a recommended frame is identified.

**AC-006 — Creator Acceptance Gate:** Given an asset with a pending metadata draft, when the creator has not yet accepted the metadata, then the asset status must not advance to `Ready` and EES-003 must not receive the asset.

**AC-007 — Retry Policy:** Given a processing job that fails, when fewer than 3 attempts have been made, then a retry is scheduled using exponential backoff. After 3 failures, the job is moved to the DLQ and the creator is notified.

**AC-008 — Lineage Integrity:** Given any processed asset, when the lineage endpoint is queried, then the response includes the source reference, ingestion hash, and a transformation entry for every processing step applied.

---

## 19. Dependencies

| Dependency | Type | Reference |
|------------|------|-----------|
| Google Drive API v3 | External API | `AppConfig.GOOGLE_DRIVE_FOLDER` |
| Supabase Storage | Infrastructure | `src/core/storage/LocalStorageProvider.ts` |
| Core Job Queue | Internal | `src/core/queue/JobQueue.ts` |
| Core Event Bus | Internal | `src/core/events/InMemoryEventBus.ts` |
| AI Provider Framework | Internal | `src/ai/application/AIService.ts` |
| EES-003 Publishing | Internal | Receives processed and accepted assets |
| EES-004 Learning Engine | Internal | Provides historical performance signals for metadata and thumbnail scoring |

---

## 20. Current Status

**Status:** Draft

The following sections require further refinement before this specification can advance to Approved:

- Speech-to-text integration approach must be decided (external API vendor vs. self-hosted Whisper).
- Storage provider contract must be finalised to confirm whether Google Drive serves as both source and destination, or only as source.
- Processing job concurrency model needs benchmarking to set the limit in BR-008 based on actual hardware targets.
- Frame extraction tooling must be selected (ffmpeg via child process, WASM, or a managed service).
