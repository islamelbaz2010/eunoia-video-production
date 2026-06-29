import {
  MarketplaceCategory,
  MarketplaceLicense,
} from '../../../src/plugins/marketplace/MarketplaceModels';

describe('MarketplaceModels', () => {
  describe('MarketplaceCategory', () => {
    it('defines expected categories', () => {
      expect(MarketplaceCategory.AIIntegration).toBe('ai_integration');
      expect(MarketplaceCategory.Analytics).toBe('analytics');
      expect(MarketplaceCategory.Publishing).toBe('publishing');
    });
  });

  describe('MarketplaceLicense', () => {
    it('defines expected license types', () => {
      expect(MarketplaceLicense.MIT).toBe('mit');
      expect(MarketplaceLicense.Commercial).toBe('commercial');
      expect(MarketplaceLicense.Apache2).toBe('apache_2');
    });
  });
});
