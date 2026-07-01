import { ExecutionNode } from '../../../src/execution/domain/models/ExecutionNode';
import { ExecutionResult } from '../../../src/execution/domain/models/ExecutionResult';
import { ExecutionStatus } from '../../../src/execution/domain/models/ExecutionStatus';
import { NodeType } from '../../../src/execution/domain/models/NodeType';

function makeProps() {
  return {
    planId: 'plan-1',
    type: NodeType.GenerateScript,
    priority: 1,
    config: { key: 'value' },
    maxRetries: 2,
    estimatedDurationMs: 5000,
    estimatedCost: 0.1,
    metadata: { tag: 'test' },
  };
}

function makeResult(nodeId: string, status = ExecutionStatus.Succeeded): ExecutionResult {
  return ExecutionResult.create({
    nodeId,
    status,
    output: { url: 'mock://file.mp4' },
    durationMs: 1000,
    error: null,
    completedAt: new Date(),
  });
}

describe('ExecutionNode', () => {
  describe('create', () => {
    it('creates node with Pending status and generated id', () => {
      const node = ExecutionNode.create(makeProps());
      expect(node.id).toBeDefined();
      expect(node.status).toBe(ExecutionStatus.Pending);
      expect(node.retryCount).toBe(0);
      expect(node.result).toBeNull();
      expect(node.startedAt).toBeNull();
      expect(node.completedAt).toBeNull();
      expect(node.error).toBeNull();
    });

    it('freezes config and metadata', () => {
      const node = ExecutionNode.create(makeProps());
      expect(() => {
        (node.config as Record<string, unknown>)['injected'] = true;
      }).toThrow();
    });

    it('copies timestamps defensively from props', () => {
      const sourceDate = new Date('2025-01-01');
      const node = ExecutionNode.reconstitute({
        id: 'node-1',
        planId: 'plan-1',
        type: NodeType.GenerateScript,
        status: ExecutionStatus.Pending,
        priority: 1,
        config: {},
        result: null,
        retryCount: 0,
        maxRetries: 2,
        estimatedDurationMs: 5000,
        estimatedCost: 0,
        startedAt: null,
        completedAt: null,
        error: null,
        metadata: {},
        createdAt: sourceDate,
        updatedAt: sourceDate,
      });
      const storedYear = node.createdAt.getFullYear();
      sourceDate.setFullYear(2000);
      expect(node.createdAt.getFullYear()).toBe(storedYear);
    });
  });

  describe('reconstitute', () => {
    it('restores node exactly as provided', () => {
      const now = new Date();
      const node = ExecutionNode.reconstitute({
        id: 'node-abc',
        planId: 'plan-1',
        type: NodeType.GenerateImage,
        status: ExecutionStatus.Running,
        priority: 2,
        config: {},
        result: null,
        retryCount: 1,
        maxRetries: 3,
        estimatedDurationMs: 30000,
        estimatedCost: 0.5,
        startedAt: now,
        completedAt: null,
        error: null,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      });

      expect(node.id).toBe('node-abc');
      expect(node.type).toBe(NodeType.GenerateImage);
      expect(node.status).toBe(ExecutionStatus.Running);
      expect(node.retryCount).toBe(1);
    });
  });

  describe('withStatus', () => {
    it('returns new node with updated status', () => {
      const node = ExecutionNode.create(makeProps());
      const updated = node.withStatus(ExecutionStatus.Ready);
      expect(updated.status).toBe(ExecutionStatus.Ready);
      expect(updated.id).toBe(node.id);
      expect(node.status).toBe(ExecutionStatus.Pending);
    });

    it('bumps updatedAt', () => {
      const node = ExecutionNode.create(makeProps());
      const before = node.updatedAt;
      const updated = node.withStatus(ExecutionStatus.Running);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('withResult', () => {
    it('sets result and status from result', () => {
      const node = ExecutionNode.create(makeProps());
      const result = makeResult(node.id);
      const completed = node.withResult(result);
      expect(completed.result).toBe(result);
      expect(completed.status).toBe(ExecutionStatus.Succeeded);
    });

    it('sets error from result', () => {
      const node = ExecutionNode.create(makeProps());
      const result = ExecutionResult.create({
        nodeId: node.id,
        status: ExecutionStatus.Failed,
        output: {},
        durationMs: 500,
        error: 'something went wrong',
        completedAt: new Date(),
      });
      const failed = node.withResult(result);
      expect(failed.error).toBe('something went wrong');
      expect(failed.status).toBe(ExecutionStatus.Failed);
    });
  });

  describe('withStartedAt', () => {
    it('sets startedAt and transitions to Running', () => {
      const node = ExecutionNode.create(makeProps());
      const now = new Date();
      const started = node.withStartedAt(now);
      expect(started.startedAt).not.toBeNull();
      expect(started.status).toBe(ExecutionStatus.Running);
    });
  });

  describe('withRetry', () => {
    it('increments retryCount and sets Retrying status', () => {
      const node = ExecutionNode.create(makeProps());
      const retrying = node.withRetry();
      expect(retrying.retryCount).toBe(1);
      expect(retrying.status).toBe(ExecutionStatus.Retrying);
    });
  });

  describe('isTerminal', () => {
    it.each([
      ExecutionStatus.Succeeded,
      ExecutionStatus.Failed,
      ExecutionStatus.Cancelled,
      ExecutionStatus.Skipped,
    ])('returns true for %s', status => {
      const node = ExecutionNode.create(makeProps()).withStatus(status);
      expect(node.isTerminal()).toBe(true);
    });

    it.each([ExecutionStatus.Pending, ExecutionStatus.Running, ExecutionStatus.Waiting])(
      'returns false for %s',
      status => {
        const node = ExecutionNode.create(makeProps()).withStatus(status);
        expect(node.isTerminal()).toBe(false);
      },
    );
  });

  describe('canRetry', () => {
    it('returns true when retryCount < maxRetries', () => {
      const node = ExecutionNode.create(makeProps());
      expect(node.canRetry()).toBe(true);
    });

    it('returns false when retryCount === maxRetries', () => {
      let node = ExecutionNode.create(makeProps());
      node = node.withRetry().withRetry();
      expect(node.canRetry()).toBe(false);
    });
  });

  describe('isReady', () => {
    it('returns true only when status is Ready', () => {
      const node = ExecutionNode.create(makeProps()).withStatus(ExecutionStatus.Ready);
      expect(node.isReady()).toBe(true);
    });

    it('returns false for Pending', () => {
      const node = ExecutionNode.create(makeProps());
      expect(node.isReady()).toBe(false);
    });
  });
});
