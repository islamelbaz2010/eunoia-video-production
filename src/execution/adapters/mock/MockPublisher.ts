import { randomUUID } from 'crypto';
import type { IPublisher, PublishInput, PublishOutput } from '../IPublisher';

export class MockPublisher implements IPublisher {
  async publish(input: PublishInput): Promise<PublishOutput> {
    const postId = randomUUID();
    const publishedAt = input.scheduledAt === null ? new Date() : null;
    return {
      postId,
      platform: input.platform,
      url: `mock://${input.platform}/posts/${postId}`,
      publishedAt,
      scheduledAt: input.scheduledAt,
      metadata: { mock: true, title: input.title },
    };
  }
}
