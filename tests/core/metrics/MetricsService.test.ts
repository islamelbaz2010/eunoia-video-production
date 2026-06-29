import { MetricsService } from '../../../src/core/metrics/MetricsService';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('incrementJobsExecuted', () => {
    it('increments counter', () => {
      service.incrementJobsExecuted();
      service.incrementJobsExecuted();
      expect(service.getSnapshot().jobsExecuted).toBe(2);
    });

    it('starts at 0', () => {
      expect(service.getSnapshot().jobsExecuted).toBe(0);
    });
  });

  describe('incrementJobsFailed', () => {
    it('increments counter', () => {
      service.incrementJobsFailed();
      expect(service.getSnapshot().jobsFailed).toBe(1);
    });
  });

  describe('recordExecutionTime', () => {
    it('computes average over multiple records', () => {
      service.recordExecutionTime(100);
      service.recordExecutionTime(200);
      service.recordExecutionTime(300);
      expect(service.getSnapshot().averageExecutionTimeMs).toBe(200);
    });

    it('returns 0 when no records', () => {
      expect(service.getSnapshot().averageExecutionTimeMs).toBe(0);
    });
  });

  describe('recordProviderLatency', () => {
    it('computes average latency per provider', () => {
      service.recordProviderLatency('openai', 100);
      service.recordProviderLatency('openai', 300);
      const snapshot = service.getSnapshot();
      expect(snapshot.providerLatency['openai']).toBe(200);
    });

    it('tracks multiple providers independently', () => {
      service.recordProviderLatency('openai', 100);
      service.recordProviderLatency('youtube', 50);
      const snapshot = service.getSnapshot();
      expect(snapshot.providerLatency['openai']).toBe(100);
      expect(snapshot.providerLatency['youtube']).toBe(50);
    });
  });

  describe('setQueueLength', () => {
    it('updates queue length in snapshot', () => {
      service.setQueueLength(42);
      expect(service.getSnapshot().queueLength).toBe(42);
    });
  });

  describe('getSnapshot', () => {
    it('returns a complete snapshot', () => {
      service.incrementJobsExecuted();
      service.incrementJobsFailed();
      service.recordExecutionTime(500);
      service.recordProviderLatency('rss', 80);
      service.setQueueLength(3);

      const snap = service.getSnapshot();
      expect(snap.jobsExecuted).toBe(1);
      expect(snap.jobsFailed).toBe(1);
      expect(snap.averageExecutionTimeMs).toBe(500);
      expect(snap.queueLength).toBe(3);
      expect(snap.providerLatency['rss']).toBe(80);
    });
  });
});
