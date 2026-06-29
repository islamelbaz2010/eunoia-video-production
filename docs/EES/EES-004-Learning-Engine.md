# EES-004: Learning Engine

| Field | Value |
|-------|-------|
| **ID** | EES-004 |
| **Title** | Learning Engine |
| **Status** | Draft |
| **Owner** | AI Strategy |
| **Last Updated** | 2026-06-29 |

---

## 1. Mission

Turn every published video into a structured learning signal that makes the next video smarter — by continuously ingesting performance data, identifying the patterns that drive audience growth, and surfacing those patterns as actionable recommendations the creator can act on before they publish.

---

## 2. Business Goal

The difference between a creator who grows and one who plateaus is rarely production quality — it is the ability to learn from audience response faster than competitors. Most creators review performance data reactively and informally. Without a structured feedback loop, successful strategies are repeated by luck and failures are repeated by habit.

The Learning Engine closes this loop. It ingests performance data from all published content, constructs a performance model specific to the creator's channel, and generates concrete, evidence-based recommendations for titles, thumbnails, publish timing, topic selection, and format choices. Over a 6-month period, channels using Learning Engine recommendations are targeted to achieve a 25% increase in average views per video and a 15% increase in subscriber conversion rate from video impressions.

---

## 3. Scope

- Ingestion of post-publish performance metrics from YouTube Analytics API and other connected platform analytics APIs.
- Per-video performance modelling: views, watch time, click-through rate, subscriber gain/loss, comments, shares.
- Thumbnail A/B testing coordination: surface to EES-003 and track which variant drives higher CTR.
- Title performance analysis: correlate title linguistic patterns with CTR and view velocity.
- Topic performance scoring: identify which subject areas over- and under-perform for the channel.
- Optimal publish time surface (feed data into EES-003 schedule optimiser).
- Audience retention curve analysis: identify drop-off points and their structural causes.
- AI recommendation generation: concrete, ranked, channel-specific recommendations per video and overall.
- Performance benchmark against creator's own historical baseline (no cross-creator comparison without consent).

---

## 4. Out of Scope

- Real-time audience engagement (live comment stream, chat). Learning Engine operates on aggregated post-publish data.
- Competitor channel analysis or market benchmarking (future capability, requires separate data sourcing).
- Algorithmic prediction of platform feed placement. Platform algorithms are opaque; Learning Engine models audience behaviour, not platform decisions.
- Monetisation optimisation recommendations (owned by EES-001 Revenue Intelligence).
- Content generation or script writing (owned by EES-005 AI CEO).
- Cross-creator data sharing or anonymised cohort benchmarks without explicit opt-in.

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Average views per video growth | +25% over 6 months for active users | Cohort comparison vs. non-users |
| Subscriber conversion rate from impressions | +15% over 6 months | CTR × subscriber gain per 1000 impressions |
| Recommendation acceptance rate | > 50% of surfaced recommendations acted upon | Creator action tracking |
| Time from publish to first recommendation | < 48 hours post-publish | Ingestion latency monitoring |
| Audience retention model accuracy | Predicted vs. actual drop-off within ±8% | Backtested against 90 days |
| Data freshness from platform | < 6 hours from platform availability | Ingestion lag monitoring |

---

## 6. Actors

| Actor | Type | Description |
|-------|------|-------------|
| Creator | Human | Reviews performance data, acts on recommendations, configures goals. |
| Analytics Ingestion Agent | System | Polls platform analytics APIs and normalises data into the Learning Engine ledger. |
| Performance Modeller | AI System | Builds per-channel performance models from historical data. |
| Recommendation Engine | AI System | Generates ranked, channel-specific recommendations from performance models. |
| A/B Test Coordinator | System | Tracks thumbnail and title variants; attributes performance differences to specific changes. |
| Event Bus | System | Receives publish and verify events from EES-003; provides engagement signals to EES-001 and EES-003. |
| EES-003 Publishing | System | Receives schedule recommendations and thumbnail performance data. |
| EES-005 AI CEO | System | Consumes channel performance summaries for strategic planning. |

---

## 7. Inputs

