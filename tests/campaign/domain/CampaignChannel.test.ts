import { CampaignChannel } from '../../../src/campaign/domain/models/CampaignChannel';

function makeChannel(overrides: Partial<Parameters<typeof CampaignChannel.create>[0]> = {}) {
  return CampaignChannel.create({
    name: 'YouTube Main',
    platform: 'youtube',
    enabled: true,
    config: { targetAudience: 'general' },
    ...overrides,
  });
}

describe('CampaignChannel', () => {
  describe('create', () => {
    it('stores all provided fields', () => {
      const channel = makeChannel();
      expect(channel.name).toBe('YouTube Main');
      expect(channel.platform).toBe('youtube');
      expect(channel.enabled).toBe(true);
      expect(channel.config).toEqual({ targetAudience: 'general' });
    });

    it('freezes config to prevent mutation', () => {
      const channel = makeChannel({ config: { key: 'value' } });
      expect(() => {
        (channel.config as Record<string, unknown>)['extra'] = 'bad';
      }).toThrow();
    });
  });

  describe('withEnabled', () => {
    it('returns a new channel with updated enabled state', () => {
      const channel = makeChannel({ enabled: true });
      const disabled = channel.withEnabled(false);

      expect(disabled.enabled).toBe(false);
      expect(channel.enabled).toBe(true);
    });

    it('preserves name, platform, and config', () => {
      const channel = makeChannel();
      const updated = channel.withEnabled(false);
      expect(updated.name).toBe(channel.name);
      expect(updated.platform).toBe(channel.platform);
      expect(updated.config).toEqual(channel.config);
    });
  });

  describe('withConfig', () => {
    it('returns a new channel with updated config', () => {
      const channel = makeChannel({ config: { old: true } });
      const updated = channel.withConfig({ new: true });
      expect(updated.config).toEqual({ new: true });
      expect(channel.config).toEqual({ old: true });
    });
  });
});
