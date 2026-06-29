# EES-006: Plugin Marketplace

| Field | Value |
|-------|-------|
| **ID** | EES-006 |
| **Title** | Plugin Marketplace |
| **Status** | Future |
| **Owner** | Product |
| **Last Updated** | 2026-06-29 |

---

## 1. Mission

Establish an open, governed marketplace where third-party developers can publish plugins that extend Eunoia Media OS, and creators can discover, evaluate, install, and manage these plugins with the same trust and reliability they expect from native capabilities.

---

## 2. Business Goal

The enterprise plugin framework defined in `src/plugins/` provides the technical foundation for third-party extensibility. The Plugin Marketplace is the distribution layer that makes this extensibility accessible to creators without requiring technical expertise. By enabling a developer ecosystem, Eunoia can extend its platform coverage — new revenue streams, new publishing platforms, new analytics sources, new AI tools — at a velocity that in-house engineering alone cannot sustain.

The business goal is to reach 50 published, quality-reviewed plugins within 18 months of marketplace launch, and to have at least 30% of paid Eunoia subscribers actively using at least one marketplace plugin. This creates an ecosystem flywheel: more plugins attract more creators; more creators attract more developers.

---

## 3. Scope

- Plugin discovery interface: search, browse by category, and filter by permission requirement and compatibility.
- Publisher onboarding: developer registration, identity verification, and developer agreement acceptance.
- Plugin submission and review workflow: automated technical validation, manual quality review, approval or rejection.
- Plugin versioning: publish, deprecate, and update versions with backward compatibility guarantees.
- Creator installation workflow: one-click install, permission grant flow, configuration wizard.
- Plugin billing: free, paid (one-time), and subscription pricing models supported.
- Creator review and rating system: verified-install-only reviews, publisher response capability.
- Plugin lifecycle management for creators: install, enable, disable, update, uninstall through the existing `PluginLifecycleManager`.
- Publisher analytics: install count, active user count, crash rate, average rating per plugin version.
- Marketplace source trust model: official (Eunoia-built), community (verified publisher), private (organisation-only).

---

## 4. Out of Scope

- Plugin execution environment hosting. Plugins run within the creator's Eunoia instance; the marketplace is a distribution and billing layer only.
- Eunoia-managed plugin infrastructure. Plugin authors are responsible for any external services their plugin calls.
- Plugin dispute resolution beyond review moderation. Legal disputes between creators and publishers are out of scope.
- Internal plugin registry (`src/plugins/registry/`) — this is a runtime concern, not a marketplace concern.

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Published plugins (18 months post-launch) | 50 | Marketplace plugin count |
| Active plugin users (% of paid subscribers) | 30% | Unique creator plugin installs vs. paid subscriber count |
| Plugin review cycle time (submission to decision) | < 5 business days | Submission timestamp to approval/rejection timestamp |
| Marketplace review verified-install rate | 100% | Review validation check |
| Plugin crash rate for marketplace plugins | < 0.5% of installs | `PluginMetrics.crashes` aggregated by plugin |
| Publisher revenue share disbursement accuracy | 100% | Billing reconciliation audit |

---

## 6. Actors

| Actor | Type | Description |
|-------|------|-------------|
| Creator | Human | Discovers, installs, configures, and reviews marketplace plugins. |
| Plugin Developer | Human | Registers as a publisher, submits plugin packages, manages versions. |
| Marketplace Reviewer | Human (Eunoia) | Reviews submitted plugins for technical compliance and quality standards. |
| Marketplace API | System | Serves plugin search, install, and version management requests. |
| Billing System | System | Handles plugin purchase and subscription transactions. |
| Plugin Validator | System | Automated pre-review validation of submitted plugin packages. |
| PluginLifecycleManager | System | Executes install, configure, start, and uninstall operations. |
| Publisher Portal | System | Developer-facing interface for submission, version management, and analytics. |

---

## 7. Inputs

| Input | Source | Format | Trigger |
|-------|--------|--------|---------|
| Plugin package (manifest + entry point) | Plugin Developer | Zip archive containing `plugin.json` | Developer submission |
| Publisher registration details | Plugin Developer | Form submission | Developer onboarding |
| Reviewer decision | Marketplace Reviewer | Approval / rejection with notes | On review completion |
| Creator install request | Creator | API call | On creator install action |
| Creator plugin configuration | Creator | Key-value pairs per `PluginManifest.configSchema` | At install or on settings change |
| Creator review submission | Creator | 1–5 rating + text | Post-install, after minimum 7 days active use |
| Plugin version update submission | Plugin Developer | New zip archive | Developer update |