| Input | Source | Format | Frequency |
|-------|--------|--------|-----------|
| YouTube video performance metrics | YouTube Analytics API | JSON | Every 6 hours per video for first 7 days; daily thereafter |
| YouTube audience retention data | YouTube Analytics API | JSON timeseries | Daily, first 30 days post-publish |
| YouTube impression and CTR data | YouTube Analytics API | JSON | Every 6 hours, first 7 days |
| `publishing.verified` event | EES-003 Event Bus | Domain event | Real-time |
| `pipeline.metadata.accepted` event | EES-002 Event Bus | Domain event | Real-time |
| Creator goal configuration | Creator settings | Structured JSON | On change |
| Thumbnail A/B variant selection | Creator or system | Stored variant | Per video |

---

## 8. Outputs

| Output | Consumer | Format | Trigger |
|--------|----------|--------|---------|
| `VideoPerformanceRecord` | Creator dashboard, EES-005 | Structured data | On ingestion |
| `ChannelPerformanceModel` | Recommendation Engine, EES-003, EES-005 | Model snapshot | On model refresh |
| `Recommendation[]` | Creator dashboard | Ranked list | After model refresh, per new video |
| `PublishScheduleSignal` | EES-003 | JSON | On model refresh |
| `learning.performance.ingested` event | Event Bus | Domain event | Per ingestion cycle |
| `learning.model.updated` event | Event Bus | Domain event | On model refresh |
| `learning.recommendation.generated` event | Event Bus | Domain event | Per recommendation batch |

---

## 9. Business Rules

**BR-001 — Minimum Performance Data Age:** Performance data for the first 48 hours after publish is considered preliminary and is explicitly labelled as such in all outputs. Recommendations based on preliminary data are marked with lower confidence.

**BR-002 — Recommendation Relevance Window:** Recommendations generated from data older than 90 days are considered stale and are automatically invalidated. A new model refresh cycle is triggered upon the next video publish or explicitly on creator request.

**BR-003 — A/B Test Integrity:** A thumbnail A/B test requires a minimum of 1,000 impressions per variant before a winner can be declared. Declaring a winner on insufficient data is prohibited regardless of the measured CTR delta.

**BR-004 — No Cross-Channel Data Leakage:** All performance models and recommendations are computed and stored in strict channel isolation. No channel's data contributes to another channel's model without explicit written consent from both creators.

**BR-005 — Recommendation Explainability:** Every recommendation must include a human-readable rationale referencing the specific data pattern that generated it. Generic or unexplained recommendations may not be surfaced.

**BR-006 — Creator Goal Alignment:** Recommendations are scored and ranked relative to the creator's stated priority goal. A creator focused on subscriber growth receives different top recommendations than one focused on watch time. If no goal is configured, the default is view count growth.

**BR-007 — Platform Lag Disclosure:** Ingested analytics data must display the platform's data cutoff timestamp. The dashboard must not present lagged data as real-time.

**BR-008 — Model Drift Detection:** If the model's predictions diverge from actuals by more than 20% for three consecutive videos, a model retraining is triggered automatically and the creator is notified that the model is being recalibrated.

---

## 10. AI Decision Flow

### 10.1 Channel Performance Modelling

**Intent:** Construct a statistical model of the creator's channel that captures the relationship between video attributes (title, thumbnail style, topic, length, publish time) and performance outcomes (views, CTR, watch time, subscriber gain).

**Inputs:**
- Historical per-video performance records (minimum 20 videos for initial model; improves with volume)
- Per-video metadata: title length, title sentiment, thumbnail type (face/no face, text overlay, colour palette), topic category, video duration, publish day/time
- Audience retention curves per video

**Reasoning Chain:**
1. Group videos by topic category and identify category-level performance baselines.
2. Fit a regression model for CTR as a function of: title character count, question vs. statement structure, capitalization pattern, thumbnail face presence, and publish day.
3. Fit a retention model: average view duration as a function of video length, intro length, and chapter structure.
4. Identify which video attributes are statistically significant predictors vs. noise.
5. Generate the channel performance model snapshot with confidence scores per attribute.

**Output Contract:**
```json
{
  "modelId": "string (uuid)",
  "channelId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "videoCount": "number",
  "attributes": {
    "titleLength": { "impact": "high | medium | low | none", "direction": "positive | negative | mixed", "optimalRange": [20, 60] },
    "thumbnailFacePresent": { "impact": "high", "direction": "positive", "ctrLift": 0.14 },
    "publishDayOfWeek": { "impact": "medium", "bestDays": ["tuesday", "wednesday"] },
    "videoLengthMinutes": { "impact": "medium", "optimalRange": [8, 15] }
  },
  "dataQuality": "sufficient | marginal | insufficient",
  "modelVersion": "string"
}
```

