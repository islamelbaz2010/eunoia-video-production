# EES-007: Agency OS

| Field | Value |
|-------|-------|
| **ID** | EES-007 |
| **Title** | Agency OS |
| **Status** | Future |
| **Owner** | Product |
| **Last Updated** | 2026-06-29 |

---

## 1. Mission

Transform Eunoia from a single-creator tool into a multi-client operating system for content agencies and management companies — enabling them to manage multiple creator channels under a unified workspace with team-based access controls, client-facing reporting, white-label portals, and revenue sharing.

---

## 2. Business Goal

Content agencies, talent management firms, and multi-channel networks (MCNs) represent a high-value market segment. They operate 5 to 100+ creator channels simultaneously and require workflow coordination, client reporting, and team permission management that single-creator tools cannot provide.

By launching Agency OS, Eunoia captures this segment and increases average contract value per account by an estimated 8–15× compared to individual creator plans. Agency accounts also drive viral product adoption: each agency introduces Eunoia to the creators they manage, expanding market reach without additional acquisition cost.

The business goal is to onboard 20 agencies within 12 months of Agency OS launch, with each agency managing an average of 10 creator channels, contributing to a 10× increase in total managed channels on the platform.

---

## 3. Scope

- Multi-workspace organisation structure: an Agency account contains multiple creator channel workspaces.
- Team member management: invite, assign roles, and remove team members across the organisation.
- Role-based access control (RBAC): granular permissions at the organisation, workspace, and feature level.
- Client portal: read-only, branded view of channel performance and content calendar for creator clients.
- Client portal white-labelling: custom domain, logo, and colour scheme per agency.
- Organisation-level revenue reporting: aggregate view of revenue across all managed channels.
- Revenue sharing configuration: define splits between agency and creator for each channel.
- Cross-channel content calendar: unified view and scheduling across all managed channels.
- Private plugin support: agency-exclusive plugins visible only to the organisation's workspaces (see EES-006).
- Team workflow: task assignment, approval gates for publish actions, and audit trail of team actions.

---

## 4. Out of Scope

- Direct creator talent discovery or recruitment. Agencies onboard their own clients.
- Contract management or e-signature integration. Revenue sharing is configured within Eunoia; the underlying contracts are managed externally.
- Cross-agency collaboration. Agency workspaces are isolated from each other.
- Payroll processing. Revenue share tracking informs payments; processing occurs externally.
- Public brand pages or marketing sites for agencies.

---

## 5. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Agency accounts onboarded (12 months post-launch) | 20 | Account count |
| Managed channels per agency (average) | 10 | Channel count per agency account |
| Client portal active usage | > 80% of client channels have at least 1 client portal login per month | Portal session tracking |
| Team member permission violations | 0 | RBAC enforcement audit |
| Revenue share reconciliation accuracy | 100% | Monthly audit of configured splits vs. distributed amounts |
| White-label portal setup time | < 30 minutes per client | Setup session timing |

---

## 6. Actors

| Actor | Type | Description |
|-------|------|-------------|
| Agency Admin | Human | Full control over the organisation: invites team, configures clients, sets revenue splits. |
| Team Member | Human | Operates within assigned permissions. May manage content, review analytics, or handle publishing depending on role. |
| Creator Client | Human | Channel owner. Accesses the client portal to view performance and content calendar. Has no access to agency team management. |
| Client Portal | System | Read-only, white-label interface delivered to creator clients. |
| Organisation Manager | System | Enforces RBAC, manages workspace isolation, and aggregates cross-channel data. |
| RBAC Engine | System | Evaluates every API call against the caller's role and the resource's channel/organisation context. |
| Revenue Share Engine | System | Computes and tracks agency/creator revenue splits from EES-001 data. |
| Audit Logger | System | Records all team actions to an immutable audit trail. |

---

## 7. Inputs

| Input | Source | Format | Trigger |
|-------|--------|--------|---------|
| Team member invitation | Agency Admin | Email + role assignment | On invite action |
| Creator channel onboarding | Agency Admin | Channel connection (OAuth) | On client add |
| Revenue share configuration | Agency Admin | Percentage split per channel | On client setup or update |
| Client portal branding | Agency Admin | Logo, colours, domain | On white-label setup |
| Publish approval request | Team Member | Approval request referencing a `PublishRequest` | From EES-003 workflow |
| Cross-channel reporting query | Agency Admin or Team Member | Date range + channel selection | On demand |
| Private plugin submission | Agency Admin | Plugin package (as in EES-006) | On developer submission within org |

---

## 8. Outputs