---

## 8. Outputs

| Output | Consumer | Format | Trigger |
|--------|----------|--------|---------|
| Plugin listing | Creator (marketplace browse) | `MarketplacePlugin` entity | On approved plugin |
| Search results | Creator | `MarketplacePlugin[]` ranked list | On search query |
| Install confirmation | Creator | Installed `PluginMetadata` | On install complete |
| Purchase receipt | Creator | Email + in-app record | On successful payment |
| Review visibility | Public (all creators) | Rendered review | On review approval |
| Publisher analytics report | Plugin Developer | Aggregated stats | Daily refresh |
| `marketplace.plugin.installed` event | Event Bus | Domain event | On install |
| `marketplace.plugin.published` event | Event Bus | Domain event | On approval |
| `marketplace.plugin.version_updated` event | Event Bus | Domain event | On version publish |

---

## 9. Business Rules

**BR-001 — Review Required:** No plugin may be listed in the marketplace without passing both automated validation and manual review. Automated validation checks manifest schema compliance, permission declaration accuracy, and absence of prohibited API calls. Manual review evaluates documentation completeness, functional correctness, and brand safety.

**BR-002 — Semantic Versioning:** All plugin versions must follow semantic versioning (MAJOR.MINOR.PATCH). A MAJOR version increment signals a breaking change. Creators with a plugin installed at version 1.x are not automatically updated to version 2.x.

**BR-003 — Permission Transparency:** The install flow must display every permission requested by the plugin, with a human-readable explanation of what each permission enables. A creator may not complete installation without explicitly acknowledging the permission list.

**BR-004 — Verified Reviews Only:** A creator may only submit a review for a plugin if they have had that plugin installed and active for at least 7 consecutive days. The system enforces this at the review submission API level.

**BR-005 — Revenue Share:** Eunoia retains 30% of all marketplace plugin revenue. Publishers receive 70%. Disbursements are processed monthly. Plugins distributed as free tools are exempt.

**BR-006 — Vulnerability Response SLA:** If a security vulnerability is confirmed in a marketplace plugin, the publisher has 48 hours to publish a remediated version. After 48 hours without a fix, the plugin is automatically delisted. It may be relisted upon submission and approval of a remediated version.

**BR-007 — Deprecation Notice:** A plugin publisher must provide at least 60 days notice before marking a paid plugin as deprecated. Creators with an active paid plan receive a refund of any remaining subscription period beyond the deprecation date.

**BR-008 — Private Plugins:** Organisations on an Agency OS plan (EES-007) may publish private plugins visible only to their organisation's workspace. Private plugins follow the same validation process but skip marketplace listing and public review.

---

## 10. AI Decision Flow

### 10.1 Plugin Compatibility Recommendation

**Intent:** Recommend relevant plugins to a creator based on their current system state, goals, and usage patterns.

**Inputs:**
- Creator's currently installed plugins
- Creator's connected platform accounts
- Creator's configured goals (from EES-005)
- Creator's publishing platforms (from EES-003)
- Plugin category performance data (install rate, retention rate, average rating)

**Reasoning Chain:**
1. Identify gaps in the creator's current plugin coverage relative to their goal type.
2. Filter marketplace plugins by compatibility with the creator's engine version.
3. Score remaining plugins by: relevance to creator's active platforms, creator's goal type alignment, and average creator rating.
4. Exclude plugins the creator has previously uninstalled.
5. Return the top 5 recommended plugins with individual rationale.

**Output Contract:**
```json
{
  "recommendationId": "string (uuid)",
  "channelId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "recommendations": [
    {
      "pluginId": "string",
      "pluginName": "string",
      "relevanceScore": "number",
      "rationale": "string",
      "category": "string"
    }
  ]
}
```

---

### 10.2 Automated Submission Validation

**Intent:** Identify technical compliance issues in a submitted plugin package before it reaches manual review.

**Inputs:**
- Submitted `plugin.json` manifest
- Declared permissions vs. observed API call patterns in the entry point (static analysis)
- Comparison against current `IPlugin` interface contract

**Reasoning Chain:**
1. Parse and validate `plugin.json` against the `PluginManifest` schema.
2. Compare declared permissions against API surfaces called in the entry point.
3. Flag undeclared permission usage.
4. Check engine version compatibility range against the current Eunoia release.
5. Return a structured validation report.