---

### 10.2 Recommendation Generation

**Intent:** Produce a ranked list of concrete, actionable recommendations based on the channel performance model and the most recent video's performance data.

**Inputs:**
- `ChannelPerformanceModel` snapshot
- Latest video performance record
- Creator's configured priority goal
- Pending future video schedule (if available from EES-003)

**Reasoning Chain:**
1. Compare the latest video's attribute profile against the model's identified optimal ranges.
2. Identify the 3–5 attributes with the largest gap from optimal that are within the creator's control.
3. For each identified gap, generate a specific recommendation with a predicted impact estimate.
4. Score each recommendation by estimated impact × feasibility × alignment with creator's priority goal.
5. Rank and return the top recommendations, with each recommendation referencing the specific video(s) that provide its evidence base.

**Output Contract:**
```json
{
  "batchId": "string (uuid)",
  "channelId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "priorityGoal": "views | watchTime | subscribers | ctr",
  "recommendations": [
    {
      "id": "string",
      "category": "title | thumbnail | timing | length | topic | format",
      "priority": "high | medium | low",
      "recommendation": "string (specific, actionable instruction)",
      "rationale": "string (evidence reference, e.g., 'Videos with question-format titles averaged 18% higher CTR over the last 12 uploads')",
      "estimatedImpact": "string (e.g., '+12% CTR')",
      "evidenceVideoIds": ["string"],
      "actionable": "boolean"
    }
  ]
}
```

---

### 10.3 Audience Retention Analysis

**Intent:** Identify structural drop-off points in the audience retention curve and associate them with video segments that may be shortened or reordered.

**Inputs:**
- Per-video retention curve (percentage of audience remaining at each 10-second interval)
- Video chapter markers (if present)
- Average retention curve for the channel across comparable video lengths

**Reasoning Chain:**
1. Compute the channel's baseline retention curve shape for the video's duration category.
2. Identify timestamps where the current video's retention falls more than 10 percentage points below the channel baseline.
3. Correlate drop-off timestamps with chapter markers or known structural video elements (intro end, sponsor segment, subject change).
4. Generate labelled insights: "Retention drops sharply at 2:15, coinciding with the end of the hook — consider shortening your intro."

**Output Contract:**
```json
{
  "analysisId": "string (uuid)",
  "videoAssetId": "string",
  "baselineComparisonVideoCount": "number",
  "dropOffPoints": [
    {
      "timestampSeconds": "number",
      "audienceRemaining": "number",
      "baselineAudienceRemaining": "number",
      "gap": "number",
      "label": "string",
      "suggestion": "string"
    }
  ],
  "averageViewDurationSeconds": "number",
  "baselineAverageViewDurationSeconds": "number"
}
```

---

## 11. Data Model

### VideoPerformanceRecord

```typescript
interface VideoPerformanceRecord {
  readonly id: string;
  readonly assetId: string;
  readonly channelId: string;
  readonly platform: PublishPlatform;
  readonly platformContentId: string;
  readonly snapshotAt: Date;
  readonly ageHours: number;
  readonly views: number;
  readonly impressions: number;
  readonly impressionCTR: number;
  readonly averageViewDurationSeconds: number;
  readonly watchTimeMinutes: number;
  readonly subscriberGain: number;
  readonly subscriberLoss: number;
  readonly likes: number;
  readonly comments: number;
  readonly shares: number;
  readonly isPreliminary: boolean;
  readonly dataLagHours: number;
}
```

### ChannelPerformanceModel

```typescript
interface ChannelPerformanceModel {
  readonly id: string;
  readonly channelId: string;
  readonly generatedAt: Date;
  readonly videoCount: number;
  readonly attributes: Record<string, AttributeImpact>;
  readonly dataQuality: 'sufficient' | 'marginal' | 'insufficient';
  readonly modelVersion: string;
  readonly nextRefreshAt: Date;
}

interface AttributeImpact {
  readonly impact: 'high' | 'medium' | 'low' | 'none';
  readonly direction: 'positive' | 'negative' | 'mixed';
  readonly confidenceScore: number;
  readonly sampleSize: number;
}
```