| Output | Consumer | Format | Trigger |
|--------|----------|--------|---------|
| Team member access token | Team Member | JWT with embedded role + scope | On login |
| Client portal session | Creator Client | Rendered web portal | On client login |
| Cross-channel revenue report | Agency Admin | Aggregated `RevenueRecord[]` + splits | On request |
| Revenue share statement | Creator Client (via portal) | Per-channel monthly statement | Monthly |
| Unified content calendar | Agency Team | Calendar view of all scheduled publishes | Continuous |
| Approval gate notification | Designated approver | In-app + email notification | On publish approval request |
| Audit trail entry | Internal / Compliance | Append-only log record | On every team action |
| `agency.member.invited` event | Event Bus | Domain event | On invite |
| `agency.channel.added` event | Event Bus | Domain event | On client onboard |
| `agency.approval.granted` event | Event Bus | Domain event | On publish approval |

---

## 9. Business Rules

**BR-001 — Workspace Isolation:** A team member may only access channels that belong to workspaces they have been explicitly granted access to. Cross-workspace access is prohibited at the RBAC layer. An Agency Admin's access does not automatically extend to channel data beyond their organisation.

**BR-002 — Minimum Role Separation:** The following roles are required at minimum: `AgencyAdmin`, `ChannelManager`, `ContentReviewer`, `AnalyticsViewer`. Additional roles may be defined per agency, but the four base roles may not be removed or merged.

**BR-003 — Revenue Share Enforcement:** No revenue share configuration may sum to more than 100%. A configuration that would cause the total to exceed 100% is rejected at the API level with a validation error.

**BR-004 — Publish Approval Gate:** If a channel workspace has the approval gate feature enabled, no publish request may advance from `Confirmed` to `Scheduled` without receiving approval from a team member holding the `ChannelManager` role or above. The approval is recorded in the audit log.

**BR-005 — Creator Client Data Privacy:** Creator clients accessing the client portal may only view their own channel's data. Aggregate agency-level metrics are not visible to creator clients. A creator client's session context is scoped to a single channel at all times.

**BR-006 — Audit Trail Immutability:** Every team action — role change, channel access, publish approval, revenue share modification — is written to an append-only audit log. Audit log entries may not be deleted or modified by any user, including Agency Admins.

**BR-007 — Team Member Offboarding:** When a team member is removed from the organisation, all their active sessions are immediately invalidated. Any pending publish approval requests assigned exclusively to the removed member are routed to the Agency Admin for reassignment.

**BR-008 — White-Label Domain Verification:** A custom domain may only be used for a client portal after DNS verification proves domain ownership. Eunoia provides a TXT record for verification. Portals on unverified domains are blocked.

---

## 10. AI Decision Flow

### 10.1 Cross-Channel Opportunity Identification

**Intent:** Identify revenue or growth opportunities that span multiple channels under agency management, enabling the agency to coordinate strategy across its roster.

**Inputs:**
- Channel performance models from EES-004 for all managed channels
- Revenue forecasts from EES-001 for all managed channels
- Creator goals from EES-005 for all managed channels
- Trend signals (if available via StrategicSignalPlugin)

**Reasoning Chain:**
1. Group channels by content niche and audience profile.
2. Identify channels in the same niche where coordinated publish timing (cross-promotion) would amplify reach.
3. Identify channels where a brand deal negotiated at the agency level (bundling multiple channels) would yield higher combined value than individual deals.
4. Identify channels whose performance model suggests an untapped format (e.g., Shorts) that other roster channels have validated successfully.
5. Return opportunities ranked by estimated combined impact across the roster.

**Output Contract:**
```json
{
  "opportunityBatchId": "string (uuid)",
  "organisationId": "string",
  "generatedAt": "ISO 8601 timestamp",
  "opportunities": [
    {
      "type": "cross_promotion | bundle_deal | format_expansion | timing_coordination",
      "channelIds": ["string"],
      "summary": "string",
      "estimatedImpact": "string",
      "rationale": "string",
      "priority": "high | medium | low"
    }
  ]
}
```

---

### 10.2 Automated Cross-Channel Report Narrative

**Intent:** Generate a plain-language executive summary for agency clients that contextualises their channel's performance within the broader content landscape.

**Inputs:**
- Channel performance records from EES-004 for the reporting period
- Revenue summary from EES-001 for the reporting period
- Key events during the period (videos published, deals closed, milestones)

**Reasoning Chain:**
1. Identify the 3 most significant positive and negative performance events of the period.
2. Contextualise performance against the channel's own trailing 3-month baseline.
3. Identify causal relationships where possible (e.g., "The 40% views increase in week 3 coincided with the publication of the evergreen tutorial format").
4. Summarise forward-looking priorities based on the channel's current goal alignment.

