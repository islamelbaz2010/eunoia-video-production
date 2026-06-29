import { OpportunityScore } from '../../../src/discovery/domain/models/OpportunityScore';

describe('OpportunityScore', () => {
  describe('create', () => {
    it('stores clamped component scores', () => {
      const score = OpportunityScore.create({
        relevance: 80,
        engagement: 60,
        timeliness: 90,
        competition: 40,
      });

      expect(score.relevance).toBe(80);
      expect(score.engagement).toBe(60);
      expect(score.timeliness).toBe(90);
      expect(score.competition).toBe(40);
    });

    it('computes weighted total correctly', () => {
      const score = OpportunityScore.create({
        relevance: 100,
        engagement: 100,
        timeliness: 100,
        competition: 0,
      });
      // 100*0.35 + 100*0.30 + 100*0.25 + (100-0)*0.10 = 100
      expect(score.total).toBe(100);
    });

    it('computes total of zero when all inputs are worst-case', () => {
      const score = OpportunityScore.create({
        relevance: 0,
        engagement: 0,
        timeliness: 0,
        competition: 100,
      });
      // 0*0.35 + 0*0.30 + 0*0.25 + (100-100)*0.10 = 0
      expect(score.total).toBe(0);
    });

    it('clamps values above 100 to 100', () => {
      const score = OpportunityScore.create({
        relevance: 150,
        engagement: 200,
        timeliness: 999,
        competition: 150,
      });

      expect(score.relevance).toBe(100);
      expect(score.engagement).toBe(100);
      expect(score.timeliness).toBe(100);
      expect(score.competition).toBe(100);
    });

    it('clamps values below 0 to 0', () => {
      const score = OpportunityScore.create({
        relevance: -10,
        engagement: -5,
        timeliness: -1,
        competition: -50,
      });

      expect(score.relevance).toBe(0);
      expect(score.engagement).toBe(0);
      expect(score.timeliness).toBe(0);
      expect(score.competition).toBe(0);
    });

    it('rounds fractional values', () => {
      const score = OpportunityScore.create({
        relevance: 50.6,
        engagement: 30.4,
        timeliness: 70.1,
        competition: 20.9,
      });

      expect(score.relevance).toBe(51);
      expect(score.engagement).toBe(30);
      expect(score.timeliness).toBe(70);
      expect(score.competition).toBe(21);
    });

    it('total is always within [0, 100]', () => {
      const edge1 = OpportunityScore.create({ relevance: 55, engagement: 45, timeliness: 60, competition: 30 });
      expect(edge1.total).toBeGreaterThanOrEqual(0);
      expect(edge1.total).toBeLessThanOrEqual(100);
    });
  });

  describe('toJSON', () => {
    it('serialises all fields including total', () => {
      const score = OpportunityScore.create({
        relevance: 70,
        engagement: 50,
        timeliness: 80,
        competition: 30,
      });

      const json = score.toJSON();

      expect(json).toMatchObject({
        relevance: 70,
        engagement: 50,
        timeliness: 80,
        competition: 30,
        total: score.total,
      });
    });
  });
});
