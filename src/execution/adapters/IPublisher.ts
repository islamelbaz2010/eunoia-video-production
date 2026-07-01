export interface PublishInput {
  assetUrl: string;
  platform: string;
  title: string;
  description: string;
  tags: string[];
  scheduledAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface PublishOutput {
  postId: string;
  platform: string;
  url: string | null;
  publishedAt: Date | null;
  scheduledAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface IPublisher {
  publish(input: PublishInput): Promise<PublishOutput>;
}