**Output Contract:**
```json
{
  "narrativeId": "string (uuid)",
  "channelId": "string",
  "periodStart": "ISO 8601 date",
  "periodEnd": "ISO 8601 date",
  "executiveSummary": "string",
  "keyHighlights": ["string"],
  "keyLowlights": ["string"],
  "forwardLookingPriorities": ["string"],
  "generatedAt": "ISO 8601 timestamp"
}
```

---

## 11. Data Model

### Organisation

```typescript
interface Organisation {
  readonly id: string;
  readonly name: string;
  readonly planType: OrgPlanType;          // enum: Agency | MCN | Management
  readonly ownerId: string;
  readonly whiteLabelConfig: WhiteLabelConfig | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
```

### OrganisationMember

```typescript
interface OrganisationMember {
  readonly id: string;
  readonly organisationId: string;
  readonly userId: string;
  readonly role: OrgRole;                  // enum: AgencyAdmin | ChannelManager | ContentReviewer | AnalyticsViewer
  readonly workspaceAccess: ReadonlyArray<string>;   // channel IDs
  readonly invitedAt: Date;
  readonly acceptedAt: Date | null;
  readonly removedAt: Date | null;
}
```

### RevenueShareConfig

```typescript
interface RevenueShareConfig {
  readonly id: string;
  readonly organisationId: string;
  readonly channelId: string;
  readonly agencySharePercent: number;      // 0.0 to 100.0
  readonly creatorSharePercent: number;
  readonly effectiveFrom: Date;
  readonly replacedAt: Date | null;
}
```

### WhiteLabelConfig

```typescript
interface WhiteLabelConfig {
  readonly organisationId: string;
  readonly customDomain: string | null;
  readonly domainVerifiedAt: Date | null;
  readonly logoStorageKey: string | null;
  readonly primaryColour: string;           // hex
  readonly accentColour: string;            // hex
  readonly agencyDisplayName: string;
}
```

---

## 12. Events

| Event Type | Trigger | Payload |
|------------|---------|---------|
| `agency.organisation.created` | New agency account created | `{ organisationId, ownerId, planType }` |
| `agency.member.invited` | Team member invited | `{ memberId, organisationId, role }` |
| `agency.member.role_changed` | Team member role updated | `{ memberId, previousRole, newRole, changedBy }` |
| `agency.member.removed` | Team member offboarded | `{ memberId, organisationId, removedBy }` |
| `agency.channel.added` | Creator channel added to organisation | `{ channelId, organisationId }` |
| `agency.channel.removed` | Creator channel removed from organisation | `{ channelId, organisationId }` |
| `agency.revenue_share.configured` | Revenue split set or updated | `{ configId, channelId, agencySharePercent }` |
| `agency.approval.requested` | Publish approval gate triggered | `{ requestId, channelId, requestedBy }` |
| `agency.approval.granted` | Publish approval given | `{ requestId, channelId, approvedBy }` |
| `agency.approval.rejected` | Publish approval denied | `{ requestId, channelId, rejectedBy, reason }` |
| `agency.portal.domain_verified` | White-label domain ownership confirmed | `{ organisationId, domain }` |

---

## 13. APIs

### POST /api/v1/organisations

Creates a new agency organisation.

---

### GET /api/v1/organisations/:orgId

Returns organisation details including member count and channel count.

---

### POST /api/v1/organisations/:orgId/members

Invites a new team member.

**Request Body:** `{ email: string, role: OrgRole, workspaceAccess: string[] }`

---

### PATCH /api/v1/organisations/:orgId/members/:memberId

Updates a member's role or workspace access.

---

### DELETE /api/v1/organisations/:orgId/members/:memberId

Offboards a team member. Enforces BR-007.

---

### GET /api/v1/organisations/:orgId/channels

Returns all channels managed by the organisation.

---

### POST /api/v1/organisations/:orgId/channels

Adds an existing creator channel to the organisation.

---

### PUT /api/v1/organisations/:orgId/channels/:channelId/revenue-share

Sets or updates the revenue share configuration for a channel.

---

### GET /api/v1/organisations/:orgId/revenue/summary

Returns aggregate revenue across all managed channels.

**Query Parameters:** `start`, `end`, `channelIds` (optional subset).

---

### GET /api/v1/organisations/:orgId/calendar

Returns the unified content calendar across all managed channels.

**Query Parameters:** `start`, `end`, `channelIds`.

---

### GET /api/v1/organisations/:orgId/audit-log

Returns the audit trail.

**Query Parameters:** `memberId`, `action`, `channelId`, `start`, `end`, `page`, `limit` (max 500).

---

### PUT /api/v1/organisations/:orgId/white-label

Sets white-label configuration.

---

### GET /api/v1/organisations/:orgId/opportunities

Returns AI-generated cross-channel opportunities.

