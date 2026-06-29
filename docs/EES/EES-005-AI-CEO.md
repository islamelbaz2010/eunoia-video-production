# EES-005: AI CEO

| Field | Value |
|-------|-------|
| **ID** | EES-005 |
| **Title** | AI CEO |
| **Status** | Draft |
| **Owner** | AI Strategy |
| **Last Updated** | 2026-06-29 |

---

## 1. Mission

Act as the strategic intelligence layer of Eunoia Media OS — synthesising revenue data, content performance, audience signals, and creator goals into concrete, prioritised decisions about what to create, when to publish, and how to grow — so that creators receive the clarity of a seasoned media executive without the overhead of one.

---

## 2. Business Goal

Successful content businesses operate with strategic intentionality: they know which content type drives growth, which audience segment to prioritise this quarter, how much production capacity to allocate to different formats, and when to double down on a trend versus when to wait. This level of strategic clarity is typically available only to creators with access to experienced management — a very small minority.

The AI CEO democratises this capability. By consuming the full data picture from across Eunoia's systems — revenue from EES-001, production state from EES-002, publish performance from EES-003, learning signals from EES-004 — and reasoning against the creator's stated goals, it produces a rolling 30-day strategic plan, weekly execution priorities, and automated workflow triggers that remove the need for the creator to make routine operational decisions.

The business goal is to enable a solo creator or small team to execute with the strategic coherence of a professionally managed media company, increasing average channel monthly revenue by 30% over 12 months for creators who follow AI CEO guidance with at least 70% fidelity.

---

## 3. Scope

- Strategic planning: generation and maintenance of a 30-day content and revenue strategy aligned to creator goals.
- Weekly execution briefing: ranked priority list of actions the creator should take in the next 7 days.
- Automated workflow orchestration: trigger EES-002 ingestion, EES-003 scheduling, and deal pipeline actions based on strategic plan state.
- Revenue opportunity identification: identify gaps in the creator's monetisation mix and recommend specific actions.
- Growth lever analysis: identify which inputs (upload frequency, video length, topic mix) have the highest marginal impact on the creator's specific growth objective.
- Decision advisory: when the creator faces a binary decision (accept brand deal, pivot content direction, launch membership), provide a structured AI recommendation with supporting data.
- Cross-system state awareness: maintain a real-time picture of the creator's channel health across all Eunoia systems.

---

## 4. Out of Scope

- Autonomous publishing: the AI CEO may recommend and schedule, but the creator must confirm any publish action. It does not publish autonomously.
- Financial transactions: the AI CEO may recommend accepting a deal, but payment actions are always creator-initiated.
- Legal or contractual advice: deal recommendations are strategic, not legal. Creators must seek legal review of contracts independently.
- Community management or audience interaction.
- Hiring or team management decisions (future capability in EES-007 Agency OS).
- Real-time market data outside what is available through connected platform APIs.

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Monthly revenue growth for guided creators | +30% over 12 months | Cohort comparison vs. non-guided creators |
| Strategic plan adherence rate | > 70% of recommended actions taken within suggested timeframe | Action tracking per week |
| Weekly briefing actionability | > 80% of briefing items rated actionable by creator | Creator feedback rating |
| Growth lever recommendation accuracy | Predicted impact within ±15% of actual outcome | Backtested across cohort |
| Automated workflow trigger success rate | > 99% of AI-triggered workflows complete without error | Workflow execution logs |
| Decision advisory time to recommendation | < 60 seconds for standard decisions | Response latency measurement |

---

## 6. Actors

| Actor | Type | Description |
|-------|------|-------------|
| Creator | Human | Sets goals, reviews strategic plans, approves recommendations, rates advice quality. |
| AI CEO | AI System | Synthesises all Eunoia system data into strategic plans, briefings, and recommendations. |
| Strategic Planner | AI Sub-Component | Generates and updates the 30-day strategic content plan. |
| Revenue Opportunity Analyser | AI Sub-Component | Identifies monetisation gaps and recommends specific actions. |
| Workflow Orchestrator | System | Executes AI-triggered workflow actions across connected Eunoia systems. |
| Event Bus | System | Feeds AI CEO with real-time state changes from all Eunoia systems. |
| EES-001, EES-002, EES-003, EES-004 | Internal Systems | Data sources for the AI CEO reasoning context. |

