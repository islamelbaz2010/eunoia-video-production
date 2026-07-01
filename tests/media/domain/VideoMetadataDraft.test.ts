import { VideoMetadataDraft } from '../../../src/media/domain/models/VideoMetadataDraft';
import type { Chapter } from '../../../src/media/domain/models/Chapter';

function makeDraft(overrides: Partial<Parameters<typeof VideoMetadataDraft.create>[0]> = {}): VideoMetadataDraft {
  return VideoMetadataDraft.create({
    assetId: 'asset-1',
    titleCandidates: [{ text: 'Title A', score: 0.9, rationale: 'top pick' }],
    descriptionDraft: 'A test description',
    tags: ['tag1', 'tag2'],
    chapters: [{ timestampSeconds: 0, title: 'Intro' }],
    generatedAt: new Date(),
    modelVersion: 'v1',
    ...overrides,
  });
}

describe('VideoMetadataDraft', () => {
  describe('create', () => {
    it('initializes with no accepted fields', () => {
      const draft = makeDraft();
      expect(draft.id).toBeDefined();
      expect(draft.acceptedTitle).toBeNull();
      expect(draft.acceptedDescription).toBeNull();
      expect(draft.acceptedTags).toBeNull();
      expect(draft.acceptedChapters).toBeNull();
      expect(draft.creatorReviewedAt).toBeNull();
    });

    it('stores all provided props', () => {
      const draft = makeDraft();
      expect(draft.assetId).toBe('asset-1');
      expect(draft.titleCandidates).toHaveLength(1);
      expect(draft.tags).toHaveLength(2);
      expect(draft.modelVersion).toBe('v1');
    });
  });

  describe('isAccepted', () => {
    it('returns false before acceptance', () => {
      const draft = makeDraft();
      expect(draft.isAccepted()).toBe(false);
    });
  });

  describe('withAcceptance', () => {
    it('returns new draft with accepted fields and creatorReviewedAt set', () => {
      const draft = makeDraft();
      const chapters: Chapter[] = [{ timestampSeconds: 0, title: 'Intro' }];
      const accepted = draft.withAcceptance('My Title', 'My Desc', ['t1'], chapters);

      expect(accepted.acceptedTitle).toBe('My Title');
      expect(accepted.acceptedDescription).toBe('My Desc');
      expect(accepted.acceptedTags).toEqual(['t1']);
      expect(accepted.acceptedChapters).toEqual(chapters);
      expect(accepted.creatorReviewedAt).toBeInstanceOf(Date);
    });

    it('does not mutate the original draft', () => {
      const draft = makeDraft();
      draft.withAcceptance('Title', 'Desc', [], []);
      expect(draft.acceptedTitle).toBeNull();
    });
  });

  describe('isAccepted after withAcceptance', () => {
    it('returns true after withAcceptance', () => {
      const draft = makeDraft().withAcceptance('Title', 'Desc', [], []);
      expect(draft.isAccepted()).toBe(true);
    });
  });

  describe('reconstitute', () => {
    it('restores all fields', () => {
      const now = new Date('2025-01-01');
      const draft = VideoMetadataDraft.reconstitute({
        id: 'draft-1',
        assetId: 'asset-1',
        titleCandidates: [],
        descriptionDraft: 'desc',
        tags: [],
        chapters: [],
        acceptedTitle: 'Accepted',
        acceptedDescription: 'AcceptedDesc',
        acceptedTags: ['t1'],
        acceptedChapters: [],
        creatorReviewedAt: now,
        generatedAt: now,
        modelVersion: 'v1',
      });
      expect(draft.id).toBe('draft-1');
      expect(draft.acceptedTitle).toBe('Accepted');
      expect(draft.creatorReviewedAt).not.toBeNull();
    });
  });
});
