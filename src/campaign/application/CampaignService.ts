import { Campaign, CampaignStatus, type CreateCampaignProps } from '../domain/models/Campaign';
import type { ICampaignRepository, CampaignFilter } from '../domain/repositories/ICampaignRepository';
import type { IEventBus } from '../../core/events/IEventBus';
import { createDomainEvent } from '../../core/events/DomainEvent';
import type { ILogger } from '../../shared/logger/ILogger';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { CAMPAIGN_EVENT_TYPES } from '../events/CampaignEvents';

const VALID_TRANSITIONS: Readonly<Record<CampaignStatus, ReadonlyArray<CampaignStatus>>> = {
  [CampaignStatus.Draft]: [CampaignStatus.Planning, CampaignStatus.Cancelled],
  [CampaignStatus.Planning]: [CampaignStatus.Researching, CampaignStatus.Cancelled],
  [CampaignStatus.Researching]: [CampaignStatus.Approved, CampaignStatus.Cancelled],
  [CampaignStatus.Approved]: [
    CampaignStatus.Producing,
    CampaignStatus.Running,
    CampaignStatus.Cancelled,
  ],
  [CampaignStatus.Producing]: [
    CampaignStatus.Publishing,
    CampaignStatus.Paused,
    CampaignStatus.Cancelled,
  ],
  [CampaignStatus.Publishing]: [
    CampaignStatus.Running,
    CampaignStatus.Paused,
    CampaignStatus.Cancelled,
  ],
  [CampaignStatus.Running]: [
    CampaignStatus.Paused,
    CampaignStatus.Completed,
    CampaignStatus.Cancelled,
  ],
  [CampaignStatus.Paused]: [CampaignStatus.Running, CampaignStatus.Cancelled],
  [CampaignStatus.Completed]: [CampaignStatus.Archived],
  [CampaignStatus.Archived]: [],
  [CampaignStatus.Cancelled]: [],
};

export type CreateCampaignInput = CreateCampaignProps;

export class CampaignService {
  private readonly logger: ILogger;