**Output Contract:**
```json
{
  "validationId": "string (uuid)",
  "submissionId": "string",
  "passed": "boolean",
  "errors": [{ "code": "string", "message": "string", "field": "string | null" }],
  "warnings": [{ "code": "string", "message": "string" }],
  "permissionAudit": {
    "declared": ["string"],
    "detected": ["string"],
    "undeclared": ["string"]
  }
}
```

---

## 11. Data Model

The marketplace domain models are defined in `src/plugins/marketplace/MarketplaceModels.ts`. Additional marketplace-specific entities:

### MarketplaceSubmission

```typescript
interface MarketplaceSubmission {
  readonly id: string;
  readonly publisherId: string;
  readonly pluginId: string;
  readonly version: string;
  readonly packageStorageKey: string;
  readonly status: SubmissionStatus;   // enum: Pending | Validating | AwaitingReview | Approved | Rejected | Withdrawn
  readonly validationReport: PluginValidationReport | null;
  readonly reviewNotes: string | null;
  readonly reviewedBy: string | null;
  readonly reviewedAt: Date | null;
  readonly submittedAt: Date;
}
```

### CreatorPluginInstall

```typescript
interface CreatorPluginInstall {
  readonly id: string;
  readonly channelId: string;
  readonly pluginId: string;
  readonly version: string;
  readonly installedAt: Date;
  readonly purchaseId: string | null;
  readonly permissionsGranted: ReadonlyArray<PluginPermission>;
  readonly activeSince: Date | null;
  readonly status: CreatorInstallStatus;  // enum: Active | Disabled | Uninstalled
}
```

---

## 12. Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `marketplace.plugin.submitted` | Developer submits a plugin | `{ submissionId, pluginId, publisherId, version }` |
| `marketplace.plugin.validated` | Automated validation complete | `{ submissionId, passed, errorCount }` |
| `marketplace.plugin.approved` | Reviewer approves submission | `{ submissionId, pluginId, version }` |
| `marketplace.plugin.rejected` | Reviewer rejects submission | `{ submissionId, pluginId, reason }` |
| `marketplace.plugin.published` | Plugin goes live in marketplace | `{ pluginId, version, category }` |
| `marketplace.plugin.installed` | Creator installs a plugin | `{ pluginId, channelId, version }` |
| `marketplace.plugin.uninstalled` | Creator uninstalls a plugin | `{ pluginId, channelId }` |
| `marketplace.plugin.delisted` | Plugin removed from marketplace | `{ pluginId, reason, durationDays }` |
| `marketplace.plugin.version_updated` | New version published | `{ pluginId, previousVersion, newVersion }` |
| `marketplace.review.submitted` | Creator submits a review | `{ reviewId, pluginId, rating }` |

---

## 13. APIs

### GET /api/v1/marketplace/plugins

Returns paginated plugin listing.

**Query Parameters:** `category`, `search`, `minRating`, `free`, `page`, `limit` (max 50).

---

### GET /api/v1/marketplace/plugins/:pluginId

Returns full plugin detail including all versions, ratings summary, and publisher info.

---

### POST /api/v1/marketplace/plugins/:pluginId/install

Initiates a plugin installation for the authenticated creator's channel. Triggers the permission acknowledgment flow before installation proceeds.

**Request Body:** `{ version: string, acceptedPermissions: PluginPermission[] }`

---

### DELETE /api/v1/marketplace/plugins/:pluginId/install

Uninstalls a plugin from the creator's channel.

---

### GET /api/v1/marketplace/recommendations

Returns AI-recommended plugins for the authenticated creator.

---

### POST /api/v1/marketplace/submissions

Publisher submits a new plugin version.

**Request Body:** Multipart form with `pluginId`, `version`, `changelog`, and the plugin package archive.

---

### GET /api/v1/marketplace/submissions/:submissionId

Returns the current state of a submission including validation report and review notes.

---

### POST /api/v1/marketplace/plugins/:pluginId/reviews

Creator submits a review. Enforces BR-004 at the API layer.

**Request Body:** `{ rating: number, body: string }`

---

## 14. Plugin Contracts

The Plugin Marketplace does not define new plugin contracts — it is the distribution layer for plugins that implement contracts defined in EES-001 through EES-005. All published marketplace plugins must implement `IPlugin` and declare their implemented extension contract in the manifest `capabilities` field.