---

## 7. Inputs

| Input | Source | Format | Frequency |
|-------|--------|--------|-----------|
| Creator goals configuration | Creator | Structured JSON (goal type, target, timeframe) | On change |
| Channel performance model | EES-004 | `ChannelPerformanceModel` | On `learning.model.updated` event |
| Revenue summary | EES-001 | Revenue ledger summary + forecast | Daily + on `revenue.forecast.updated` |
| Active brand deal pipeline | EES-001 | `BrandDeal[]` | Real-time via events |
| Publishing schedule | EES-003 | `PublishRequest[]` | Real-time via events |
| Asset production pipeline state | EES-002 | `VideoAsset[]` summary | Real-time via events |
| Decision prompt | Creator | Free text question | On demand |
| Creator feedback on prior recommendations | Creator | Rating + optional note | Per recommendation interaction |

---

## 8. Outputs

| Output | Consumer | Format | Trigger |
|--------|----------|--------|---------|
| `StrategicPlan` (30-day) | Creator dashboard | Structured document | Weekly refresh + on goal change |
| `WeeklyBriefing` | Creator dashboard | Prioritised action list | Every Monday 07:00 creator local time |
| `DecisionAdvisory` | Creator dashboard | Structured recommendation + rationale | On creator decision prompt |
| `RevenueOpportunity[]` | Creator dashboard | Ranked list | On revenue forecast update |
| `WorkflowTrigger` | Workflow Orchestrator | Internal command | On AI CEO strategic trigger condition |
| `aiceo.plan.updated` event | Event Bus | Domain event | On plan generation |
| `aiceo.briefing.generated` event | Event Bus | Domain event | On briefing generation |
| `aiceo.opportunity.identified` event | Event Bus | Domain event | On opportunity detection |

---

## 9. Business Rules

**BR-001 — Creator Goal Requirement:** The AI CEO will not generate a strategic plan without at least one configured creator goal. Goal types: `ViewGrowth`, `SubscriberGrowth`, `RevenueGrowth`, `WatchTimeGrowth`, `AudienceExpansion`.

**BR-002 — Human in the Loop for Consequential Actions:** The AI CEO may schedule videos, queue deal evaluations, and set draft recommendations autonomously. It may not confirm publish actions, accept deals, or send external communications without explicit creator approval.

**BR-003 — Strategic Plan Freshness:** A strategic plan older than 7 days is considered stale and is automatically refreshed on the next weekly cycle. If significant new data arrives (new performance model, revenue anomaly, large deal entered), an immediate plan refresh is triggered.

**BR-004 — Recommendation Traceability:** Every recommendation in the strategic plan and weekly briefing must be traceable to specific data inputs. Recommendations without a data source reference are not permitted.

**BR-005 — Conflicting Recommendation Resolution:** If the AI CEO generates a recommendation that conflicts with a previous recommendation the creator has already acted on, the conflict must be surfaced and explained before the new recommendation is presented.

**BR-006 — Goal Hierarchy:** When multiple creator goals conflict (e.g., maximising views conflicts with maximising revenue for some content types), the AI CEO resolves the conflict using a priority ordering the creator has configured. If no priority order is configured, the system presents the conflict to the creator for resolution.

**BR-007 — Decision Advisory Scope:** Decision advisory responses are limited to decisions within the creator's content business domain. Requests outside this scope (legal, health, financial compliance) return a scoped refusal with a recommendation to seek appropriate professional guidance.

**BR-008 — Feedback Loop:** Creator ratings on recommendations (1–5 scale) are fed back into the AI CEO's recommendation scoring model as signal. Consistent low ratings on a recommendation category trigger a model adjustment and a creator notification.

