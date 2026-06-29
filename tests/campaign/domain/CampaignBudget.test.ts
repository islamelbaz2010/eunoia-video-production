import { CampaignBudget } from '../../../src/campaign/domain/models/CampaignBudget';
import { AppError } from '../../../src/shared/errors/AppError';

describe('CampaignBudget', () => {
  describe('create', () => {
    it('creates a budget with valid props', () => {
      const budget = CampaignBudget.create({ allocated: 5000, spent: 1000, currency: 'USD' });
      expect(budget.allocated).toBe(5000);
      expect(budget.spent).toBe(1000);
      expect(budget.remaining).toBe(4000);
      expect(budget.currency).toBe('USD');
    });

    it('computes remaining as allocated minus spent', () => {
      const budget = CampaignBudget.create({ allocated: 10000, spent: 3500, currency: 'EUR' });
      expect(budget.remaining).toBe(6500);
    });

    it('throws when allocated is negative', () => {
      expect(() => CampaignBudget.create({ allocated: -1, spent: 0, currency: 'USD' })).toThrow(
        AppError,
      );
    });

    it('throws when spent is negative', () => {
      expect(() => CampaignBudget.create({ allocated: 1000, spent: -50, currency: 'USD' })).toThrow(
        AppError,
      );
    });

    it('allows spent greater than allocated (overspend scenario)', () => {
      const budget = CampaignBudget.create({ allocated: 1000, spent: 1500, currency: 'USD' });
      expect(budget.spent).toBe(1500);
      expect(budget.remaining).toBe(-500);
    });
  });

  describe('zero', () => {
    it('creates a zero budget with USD default', () => {
      const budget = CampaignBudget.zero();
      expect(budget.allocated).toBe(0);
      expect(budget.spent).toBe(0);
      expect(budget.remaining).toBe(0);
      expect(budget.currency).toBe('USD');
    });

    it('accepts a custom currency', () => {
      const budget = CampaignBudget.zero('GBP');
      expect(budget.currency).toBe('GBP');
    });
  });

  describe('withSpent', () => {
    it('returns a new budget with updated spent', () => {
      const original = CampaignBudget.create({ allocated: 5000, spent: 0, currency: 'USD' });
      const updated = original.withSpent(2000);

      expect(updated.spent).toBe(2000);
      expect(updated.remaining).toBe(3000);
      expect(original.spent).toBe(0);
    });

    it('preserves allocated and currency', () => {
      const original = CampaignBudget.create({ allocated: 5000, spent: 0, currency: 'EUR' });
      const updated = original.withSpent(500);
      expect(updated.allocated).toBe(5000);
      expect(updated.currency).toBe('EUR');
    });
  });

  describe('withAllocated', () => {
    it('returns a new budget with updated allocated', () => {
      const original = CampaignBudget.create({ allocated: 5000, spent: 1000, currency: 'USD' });
      const updated = original.withAllocated(8000);

      expect(updated.allocated).toBe(8000);
      expect(updated.spent).toBe(1000);
      expect(updated.remaining).toBe(7000);
    });
  });

  describe('isExceeded', () => {
    it('returns false when spent is within allocation', () => {
      const budget = CampaignBudget.create({ allocated: 5000, spent: 4999, currency: 'USD' });
      expect(budget.isExceeded()).toBe(false);
    });

    it('returns false when spent equals allocated', () => {
      const budget = CampaignBudget.create({ allocated: 5000, spent: 5000, currency: 'USD' });
      expect(budget.isExceeded()).toBe(false);
    });

    it('returns true when spent exceeds allocated', () => {
      const budget = CampaignBudget.create({ allocated: 5000, spent: 5001, currency: 'USD' });
      expect(budget.isExceeded()).toBe(true);
    });
  });
});