---

## 14. Plugin Contracts

Agency OS introduces a private plugin capability via EES-006. An agency-scoped plugin follows the same `IPlugin` interface and manifest structure, with an additional field in the manifest:

```typescript
interface AgencyPluginManifest extends PluginManifest {
  readonly visibility: 'public' | 'private';
  readonly organisationId: string | null;    // set if visibility is 'private'
}
```

Private plugins are installed only within the declaring organisation's workspaces. They do not appear in the public marketplace listing and are not subject to public marketplace review — however, they are subject to the same automated validation defined in EES-006.

---

## 15. Security

**RBAC Enforcement:** Every API endpoint validates the caller's role against the resource's required permission level. Permission checks are performed at the application layer, not inferred from JWT claims alone. Role definitions are stored server-side and cannot be manipulated client-side.

**Session Isolation:** Each user session is scoped to the channels in their `workspaceAccess` list. RBAC evaluation occurs on every request; role changes take effect immediately without requiring re-authentication.

**Client Portal Isolation:** Client portal sessions use a separate, narrowly scoped token that grants read-only access to a single channel's data. These tokens may not be elevated to team member access under any circumstances.

**Audit Log Protection:** The audit log is stored in an append-only Supabase table with a database-level constraint that blocks UPDATE and DELETE operations. Audit log access is restricted to Agency Admin and Eunoia platform operators.

**White-Label Domain Security:** Custom domains are enforced via DNS TXT record verification. SSL certificates for custom domains are provisioned via an automated certificate authority integration. Certificate renewal is automated.

---

## 16. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| RBAC misconfiguration exposes one client's data to another team member | Low | Critical | Automated RBAC integration tests on every deploy; penetration testing before launch |
| Agency offboards a creator client; creator loses access to their own channel data | Medium | High | Creator clients retain independent Eunoia accounts; agency connection is additive, not exclusive |
| Revenue share calculation error causes incorrect creator payments | Low | High | Double-entry accounting model for revenue share; monthly reconciliation report; manual review gate before disbursement |
| Team member leaks client performance data to competitors | Medium | Medium | Audit log captures all data access; contractual NDA enforcement is an agency responsibility |
| White-label domain misconfiguration causes client portal downtime | Medium | Medium | Domain verification before activation; health monitoring per custom domain |

---

## 17. Future Improvements

- Collaborative script and briefing tools: team members co-edit video briefs and scripts within Eunoia.
- Client communication log: record all agency-creator communications within the platform for traceability.
- Agency-level AI CEO: cross-roster strategic planning that identifies coordination opportunities across all managed channels.
- Talent performance benchmarking: compare creator performance against anonymised roster peers.
- Automated client onboarding flow: self-serve portal for creator clients to connect their channel without agency involvement.
- Billing management: invoice generation and payment tracking for agency service fees to creator clients.

---

## 18. Acceptance Criteria

To be defined when this specification advances to In Progress status. The following areas must be covered:

- Organisation creation and team member invitation.
- RBAC enforcement: team member cannot access channels outside their workspace access list.
- Publish approval gate: publish does not proceed without required approval.
- Revenue share validation: configuration exceeding 100% total is rejected.
- Client portal isolation: client sees only their own channel's data.
- Audit log immutability: no delete or update possible on audit log entries.
- White-label domain verification and portal rendering.

---

## 19. Dependencies

| Dependency | Type | Reference |
|------------|------|-----------|
| EES-001 Revenue Intelligence | Internal | Revenue data for cross-channel reports and share calculations |
| EES-003 Publishing | Internal | Publish approval gate integration |
| EES-004 Learning Engine | Internal | Cross-channel performance models for opportunity identification |
| EES-005 AI CEO | Internal | Per-channel strategic context for cross-channel opportunity analysis |
| EES-006 Plugin Marketplace | Internal | Private plugin support for agency workspaces |
| Supabase (Auth + RLS + Database) | Infrastructure | Row-level security for workspace isolation |
| AI Provider Framework | Internal | `src/ai/application/AIService.ts` |
| Core Event Bus | Internal | `src/core/events/InMemoryEventBus.ts` |
| SSL Certificate Provider | External | Vendor TBD (Let's Encrypt or managed SSL service) |

---

## 20. Current Status

**Status:** Future

This specification is queued for authorship. It will advance to Draft when the following preconditions are met:

- EES-001 through EES-005 are all at Implemented status.
- EES-006 Plugin Marketplace is at Approved status.
- A strategic decision is made on the Agency OS pricing model and plan tiers.
- RBAC framework design is approved by engineering and security.
- SSL and custom domain infrastructure approach is selected.

Authorship of this specification is estimated to begin Q1 2027.
