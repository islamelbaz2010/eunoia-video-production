import { MockImageGenerator } from '../../../src/execution/adapters/mock/MockImageGenerator';
import { MockVideoGenerator } from '../../../src/execution/adapters/mock/MockVideoGenerator';
import { MockVoiceGenerator } from '../../../src/execution/adapters/mock/MockVoiceGenerator';
import { MockMusicGenerator } from '../../../src/execution/adapters/mock/MockMusicGenerator';
import { MockVideoAssembler } from '../../../src/execution/adapters/mock/MockVideoAssembler';
import { MockUploader } from '../../../src/execution/adapters/mock/MockUploader';
import { MockPublisher } from '../../../src/execution/adapters/mock/MockPublisher';

describe('MockImageGenerator', () => {
  it('resolves with url, width, height, format', async () => {
    const gen = new MockImageGenerator();
    const result = await gen.generate({
      prompt: 'bold thumbnail',
      style: 'photorealistic',
      dimensions: { width: 1920, height: 1080 },
      metadata: {},
    });
    expect(result.url).toMatch(/^mock:\/\//);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.format).toBe('png');
    expect(result.metadata['mock']).toBe(true);
  });
});

describe('MockVideoGenerator', () => {
  it('resolves with url and duration', async () => {
    const gen = new MockVideoGenerator();
    const result = await gen.generate({
      imageUrl: 'mock://image.png',
      durationSeconds: 30,
      motionStyle: 'cinematic',
      metadata: {},
    });
    expect(result.url).toMatch(/^mock:\/\//);
    expect(result.durationSeconds).toBe(30);
    expect(result.format).toBe('mp4');
  });
});

describe('MockVoiceGenerator', () => {
  it('resolves with url and estimated duration based on word count', async () => {
    const gen = new MockVoiceGenerator();
    const result = await gen.generate({
      text: 'Hello world this is a test script with ten words here',
      voiceStyle: 'conversational',
      tone: 'friendly',
      pacing: 'medium',
      language: 'en',
      metadata: {},
    });
    expect(result.url).toMatch(/^mock:\/\//);
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.format).toBe('mp3');
  });
});

describe('MockMusicGenerator', () => {
  it('resolves with url and correct duration', async () => {
    const gen = new MockMusicGenerator();
    const result = await gen.generate({
      mood: 'energetic',
      genre: 'electronic',
      tempoBpm: 128,
      durationSeconds: 60,
      energyLevel: 80,
      metadata: {},
    });
    expect(result.url).toMatch(/^mock:\/\//);
    expect(result.durationSeconds).toBe(60);
    expect(result.format).toBe('mp3');
    expect(result.metadata['mood']).toBe('energetic');
  });
});

describe('MockVideoAssembler', () => {
  it('resolves with assembled video url and platform', async () => {
    const asm = new MockVideoAssembler();
    const result = await asm.assemble({
      videoUrl: 'mock://video.mp4',
      voiceUrl: 'mock://voice.mp3',
      musicUrl: 'mock://music.mp3',
      platform: 'youtube',
      targetDurationSeconds: 60,
      metadata: {},
    });
    expect(result.url).toMatch(/^mock:\/\//);
    expect(result.platform).toBe('youtube');
    expect(result.durationSeconds).toBe(60);
  });

  it('handles null musicUrl', async () => {
    const asm = new MockVideoAssembler();
    const result = await asm.assemble({
      videoUrl: 'mock://video.mp4',
      voiceUrl: 'mock://voice.mp3',
      musicUrl: null,
      platform: 'tiktok',
      targetDurationSeconds: 15,
      metadata: {},
    });
    expect(result.url).toMatch(/^mock:\/\//);
  });
});

describe('MockUploader', () => {
  it('resolves with storage url at destination path', async () => {
    const uploader = new MockUploader();
    const result = await uploader.upload({
      sourceUrl: 'mock://assembled.mp4',
      destinationPath: 'videos/plan-1/youtube',
      contentType: 'video/mp4',
      metadata: {},
    });
    expect(result.url).toContain('videos/plan-1/youtube');
    expect(result.destinationPath).toBe('videos/plan-1/youtube');
    expect(result.sizeBytes).toBeGreaterThan(0);
  });
});

describe('MockPublisher', () => {
  it('resolves with a postId and url when scheduledAt is null', async () => {
    const publisher = new MockPublisher();
    const result = await publisher.publish({
      assetUrl: 'mock://storage/video.mp4',
      platform: 'youtube',
      title: 'Test Video',
      description: 'A test',
      tags: ['test'],
      scheduledAt: null,
      metadata: {},
    });
    expect(result.postId).toBeDefined();
    expect(result.platform).toBe('youtube');
    expect(result.publishedAt).not.toBeNull();
    expect(result.scheduledAt).toBeNull();
  });

  it('sets scheduledAt and leaves publishedAt null when scheduling', async () => {
    const publisher = new MockPublisher();
    const scheduled = new Date(Date.now() + 86400000);
    const result = await publisher.publish({
      assetUrl: 'mock://video.mp4',
      platform: 'tiktok',
      title: 'Scheduled',
      description: '',
      tags: [],
      scheduledAt: scheduled,
      metadata: {},
    });
    expect(result.scheduledAt).not.toBeNull();
    expect(result.publishedAt).toBeNull();
  });
});
