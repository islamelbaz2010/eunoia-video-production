import { ExecutionPlanner } from '../../../src/execution/planning/ExecutionPlanner';
import { ProductionPlan } from '../../../src/creative/domain/models/ProductionPlan';
import { ScriptPlan } from '../../../src/creative/domain/models/ScriptPlan';
import { ThumbnailPlan } from '../../../src/creative/domain/models/ThumbnailPlan';
import { VoicePlan } from '../../../src/creative/domain/models/VoicePlan';
import { MusicPlan } from '../../../src/creative/domain/models/MusicPlan';
import { PlatformPlan } from '../../../src/creative/domain/models/PlatformPlan';
import { NodeType } from '../../../src/execution/domain/models/NodeType';
import { ExecutionGraphEngine } from '../../../src/execution/graph/ExecutionGraphEngine';
import {
  VoiceStyle,
  ThumbnailStyle,
  MusicMood,
  Platform,
  ContentType,
  VideoLength,
} from '../../../src/creative';

function makeProductionPlan(platformCount = 1): ProductionPlan {
  const scriptPlan = ScriptPlan.create({
    scenes: [
      {
        index: 0,
        title: 'Intro',
        description: 'Introduction scene',
        durationSeconds: 15,
        visualCue: 'Open shot',
        voiceoverText: 'Welcome to this video',
      },
    ],
    totalDurationSeconds: 60,
    language: 'en',
    voiceoverStyle: VoiceStyle.Conversational,
  });

  const thumbnailPlan = ThumbnailPlan.create({
    style: ThumbnailStyle.HighContrast,
    textOverlay: 'Watch This',
    colorScheme: ['#ff0000', '#ffffff'],
    composition: 'centered',
    imagePrompt: 'Bold thumbnail with red background',
    moodKeywords: ['energetic', 'bold'],
  });

  const voicePlan = VoicePlan.create({
    voiceStyle: VoiceStyle.Conversational,
    tone: 'friendly',
    pacing: 'medium',
    language: 'en',
    accent: null,
  });

  const musicPlan = MusicPlan.create({
    mood: MusicMood.Upbeat,
    tempoBpm: 128,
    genre: 'electronic',
    durationSeconds: 60,
    energyLevel: 80,
  });

  const platformPlans = Array.from({ length: platformCount }, (_, i) =>
    PlatformPlan.create({
      platform: i === 0 ? Platform.YouTube : Platform.TikTok,
      contentType: ContentType.LongFormVideo,
      videoLength: VideoLength.Medium3m,
      publishingPriority: i + 1,
      adaptations: ['add-captions'],
    }),
  );

  return ProductionPlan.create({
    scriptPlan,
    thumbnailPlan,
    voicePlan,
    musicPlan,
    platformPlans,
    estimatedProductionDays: 3,
    productionOrder: ['script', 'image', 'voice', 'music', 'assemble'],
  });
}

describe('ExecutionPlanner', () => {
  let planner: ExecutionPlanner;
  let graphEngine: ExecutionGraphEngine;

  beforeEach(() => {
    planner = new ExecutionPlanner();
    graphEngine = new ExecutionGraphEngine();
  });

  describe('plan', () => {
    it('creates a valid graph for a single platform', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: 'c-1', ownerId: 'owner-1' });

      expect(result.graph.nodes.length).toBeGreaterThan(0);
      expect(result.graph.edges.length).toBeGreaterThan(0);
      expect(result.context.ownerId).toBe('owner-1');
      expect(result.context.campaignId).toBe('c-1');
    });

    it('produces a cycle-free DAG', () => {
      const productionPlan = makeProductionPlan(2);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });
      const hasCycle = graphEngine.detectCycles([...result.graph.nodes], [...result.graph.edges]);
      expect(hasCycle).toBe(false);
    });

    it('includes required node types', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });
      const types = result.graph.nodes.map(n => n.type);

      expect(types).toContain(NodeType.GenerateScript);
      expect(types).toContain(NodeType.GenerateImagePrompt);
      expect(types).toContain(NodeType.GenerateImage);
      expect(types).toContain(NodeType.GenerateVoice);
      expect(types).toContain(NodeType.GenerateMusic);
      expect(types).toContain(NodeType.AnimateImage);
      expect(types).toContain(NodeType.AssembleVideo);
      expect(types).toContain(NodeType.UploadAsset);
      expect(types).toContain(NodeType.PublishContent);
      expect(types).toContain(NodeType.Notify);
    });

    it('creates per-platform nodes for multiple platforms', () => {
      const productionPlan = makeProductionPlan(2);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });
      const publishNodes = result.graph.nodes.filter(n => n.type === NodeType.PublishContent);
      expect(publishNodes).toHaveLength(2);
    });

    it('computes estimatedCost as sum of all node costs', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });
      const expected = result.graph.nodes.reduce((s, n) => s + n.estimatedCost, 0);
      expect(result.estimatedCost).toBeCloseTo(expected, 5);
    });

    it('sets estimatedDurationMs from estimatedProductionDays', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });
      expect(result.estimatedDurationMs).toBe(3 * 24 * 60 * 60 * 1000);
    });

    it('GenerateImage depends on GenerateImagePrompt', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });

      const imagePromptNode = result.graph.nodes.find(n => n.type === NodeType.GenerateImagePrompt);
      const generateImageNode = result.graph.nodes.find(n => n.type === NodeType.GenerateImage);
      expect(imagePromptNode).toBeDefined();
      expect(generateImageNode).toBeDefined();

      const hasDependency = result.graph.edges.some(
        e => e.fromNodeId === imagePromptNode!.id && e.toNodeId === generateImageNode!.id,
      );
      expect(hasDependency).toBe(true);
    });

    it('GenerateVoice depends on GenerateScript', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });

      const scriptNode = result.graph.nodes.find(n => n.type === NodeType.GenerateScript);
      const voiceNode = result.graph.nodes.find(n => n.type === NodeType.GenerateVoice);
      expect(scriptNode).toBeDefined();
      expect(voiceNode).toBeDefined();

      const hasDependency = result.graph.edges.some(
        e => e.fromNodeId === scriptNode!.id && e.toNodeId === voiceNode!.id,
      );
      expect(hasDependency).toBe(true);
    });

    it('topological sort produces a valid ordering', () => {
      const productionPlan = makeProductionPlan(1);
      const result = planner.plan({ productionPlan, campaignId: null, ownerId: 'owner-1' });
      const sorted = graphEngine.topologicalSort([...result.graph.nodes], [...result.graph.edges]);
      expect(sorted).toHaveLength(result.graph.nodes.length);
    });
  });
});
