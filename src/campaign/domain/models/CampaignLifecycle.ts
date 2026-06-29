export interface CampaignLifecycleProps {
  approvedAt: Date | null;
  startedAt: Date | null;
  pausedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  archivedAt: Date | null;
}

export class CampaignLifecycle {
  readonly approvedAt: Date | null;
  readonly startedAt: Date | null;
  readonly pausedAt: Date | null;
  readonly completedAt: Date | null;
  readonly cancelledAt: Date | null;
  readonly archivedAt: Date | null;

  private constructor(props: CampaignLifecycleProps) {
    this.approvedAt = props.approvedAt !== null ? new Date(props.approvedAt) : null;
    this.startedAt = props.startedAt !== null ? new Date(props.startedAt) : null;
    this.pausedAt = props.pausedAt !== null ? new Date(props.pausedAt) : null;
    this.completedAt = props.completedAt !== null ? new Date(props.completedAt) : null;
    this.cancelledAt = props.cancelledAt !== null ? new Date(props.cancelledAt) : null;
    this.archivedAt = props.archivedAt !== null ? new Date(props.archivedAt) : null;
  }

  static create(props: CampaignLifecycleProps): CampaignLifecycle {
    return new CampaignLifecycle(props);
  }

  static empty(): CampaignLifecycle {
    return new CampaignLifecycle({
      approvedAt: null,
      startedAt: null,
      pausedAt: null,
      completedAt: null,
      cancelledAt: null,
      archivedAt: null,
    });
  }

  isApproved(): boolean {
    return this.approvedAt !== null;
  }

  withApprovedAt(approvedAt: Date): CampaignLifecycle {
    return CampaignLifecycle.create({ ...this.toProps(), approvedAt });
  }

  withStartedAt(startedAt: Date): CampaignLifecycle {
    return CampaignLifecycle.create({ ...this.toProps(), startedAt });
  }

  withPausedAt(pausedAt: Date): CampaignLifecycle {
    return CampaignLifecycle.create({ ...this.toProps(), pausedAt });
  }

  withCompletedAt(completedAt: Date): CampaignLifecycle {
    return CampaignLifecycle.create({ ...this.toProps(), completedAt });
  }

  withCancelledAt(cancelledAt: Date): CampaignLifecycle {
    return CampaignLifecycle.create({ ...this.toProps(), cancelledAt });
  }

  withArchivedAt(archivedAt: Date): CampaignLifecycle {
    return CampaignLifecycle.create({ ...this.toProps(), archivedAt });
  }

  private toProps(): CampaignLifecycleProps {
    return {
      approvedAt: this.approvedAt,
      startedAt: this.startedAt,
      pausedAt: this.pausedAt,
      completedAt: this.completedAt,
      cancelledAt: this.cancelledAt,
      archivedAt: this.archivedAt,
    };
  }
}