  constructor(
    private readonly repository: ICampaignRepository,
    private readonly eventBus: IEventBus,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'CampaignService' });
  }

  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    const campaign = Campaign.create(input);
    const saved = await this.repository.save(campaign);

    this.logger.info({ campaignId: saved.id, name: saved.name }, 'Campaign created');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Created, saved.id, {
        name: saved.name,
        ownerId: saved.ownerId,
        type: saved.type,
      }),
    );

    return saved;
  }

  async approveCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);
    this.assertValidTransition(campaign, CampaignStatus.Approved);

    const updated = campaign
      .withStatus(CampaignStatus.Approved)
      .withLifecycle(campaign.lifecycle.withApprovedAt(new Date()));

    const saved = await this.repository.save(updated);

    this.logger.info({ campaignId: saved.id }, 'Campaign approved');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Approved, saved.id, {
        approvedAt: saved.lifecycle.approvedAt,
      }),
    );

    return saved;
  }

  async startCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);

    if (campaign.status === CampaignStatus.Draft) {
      throw new AppError(
        `Cannot start a Draft campaign. Advance the campaign through Planning and Researching first.`,
        'CAMPAIGN_INVALID_TRANSITION',
      );
    }

    this.assertValidTransition(campaign, CampaignStatus.Running);

    const updated = campaign
      .withStatus(CampaignStatus.Running)
      .withLifecycle(campaign.lifecycle.withStartedAt(new Date()));

    const saved = await this.repository.save(updated);

    this.logger.info({ campaignId: saved.id }, 'Campaign started');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Started, saved.id, {
        startedAt: saved.lifecycle.startedAt,
      }),
    );

    return saved;
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);
    this.assertValidTransition(campaign, CampaignStatus.Paused);

    const updated = campaign
      .withStatus(CampaignStatus.Paused)
      .withLifecycle(campaign.lifecycle.withPausedAt(new Date()));

    const saved = await this.repository.save(updated);

    this.logger.info({ campaignId: saved.id }, 'Campaign paused');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Paused, saved.id, {
        pausedAt: saved.lifecycle.pausedAt,
      }),
    );

    return saved;
  }

  async completeCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);

    if (!campaign.lifecycle.isApproved()) {
      throw new AppError(
        `Cannot complete campaign ${id}: campaign has not been approved`,
        'CAMPAIGN_NOT_APPROVED',
      );
    }

    this.assertValidTransition(campaign, CampaignStatus.Completed);

    const updated = campaign
      .withStatus(CampaignStatus.Completed)
      .withLifecycle(campaign.lifecycle.withCompletedAt(new Date()));

    const saved = await this.repository.save(updated);

    this.logger.info({ campaignId: saved.id }, 'Campaign completed');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Completed, saved.id, {
        completedAt: saved.lifecycle.completedAt,
      }),
    );

    return saved;
  }

  async archiveCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);
    this.assertValidTransition(campaign, CampaignStatus.Archived);

    const updated = campaign
      .withStatus(CampaignStatus.Archived)
      .withLifecycle(campaign.lifecycle.withArchivedAt(new Date()));

    const saved = await this.repository.save(updated);

    this.logger.info({ campaignId: saved.id }, 'Campaign archived');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Archived, saved.id, {
        archivedAt: saved.lifecycle.archivedAt,
      }),
    );

    return saved;
  }

  async cancelCampaign(id: string): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);
    this.assertValidTransition(campaign, CampaignStatus.Cancelled);

    const updated = campaign
      .withStatus(CampaignStatus.Cancelled)
      .withLifecycle(campaign.lifecycle.withCancelledAt(new Date()));

    const saved = await this.repository.save(updated);

    this.logger.info({ campaignId: saved.id }, 'Campaign cancelled');

    await this.eventBus.publish(
      createDomainEvent(CAMPAIGN_EVENT_TYPES.Cancelled, saved.id, {
        cancelledAt: saved.lifecycle.cancelledAt,
      }),
    );

    return saved;
  }

  async recordBudgetSpend(id: string, spent: number): Promise<Campaign> {
    const campaign = await this.findOrThrow(id);
    this.assertNotReadOnly(campaign);

    const wasExceeded = campaign.budget.isExceeded();
    const newBudget = campaign.budget.withSpent(spent);
    const updated = campaign.withBudget(newBudget);
    const saved = await this.repository.save(updated);

    if (!wasExceeded && saved.budget.isExceeded()) {
      this.logger.warn(
        { campaignId: saved.id, allocated: saved.budget.allocated, spent: saved.budget.spent },
        'Campaign budget exceeded',
      );

      await this.eventBus.publish(
        createDomainEvent(CAMPAIGN_EVENT_TYPES.BudgetExceeded, saved.id, {
          allocated: saved.budget.allocated,
          spent: saved.budget.spent,
          currency: saved.budget.currency,
        }),
      );
    }

    return saved;
  }

  async getCampaign(id: string): Promise<Campaign> {
    return this.findOrThrow(id);
  }

  async listCampaigns(filter?: CampaignFilter): Promise<Campaign[]> {
    return this.repository.findAll(filter);
  }

  async searchCampaigns(
    query: string,
    filter?: Omit<CampaignFilter, 'search'>,
  ): Promise<Campaign[]> {
    return this.repository.search(query, filter);
  }

  private async findOrThrow(id: string): Promise<Campaign> {
    const campaign = await this.repository.findById(id);
    if (campaign === null) {
      throw new NotFoundError('Campaign', id);
    }
    return campaign;
  }

  private assertNotReadOnly(campaign: Campaign): void {
    if (campaign.isReadOnly()) {
      throw new AppError(
        `Campaign ${campaign.id} is archived and cannot be modified`,
        'CAMPAIGN_ARCHIVED',
      );
    }
  }

  private assertValidTransition(campaign: Campaign, to: CampaignStatus): void {
    const allowed = VALID_TRANSITIONS[campaign.status];
    if (!allowed.includes(to)) {
      throw new AppError(
        `Invalid status transition from '${campaign.status}' to '${to}' for campaign ${campaign.id}`,
        'CAMPAIGN_INVALID_TRANSITION',
      );
    }
  }
}