### Recommendation

```typescript
interface Recommendation {
  readonly id: string;
  readonly channelId: string;
  readonly batchId: string;
  readonly category: RecommendationCategory;   // enum: Title | Thumbnail | Timing | Length | Topic | Format
  readonly priority: 'high' | 'medium' | 'low';
  readonly recommendation: string;
  readonly rationale: string;
  readonly estimatedImpact: string;
  readonly evidenceVideoIds: ReadonlyArray<string>;
  readonly actionable: boolean;
  readonly status: RecommendationStatus;        // enum: Active | Dismissed | Applied
  readonly generatedAt: Date;
  readonly expiresAt: Date;
}
```

---

## 12. Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `learning.performance.ingested` | New platform metrics received | `{ recordId, assetId, channelId, platform, ageHours }` |
| `learning.model.updated` | Channel performance model refreshed | `{ modelId, channelId, videoCount, dataQuality }` |
| `learning.recommendation.generated` | New recommendation batch produced | `{ batchId, channelId, count, priorityGoal }` |
| `learning.abtest.winner_declared` | A/B test variant declared winner | `{ testId, assetId, winnerVariantId, impressionCount, ctrDelta }` |
| `learning.model.drift_detected` | Prediction error exceeds threshold | `{ channelId, consecutiveVideosOffThreshold, retrainingTriggered }` |

---

## 13. APIs

### GET /api/v1/channels/:channelId/performance/videos/:assetId

Returns all performance record snapshots for a specific video.

**Query Parameters:** `platform`, `startAgeHours`, `endAgeHours`.

---

### GET /api/v1/channels/:channelId/performance/model

Returns the current channel performance model.

---

### POST /api/v1/channels/:channelId/performance/model/refresh

Manually triggers a model refresh. Rate-limited to once per 24 hours.

---

### GET /api/v1/channels/:channelId/recommendations

Returns the active recommendation batch.

**Query Parameters:** `category`, `priority`, `status`.

---

### PATCH /api/v1/channels/:channelId/recommendations/:recommendationId

Updates recommendation status (applied, dismissed).

**Request Body:** `{ status: "applied" | "dismissed" }`

---

### GET /api/v1/channels/:channelId/performance/retention/:assetId

Returns the retention curve analysis for a specific video.

---

### POST /api/v1/channels/:channelId/abtests

Creates a thumbnail A/B test for a specified asset.

**Request Body:** `{ assetId: string, variantStorageKeys: string[] }`

---

### GET /api/v1/channels/:channelId/abtests/:testId

Returns A/B test status including impression counts per variant.

---

## 14. Plugin Contracts

### AnalyticsProviderPlugin

Extends the Learning Engine to ingest performance data from platforms not natively supported.

```typescript
interface AnalyticsProviderPlugin extends IPlugin {
  readonly platform: string;
  fetchVideoPerformance(
    platformContentId: string,
    since: Date
  ): Promise<ReadonlyArray<RawPerformanceSnapshot>>;
  fetchRetentionCurve(platformContentId: string): Promise<ReadonlyArray<RetentionDataPoint>>;
  getDataLagEstimateHours(): number;
}

interface RawPerformanceSnapshot {
  readonly snapshotAt: Date;
  readonly views: number;
  readonly impressions: number | null;
  readonly impressionCTR: number | null;
  readonly watchTimeMinutes: number | null;
  readonly subscriberGain: number | null;
  readonly metadata: Record<string, unknown>;
}

interface RetentionDataPoint {
  readonly timestampSeconds: number;
  readonly audiencePercentage: number;
}
```

Plugins must declare the `Analytics` and `Network` permissions. Returned data is normalised into `VideoPerformanceRecord` by the ingestion layer before storage.

---

## 15. Security

**Analytics Credential Scoping:** Platform analytics OAuth tokens are requested with read-only scopes. No analytics credential grants write access to the creator's platform account.

**Data Isolation:** Channel performance records and models are stored with row-level security policies enforcing channel-owner access. No performance data crosses channel boundaries (BR-004).

**Recommendation Data Classification:** Recommendations contain channel-specific strategic signals and are treated as creator-private. They are not included in logs, error messages, or external system responses.

