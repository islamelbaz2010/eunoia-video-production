import { AppError } from '../../../shared/errors/AppError';

export interface CampaignBudgetProps {
  allocated: number;
  spent: number;
  currency: string;
}

export class CampaignBudget {
  readonly allocated: number;
  readonly spent: number;
  readonly remaining: number;
  readonly currency: string;

  private constructor(props: CampaignBudgetProps) {
    this.allocated = props.allocated;
    this.spent = props.spent;
    this.remaining = props.allocated - props.spent;
    this.currency = props.currency;
  }

  static create(props: CampaignBudgetProps): CampaignBudget {
    if (props.allocated < 0) {
      throw new AppError('Budget allocated cannot be negative', 'VALIDATION_ERROR');
    }
    if (props.spent < 0) {
      throw new AppError('Budget spent cannot be negative', 'VALIDATION_ERROR');
    }
    return new CampaignBudget(props);
  }

  static zero(currency = 'USD'): CampaignBudget {
    return new CampaignBudget({ allocated: 0, spent: 0, currency });
  }

  withSpent(spent: number): CampaignBudget {
    return CampaignBudget.create({ allocated: this.allocated, spent, currency: this.currency });
  }

  withAllocated(allocated: number): CampaignBudget {
    return CampaignBudget.create({ allocated, spent: this.spent, currency: this.currency });
  }

  isExceeded(): boolean {
    return this.spent > this.allocated;
  }
}
