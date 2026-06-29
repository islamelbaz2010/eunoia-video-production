import { CampaignAudience } from '../../../src/campaign/domain/models/CampaignAudience';

describe('CampaignAudience', () => {
  describe('create', () => {
    it('stores all provided fields', () => {
      const audience = CampaignAudience.create({
        segments: ['entrepreneurs', 'creators'],
        demographics: { region: 'US' },
        estimatedSize: 50000,
        targetAge: { min: 25, max: 45 },
      });

      expect(audience.segments).toEqual(['entrepreneurs', 'creators']);
      expect(audience.demographics).toEqual({ region: 'US' });
      expect(audience.estimatedSize).toBe(50000);
      expect(audience.targetAge).toEqual({ min: 25, max: 45 });
    });

    it('accepts null targetAge', () => {
      const audience = CampaignAudience.create({
        segments: [],
        demographics: {},
        estimatedSize: 0,
        targetAge: null,
      });
      expect(audience.targetAge).toBeNull();
    });

    it('freezes segments so they cannot be mutated externally', () => {
      const segments = ['a', 'b'];
      const audience = CampaignAudience.create({
        segments,
        demographics: {},
        estimatedSize: 0,
        targetAge: null,
      });
      expect(() => {
        (audience.segments as string[]).push('c');
      }).toThrow();
    });

    it('freezes demographics', () => {
      const demographics = { region: 'US' };
      const audience = CampaignAudience.create({
        segments: [],
        demographics,
        estimatedSize: 0,
        targetAge: null,
      });
      expect(() => {
        (audience.demographics as Record<string, unknown>)['extra'] = 'value';
      }).toThrow();
    });
  });

  describe('empty', () => {
    it('creates a default empty audience', () => {
      const audience = CampaignAudience.empty();
      expect(audience.segments).toEqual([]);
      expect(audience.demographics).toEqual({});
      expect(audience.estimatedSize).toBe(0);
      expect(audience.targetAge).toBeNull();
    });
  });
});