**Rate Limiting:** Analytics API polling is rate-limited to respect per-platform API quotas. Backoff is applied on quota exhaustion. A quota exhaustion event is published on the event bus and surfaced to the creator with estimated recovery time.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| YouTube Analytics API delays exceed expected platform lag | High | Low | Data lag is displayed to creator; preliminary data is labelled and excluded from high-confidence recommendations |
| Model underperforms for channels with fewer than 20 videos | High | Medium | Model returns `dataQuality: insufficient` below threshold; surface trend data instead of recommendations |
| Creator dismisses all recommendations without feedback | Medium | Medium | Track dismiss patterns; surface a simplified prompt for feedback reason; use dismissals as negative training signal |
| A/B test results confounded by external events (algorithmic change, trend spike) | Medium | Medium | Flag test results that occurred during anomalous traffic periods as inconclusive |
| Platform changes analytics API schema | Medium | High | Normalise all platform data at ingestion via typed adapters; platform schema changes require only adapter update |

---

## 17. Future Improvements

- Cross-channel opt-in benchmarking: anonymised performance cohort comparisons by niche and audience size.
- Competitor content monitoring: track topic and format trends in the creator's niche.
- Script-level recommendations: identify which sections of a video script correlate with retention improvement.
- Predictive performance scoring: estimate expected views before publish, based on draft metadata and channel model.
- Engagement quality analysis: differentiate high-value engagement (saves, shares) from low-value engagement (passive views).

---

## 18. Acceptance Criteria

**AC-001 — Performance Ingestion Trigger:** Given a `publishing.verified` event, when the ingestion agent runs, then a `VideoPerformanceRecord` is created within 6 hours of platform data availability, with the `isPreliminary` flag correctly set based on data age.

**AC-002 — Model Generation:** Given a channel with at least 20 published videos, when a model refresh is triggered, then a `ChannelPerformanceModel` is returned with at least 3 attribute impact entries and a `dataQuality` of `sufficient` or `marginal`.

**AC-003 — Recommendation Evidence Requirement:** Given a generated recommendation, when the recommendation is returned, then the `rationale` field contains a specific data reference and `evidenceVideoIds` contains at least one video ID.

**AC-004 — A/B Test Minimum Impression Gate:** Given a thumbnail A/B test with fewer than 1,000 impressions per variant, when a winner status is queried, then the system returns `status: insufficient_data` and does not declare a winner.

**AC-005 — Cross-Channel Data Isolation:** Given channel A's JWT, when a request is made for channel B's recommendations or performance model, then the system returns 403 Forbidden.

**AC-006 — Stale Recommendation Invalidation:** Given a recommendation generated more than 90 days ago, when the recommendations endpoint is queried, then the stale recommendation is not returned in the active list.

**AC-007 — Retention Analysis Delivery:** Given a video with at least 30 days of available audience retention data, when the retention analysis endpoint is queried, then drop-off points are identified with associated timestamps and suggestions.

---

## 19. Dependencies

| Dependency | Type | Reference |
|------------|------|-----------|
| YouTube Analytics API v2 | External API | Google API Terms of Service |
| EES-002 Media Pipeline | Internal | `pipeline.metadata.accepted` event provides asset context |
| EES-003 Publishing | Internal | `publishing.verified` event triggers ingestion; receives schedule signals |
| EES-001 Revenue Intelligence | Internal | Revenue data enriches per-video ROI model |
| EES-005 AI CEO | Internal | Receives `ChannelPerformanceModel` for strategic planning |
| AI Provider Framework | Internal | `src/ai/application/AIService.ts` |
| Core Event Bus | Internal | `src/core/events/InMemoryEventBus.ts` |
| Supabase (Auth + Database) | Infrastructure | `src/core/config/AppConfig.ts` |

---

## 20. Current Status

**Status:** Draft

The following decisions are required before this specification can advance to Approved:

- Minimum video count threshold for model initialisation must be validated against real channel data (currently set at 20 — may need adjustment).
- Model implementation approach must be decided: in-process statistical computation, AI provider call with structured prompt, or a hybrid.
- YouTube Analytics API quota limits must be evaluated against polling frequency targets for channels with large back catalogues.
- Retention curve ingestion format must be confirmed against the YouTube Analytics API's actual timeseries response structure.
