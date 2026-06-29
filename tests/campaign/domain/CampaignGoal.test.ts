import { CampaignGoal, CampaignGoalType } from '../../../src/campaign/domain/models/CampaignGoal';

function makeGoal(overrides: Partial<Parameters<typeof CampaignGoal.create>[0]> = {}) {
  return CampaignGoal.create({
    goalType: CampaignGoalType.Revenue,
    description: 'Hit $100k MRR',
    targetValue: 100000,
    currentValue: 0,
    achievedAt: null,
    ...overrides,
  });
}

describe('CampaignGoal', () => {
  describe('create', () => {
    it('stores all provided fields', () => {
      const goal = makeGoal({ currentValue: 50000 });
      expect(goal.goalType).toBe(CampaignGoalType.Revenue);
      expect(goal.description).toBe('Hit $100k MRR');
      expect(goal.targetValue).toBe(100000);
      expect(goal.currentValue).toBe(50000);
      expect(goal.achievedAt).toBeNull();
    });

    it('stores achievedAt as a defensive date copy', () => {
      const achievedAt = new Date('2025-01-01T00:00:00Z');
      const goal = makeGoal({ achievedAt });
      achievedAt.setFullYear(2030);
      expect(goal.achievedAt?.getFullYear()).toBe(2025);
    });
  });

  describe('isAchieved', () => {
    it('returns false when currentValue is below targetValue', () => {
      const goal = makeGoal({ targetValue: 100, currentValue: 99 });
      expect(goal.isAchieved()).toBe(false);
    });

    it('returns true when currentValue equals targetValue', () => {
      const goal = makeGoal({ targetValue: 100, currentValue: 100 });
      expect(goal.isAchieved()).toBe(true);
    });

    it('returns true when currentValue exceeds targetValue', () => {
      const goal = makeGoal({ targetValue: 100, currentValue: 150 });
      expect(goal.isAchieved()).toBe(true);
    });
  });

  describe('progressPct', () => {
    it('returns 50 when halfway to target', () => {
      const goal = makeGoal({ targetValue: 100, currentValue: 50 });
      expect(goal.progressPct()).toBeCloseTo(50);
    });

    it('caps at 100 when current exceeds target', () => {
      const goal = makeGoal({ targetValue: 100, currentValue: 200 });
      expect(goal.progressPct()).toBe(100);
    });

    it('returns 0 when targetValue is zero', () => {
      const goal = makeGoal({ targetValue: 0, currentValue: 0 });
      expect(goal.progressPct()).toBe(0);
    });
  });

  describe('withCurrentValue', () => {
    it('returns a new goal with updated currentValue', () => {
      const original = makeGoal({ targetValue: 100, currentValue: 0 });
      const updated = original.withCurrentValue(60);
      expect(updated.currentValue).toBe(60);
      expect(original.currentValue).toBe(0);
    });

    it('sets achievedAt when target is reached for the first time', () => {
      const before = new Date();
      const goal = makeGoal({ targetValue: 100, currentValue: 0, achievedAt: null });
      const updated = goal.withCurrentValue(100);
      const after = new Date();

      expect(updated.achievedAt).not.toBeNull();
      expect(updated.achievedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.achievedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('does not overwrite achievedAt when already set', () => {
      const existingDate = new Date('2025-01-01T00:00:00Z');
      const goal = makeGoal({ targetValue: 100, currentValue: 100, achievedAt: existingDate });
      const updated = goal.withCurrentValue(120);
      expect(updated.achievedAt).toEqual(existingDate);
    });
  });
});