A marketplace plugin that implements `RevenueConnectorPlugin` (EES-001) must declare capability name `revenue.connector`. This allows the marketplace to filter and recommend plugins by the Eunoia extension points they fulfil.

---

## 15. Security

**Package Integrity:** All submitted plugin packages are stored with their SHA-256 checksum. At install time, the package is re-verified against this checksum before execution. Tampered packages are rejected at installation.

**Permission Enforcement:** Plugin permissions declared in the manifest are enforced at runtime by the `PluginLifecycleManager` via the `PluginContext`. A plugin that attempts to access a resource not in its declared permission set receives an access denied error, and a `plugin.permission_violation` event is published.

**Publisher Identity Verification:** Publishers must verify their identity via email and provide valid payment account details before any paid plugins may be listed. Publisher accounts are subject to ongoing fraud monitoring.

**Sandboxing Strategy:** Plugin execution within the Eunoia runtime is scoped by the `PluginContext` dependency injection pattern — plugins receive only the interfaces they are authorised to use and have no access to the broader runtime or other plugins' contexts.

**Vulnerability Disclosure:** Eunoia maintains a responsible disclosure programme for marketplace plugin vulnerabilities. Disclosed vulnerabilities trigger the 48-hour SLA defined in BR-006.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Malicious plugin exfiltrates creator data despite declared permissions | Low | Critical | Runtime permission enforcement at context layer; anomaly detection on plugin network activity |
| Low developer adoption limits marketplace value | Medium | High | Publish a comprehensive plugin SDK and sample plugins for each extension contract; run a developer incentive programme at launch |
| Plugin review bottleneck slows ecosystem growth | Medium | Medium | Automated validation handles most compliance checks; manual review focuses only on security and brand safety |
| Plugin billing disputes between creators and publishers | Medium | Low | Clear billing terms in developer agreement; in-app purchase history always accessible |
| Breaking change in Eunoia `IPlugin` interface causes mass plugin incompatibility | Low | High | Semantic versioning for core interfaces; deprecation window of 6 months minimum for any breaking change |

---

## 17. Future Improvements

- Plugin SDK and CLI tooling for local development, testing, and submission.
- Plugin sandboxing via WASM or V8 isolates for stronger runtime isolation.
- Automated regression testing of marketplace plugins against new Eunoia versions.
- Featured plugin programme with revenue sharing bonuses for high-quality plugins.
- Co-created plugins: Eunoia partners with top publishers to build official-tier community plugins.
- Plugin bundles: curated collections of complementary plugins for specific creator types.

---

## 18. Acceptance Criteria

To be defined when this specification advances to In Progress status. The following areas must be covered:

- Submission workflow: developer can submit, validate, and publish a plugin.
- Install workflow: creator can discover, review permissions, pay (if applicable), and install a plugin.
- Plugin lifecycle: installed plugin activates through the `PluginLifecycleManager` without errors.
- Permission enforcement: plugin attempting to access undeclared resources is blocked and the violation is logged.
- Review submission gate: review before 7-day active install threshold is rejected.
- Vulnerability delist: plugin is delisted automatically when the 48-hour SLA expires without a fix.

---

## 19. Dependencies

| Dependency | Type | Reference |
|------------|------|-----------|
| Plugin Framework | Internal | `src/plugins/` |
| `PluginLifecycleManager` | Internal | `src/plugins/lifecycle/PluginLifecycleManager.ts` |
| `PluginRegistry` | Internal | `src/plugins/registry/PluginRegistry.ts` |
| `ManifestValidator` | Internal | `src/plugins/loader/ManifestValidator.ts` |
| Marketplace Domain Models | Internal | `src/plugins/marketplace/MarketplaceModels.ts` |
| AI Provider Framework | Internal | `src/ai/application/AIService.ts` |
| Billing System | External | Vendor TBD (Stripe) |
| Supabase (Auth + Storage) | Infrastructure | `src/core/config/AppConfig.ts` |
| EES-005 AI CEO | Internal | Creator goals for plugin recommendation |
| EES-007 Agency OS | Internal | Private plugin support for organisation workspaces |

---

## 20. Current Status

**Status:** Future

This specification is queued for authorship. It will advance to Draft when the following preconditions are met:

- EES-001 through EES-005 are all at Approved or Implemented status.
- A decision is made on billing vendor (Stripe is the current candidate).
- Developer ecosystem strategy is approved by product leadership.
- Plugin SDK scope and tooling approach are agreed.

Authorship of this specification is estimated to begin Q4 2026.