---

## 10. AI Decision Flow

### 10.1 Strategic Plan Generation

**Intent:** Produce a 30-day strategic plan that tells the creator what to create, how often to publish, which monetisation actions to pursue, and which growth levers to prioritise.

**Inputs:**
- Creator goal configuration (type, target metric, deadline)
- `ChannelPerformanceModel` from EES-004
- Revenue summary and 30-day forecast from EES-001
- Active brand deal pipeline
- Current production pipeline state (videos in progress, scheduled, backlog)
- Last 30 days of actual vs. recommended performance comparison

**Reasoning Chain:**
1. Establish baseline: current position on each goal metric vs. target.
2. Identify the top 3 growth levers from the channel performance model with the highest expected impact-per-effort for the current goal priority.
3. Design a content calendar for 30 days: video count per week, topic mix aligned to high-performing categories, format recommendations (long-form, Short, live).
4. Identify monetisation gaps: compare current revenue mix against estimated potential given channel size; flag underutilised streams.
5. Identify brand deal timing: given deal pipeline and production schedule, recommend deal execution windows.
6. Synthesise into a prioritised plan with weekly milestones.

**Output Contract:**
```json
{
  "planId": "string (uuid)",
  "channelId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "validUntil": "ISO 8601 timestamp",
  "primaryGoal": { "type": "string", "target": "number", "deadline": "ISO 8601 date", "currentValue": "number" },
  "contentCalendar": [
    {
      "weekStartDate": "ISO 8601 date",
      "targetPublishCount": "number",
      "topicRecommendations": ["string"],
      "formatRecommendations": ["string"],
      "rationale": "string"
    }
  ],
  "monetisationActions": [
    { "priority": "high | medium | low", "action": "string", "estimatedRevenueImpact": "string", "timeframe": "string" }
  ],
  "growthLevers": [
    { "lever": "string", "currentValue": "string", "targetValue": "string", "expectedImpact": "string" }
  ],
  "weeklyMilestones": [
    { "week": "number", "milestones": ["string"] }
  ],
  "modelVersion": "string"
}
```

---

### 10.2 Weekly Briefing

**Intent:** Reduce the creator's weekly decision overhead to a single, prioritised action list they can complete before starting production.

**Inputs:**
- Current `StrategicPlan`
- Progress against last week's milestones
- New performance data from EES-004 (videos published in the past week)
- Upcoming scheduled publish jobs from EES-003
- Brand deal milestones due in the next 7 days

**Reasoning Chain:**
1. Evaluate progress against last week's milestones; score each as complete, partial, or missed.
2. Carry forward incomplete high-priority milestones.
3. Derive this week's top 5 actions from the strategic plan's current milestone set, adjusted for last week's actual progress.
4. Enrich each action with context: specific asset to work on, specific deal to respond to, specific metric that triggered the priority.
5. Order by urgency × strategic importance.

**Output Contract:**
```json
{
  "briefingId": "string (uuid)",
  "channelId": "string",
  "weekStartDate": "ISO 8601 date",
  "generatedAt": "ISO 8601 timestamp",
  "lastWeekProgress": { "complete": "number", "partial": "number", "missed": "number" },
  "actions": [
    {
      "rank": "number",
      "category": "publish | deal | production | analytics | monetisation",
      "action": "string",
      "context": "string",
      "urgency": "high | medium | low",
      "linkedEntityId": "string | null",
      "linkedEntityType": "string | null"
    }
  ],
  "planAlignmentScore": "number"
}
```

---

### 10.3 Decision Advisory

**Intent:** Respond to a specific binary or multi-option creator decision with a structured recommendation grounded in channel data.

**Inputs:**
- Creator's decision prompt (free text)
- Relevant system context automatically resolved: current revenue state, active deals, production state, performance model
- Creator's goal configuration
- Historical similar decisions and their outcomes (if available)

**Reasoning Chain:**
1. Parse the decision type and identify the relevant data dimensions.
2. For each option in the decision, estimate the expected outcome across the creator's goal dimensions.
3. Identify risks and second-order effects for each option.
4. Apply the creator's goal priority order to rank options.
5. Produce a structured recommendation with a clear recommendation, supporting data, risks, and confidence level.

**Output Contract:**
```json
{
  "advisoryId": "string (uuid)",
  "channelId": "string",
  "promptSummary": "string",
  "recommendation": "string",
  "confidence": "high | medium | low",
  "rationale": "string",
  "options": [
    {
      "option": "string",
      "expectedOutcomes": [{ "metric": "string", "estimate": "string" }],
      "risks": ["string"],
      "recommended": "boolean"
    }
  ],
  "dataSourcesSummary": ["string"],
  "caveat": "string | null",
  "generatedAt": "ISO 8601 timestamp"
}
```

---

## 11. Data Model

### CreatorGoal

```typescript
interface CreatorGoal {
  readonly id: string;
  readonly channelId: string;
  readonly type: GoalType;              // enum: ViewGrowth | SubscriberGrowth | RevenueGrowth | WatchTimeGrowth | AudienceExpansion
  readonly targetValue: number;
  readonly currentValue: number;
  readonly deadline: Date;
  readonly priority: number;            // 1 = highest
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### StrategicPlan

```typescript
interface StrategicPlan {
  readonly id: string;
  readonly channelId: string;
  readonly generatedAt: Date;
  readonly validUntil: Date;
  readonly primaryGoal: CreatorGoal;
  readonly contentCalendar: ReadonlyArray<WeeklyContentPlan>;
  readonly monetisationActions: ReadonlyArray<MonetisationAction>;
  readonly growthLevers: ReadonlyArray<GrowthLever>;
  readonly weeklyMilestones: ReadonlyArray<WeeklyMilestone>;
  readonly modelVersion: string;
  readonly status: PlanStatus;          // enum: Active | Stale | Superseded
}
```

### WeeklyBriefing

```typescript
interface WeeklyBriefing {
  readonly id: string;
  readonly channelId: string;
  readonly weekStartDate: Date;
  readonly generatedAt: Date;
  readonly lastWeekProgress: MilestoneProgress;
  readonly actions: ReadonlyArray<BriefingAction>;
  readonly planAlignmentScore: number;
  readonly planId: string;
}
```

### DecisionAdvisory

```typescript
interface DecisionAdvisory {
  readonly id: string;
  readonly channelId: string;
  readonly prompt: string;
  readonly promptSummary: string;
  readonly recommendation: string;
  readonly confidence: 'high' | 'medium' | 'low';
  readonly rationale: string;
  readonly options: ReadonlyArray<AdvisoryOption>;
  readonly dataSourcesSummary: ReadonlyArray<string>;
  readonly caveat: string | null;
  readonly creatorRating: number | null;
  readonly generatedAt: Date;
}
```

---

## 12. Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `aiceo.plan.generated` | New 30-day strategic plan created | `{ planId, channelId, primaryGoalType, validUntil }` |
| `aiceo.plan.refreshed` | Existing plan updated due to new data | `{ planId, channelId, triggerReason }` |
| `aiceo.briefing.generated` | Weekly briefing produced | `{ briefingId, channelId, weekStartDate, actionCount }` |
| `aiceo.opportunity.identified` | Revenue opportunity detected | `{ opportunityId, channelId, type, estimatedRevenueImpact }` |
| `aiceo.advisory.requested` | Creator submits a decision prompt | `{ advisoryId, channelId, promptSummary }` |
| `aiceo.advisory.delivered` | Advisory recommendation returned | `{ advisoryId, channelId, confidence }` |
| `aiceo.workflow.triggered` | AI CEO triggers an automated workflow | `{ workflowType, channelId, targetSystemId, parameters }` |
| `aiceo.recommendation.rated` | Creator rates a recommendation | `{ entityId, entityType, rating, channelId }` |

---

## 13. APIs

### GET /api/v1/channels/:channelId/aiceo/plan

Returns the current active strategic plan.

---

### POST /api/v1/channels/:channelId/aiceo/plan/refresh

Manually triggers a plan refresh. Rate-limited to once per 12 hours outside of automatic cycles.

---

### GET /api/v1/channels/:channelId/aiceo/briefing/current

Returns the current week's briefing.

---

### GET /api/v1/channels/:channelId/aiceo/briefing/history

Returns past weekly briefings.

**Query Parameters:** `page`, `limit` (max 52 — one year).

---

### POST /api/v1/channels/:channelId/aiceo/advisory

Submits a decision prompt and returns a `DecisionAdvisory`.

**Request Body:** `{ prompt: string }`

**Response 200:** `DecisionAdvisory` object. Latency target: < 60 seconds.

---

### GET /api/v1/channels/:channelId/aiceo/opportunities

Returns active revenue opportunity recommendations.

**Query Parameters:** `priority`, `type`.

---

### POST /api/v1/channels/:channelId/aiceo/goals

Creates or updates creator goals.

**Request Body:** `CreatorGoal[]`

---

### PATCH /api/v1/channels/:channelId/aiceo/briefing/:briefingId/actions/:actionRank/rate

Creator rates a briefing action.

**Request Body:** `{ rating: number, note?: string }` (rating 1–5)

---

## 14. Plugin Contracts

The AI CEO exposes an extension point for third-party strategic signal providers.

### StrategicSignalPlugin

```typescript
interface StrategicSignalPlugin extends IPlugin {
  readonly signalType: string;
  readonly signalDisplayName: string;
  fetchSignals(channelId: string, since: Date): Promise<ReadonlyArray<StrategicSignal>>;
  getSignalRelevanceScore(signal: StrategicSignal, goals: ReadonlyArray<CreatorGoal>): number;
}

interface StrategicSignal {
  readonly id: string;
  readonly type: string;
  readonly summary: string;
  readonly dataPoints: Record<string, unknown>;
  readonly relevantGoalTypes: ReadonlyArray<string>;
  readonly fetchedAt: Date;
  readonly sourceUrl: string | null;
}
```

Plugins must declare the `Analytics` and `Network` permissions. Strategic signals from plugins are treated as advisory context to the AI CEO reasoning — they do not override data from core Eunoia systems.

---

## 15. Security

**AI Context Boundary:** The AI CEO's reasoning context includes only data from the creator's own channel and connected systems. No cross-channel data enters the reasoning context (alignment with EES-004 BR-004).

**Decision Prompt Safety:** Creator decision prompts are passed through a content policy layer before reaching the AI reasoning chain. Out-of-scope prompts (BR-007) receive a scoped refusal. Prompts are logged for quality review but are treated as creator-confidential and not used for cross-creator model training without explicit consent.

**Strategic Plan Confidentiality:** Strategic plans, briefings, and advisory responses are creator-private documents. They are not exposed to third-party systems, plugins, or analytics pipelines without creator consent.

**Workflow Trigger Authorisation:** The Workflow Orchestrator validates that every AI CEO-triggered workflow action falls within the pre-approved workflow scope configured by the creator. Workflows outside the approved scope require explicit creator confirmation.

**Audit Trail:** All AI CEO outputs — plans, briefings, advisories, workflow triggers — are appended to an immutable AI decision audit log including generation timestamp, model version, and the data snapshot used as context.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Strategic plan quality degrades if one upstream data source is stale | High | Medium | Surface data staleness in the plan header; lower confidence scores for recommendations that depend on stale inputs |
| Creator over-relies on AI CEO, atrophying their own strategic judgement | Medium | Medium | Frame all outputs as recommendations, not directives; explicitly surface the reasoning so creators engage with it |
| Recommendation hallucination: AI generates confident recommendation unsupported by data | Medium | High | Enforce BR-004 traceability; all recommendations must reference a specific data source; implement hallucination detection via output validation layer |
| AI CEO strategic advice conflicts with a time-sensitive external event (trend, platform change) | Medium | Medium | Daily re-evaluation of the strategic plan against new signals from connected systems |
| Workflow orchestrator triggers unintended cascades when multiple conditions fire simultaneously | Low | High | Implement workflow idempotency keys; apply a minimum 5-minute gap between concurrent workflow triggers from the AI CEO |

---

## 17. Future Improvements

- Team-aware planning: incorporate team member capacity (from EES-007 Agency OS) into production recommendations.
- Trend monitoring integration: ingest external content trend signals (search trends, social listening) as strategic context.
- Scenario planning: generate alternative 30-day plans under different assumptions (upload twice per week vs. once, launch membership now vs. in 3 months).
- AI CEO voice interface: conversational interaction mode for weekly briefing review and decision advisory.
- Long-horizon planning: 90-day and annual strategic plans with quarterly review cycles.

---

## 18. Acceptance Criteria

**AC-001 — Plan Requires Goal:** Given a channel with no configured goals, when a strategic plan is requested, then the system returns a validation error instructing the creator to configure at least one goal.

**AC-002 — Plan Data Traceability:** Given a generated strategic plan, when any recommendation in the plan is inspected, then the `rationale` field references a specific data source and the data source is accessible via the relevant Eunoia system API.

**AC-003 — Weekly Briefing Delivery:** Given a creator with an active strategic plan, when Monday 07:00 arrives in the creator's configured timezone, then a `WeeklyBriefing` is generated and the `aiceo.briefing.generated` event is published.

**AC-004 — Decision Advisory Latency:** Given a creator-submitted decision prompt, when the advisory endpoint is called, then a response is returned within 60 seconds for all standard decision types.

**AC-005 — No Autonomous Publish:** Given an AI CEO recommendation to publish at a specific time, when that time arrives without creator confirmation, then no publish action is initiated and the creator receives a reminder notification.

**AC-006 — Plan Staleness Refresh:** Given a strategic plan that is 7 days old, when the next plan generation cycle runs, then the existing plan is replaced with a freshly generated plan and the `aiceo.plan.refreshed` event is published.

**AC-007 — Feedback Signal Uptake:** Given a creator who rates 5 consecutive recommendations in a specific category as 1 or 2, then the AI CEO logs a model adjustment event and surfaces a notification to the creator that recommendations in that category are being recalibrated.

**AC-008 — Scope Refusal:** Given a decision prompt that asks for legal advice on a contract, when the advisory endpoint is called, then the system returns a refusal that acknowledges the request is out of scope and recommends appropriate professional guidance.

---

## 19. Dependencies

| Dependency | Type | Reference |
|------------|------|-----------|
| EES-001 Revenue Intelligence | Internal | Revenue summary, deal pipeline, forecasts |
| EES-002 Media Pipeline | Internal | Production pipeline state |
| EES-003 Publishing | Internal | Publishing schedule and history |
| EES-004 Learning Engine | Internal | `ChannelPerformanceModel`, recommendations, performance data |
| AI Provider Framework | Internal | `src/ai/application/AIService.ts` (Claude as primary provider) |
| Core Event Bus | Internal | `src/core/events/InMemoryEventBus.ts` |
| Core Scheduler | Internal | `src/core/scheduler/SchedulerService.ts` (weekly briefing scheduling) |
| Supabase (Auth + Database) | Infrastructure | `src/core/config/AppConfig.ts` |

---

## 20. Current Status

**Status:** Draft

The following decisions are required before this specification can advance to Approved:

- AI provider selection for the AI CEO reasoning layer. Claude is the primary candidate given its long-context reasoning capability; GPT-4o as fallback. Multi-provider routing strategy must be defined.
- Workflow orchestrator scope must be precisely defined: which cross-system actions may the AI CEO trigger autonomously vs. requiring confirmation?
- Decision prompt safety and content moderation approach must be specified.
- Creator goal schema must be validated by product to ensure it captures the full range of creator objectives.
- Weekly briefing scheduling mechanism must be confirmed (Scheduler cron vs. external cron job).
