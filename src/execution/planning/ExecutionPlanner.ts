import { randomUUID } from 'crypto';
import type { ProductionPlan } from '../../creative/domain/models/ProductionPlan';
import { ExecutionNode } from '../domain/models/ExecutionNode';
import { ExecutionEdge } from '../domain/models/ExecutionEdge';
import { ExecutionGraph } from '../domain/models/ExecutionGraph';
import { ExecutionContext } from '../domain/models/ExecutionContext';
import { NodeType } from '../domain/models/NodeType';

const NODE_DURATION_MS: Readonly<Record<NodeType, number>> = {
  [NodeType.GenerateScript]: 5_000,
  [NodeType.GenerateImagePrompt]: 2_000,
  [NodeType.GenerateImage]: 30_000,
  [NodeType.AnimateImage]: 60_000,
  [NodeType.GenerateVoice]: 15_000,
  [NodeType.GenerateMusic]: 20_000,
  [NodeType.AssembleVideo]: 45_000,
  [NodeType.UploadAsset]: 10_000,
  [NodeType.PublishContent]: 5_000,
  [NodeType.Notify]: 1_000,
  [NodeType.CustomPlugin]: 5_000,
};

const NODE_COST: Readonly<Record<NodeType, number>> = {
  [NodeType.GenerateScript]: 0,
  [NodeType.GenerateImagePrompt]: 0,
  [NodeType.GenerateImage]: 0.1,
  [NodeType.AnimateImage]: 0.5,
  [NodeType.GenerateVoice]: 0.05,
  [NodeType.GenerateMusic]: 0.1,
  [NodeType.AssembleVideo]: 0.2,
  [NodeType.UploadAsset]: 0.01,
  [NodeType.PublishContent]: 0,
  [NodeType.Notify]: 0,
  [NodeType.CustomPlugin]: 0,
};

export interface PlannerInput {
  productionPlan: ProductionPlan;
  campaignId: string | null;
  ownerId: string;
}

export interface PlannerOutput {
  graph: ExecutionGraph;
  context: ExecutionContext;
  estimatedDurationMs: number;
  estimatedCost: number;
}

function makeNode(planId: string, type: NodeType, config: Record<string, unknown>): ExecutionNode {
  return ExecutionNode.create({
    planId,
    type,
    priority: 0,
    config,
    maxRetries: 2,
    estimatedDurationMs: NODE_DURATION_MS[type],
    estimatedCost: NODE_COST[type],
    metadata: {},
  });
}

function edge(from: string, to: string): ExecutionEdge {
  return ExecutionEdge.create({ fromNodeId: from, toNodeId: to, condition: 'on_success' });
}

export class ExecutionPlanner {
  plan(input: PlannerInput): PlannerOutput {
    const planId = randomUUID();
    const { productionPlan } = input;

    const nodes: ExecutionNode[] = [];
    const edges: ExecutionEdge[] = [];

    const scriptNode = makeNode(planId, NodeType.GenerateScript, {
      scenes: productionPlan.scriptPlan.scenes.map(s => ({
        index: s.index,
        title: s.title,
        voiceoverText: s.voiceoverText,
        durationSeconds: s.durationSeconds,
      })),
      totalDurationSeconds: productionPlan.scriptPlan.totalDurationSeconds,
      language: productionPlan.scriptPlan.language,
      voiceoverStyle: productionPlan.scriptPlan.voiceoverStyle,
    });

    const imagePromptNode = makeNode(planId, NodeType.GenerateImagePrompt, {
      thumbnailStyle: productionPlan.thumbnailPlan.style,
      imagePrompt: productionPlan.thumbnailPlan.imagePrompt,
      colorScheme: [...productionPlan.thumbnailPlan.colorScheme],
      moodKeywords: [...productionPlan.thumbnailPlan.moodKeywords],
    });

    const generateImageNode = makeNode(planId, NodeType.GenerateImage, {
      style: productionPlan.thumbnailPlan.style,
      dimensions: { width: 1920, height: 1080 },
    });

    const voiceNode = makeNode(planId, NodeType.GenerateVoice, {
      voiceStyle: productionPlan.voicePlan.voiceStyle,
      tone: productionPlan.voicePlan.tone,
      pacing: productionPlan.voicePlan.pacing,
      language: productionPlan.voicePlan.language,
    });

    const musicNode = makeNode(planId, NodeType.GenerateMusic, {
      mood: productionPlan.musicPlan.mood,
      genre: productionPlan.musicPlan.genre,
      tempoBpm: productionPlan.musicPlan.tempoBpm,
      durationSeconds: productionPlan.musicPlan.durationSeconds,
      energyLevel: productionPlan.musicPlan.energyLevel,
    });

    nodes.push(scriptNode, imagePromptNode, generateImageNode, voiceNode, musicNode);
    edges.push(
      edge(imagePromptNode.id, generateImageNode.id),
      edge(scriptNode.id, voiceNode.id),
    );

    const publishNodeIds: string[] = [];

    for (const platformPlan of productionPlan.platformPlans) {
      const animateNode = makeNode(planId, NodeType.AnimateImage, {
        platform: platformPlan.platform,
        contentType: platformPlan.contentType,
        videoLength: platformPlan.videoLength,
      });

      const assembleNode = makeNode(planId, NodeType.AssembleVideo, {
        platform: platformPlan.platform,
        targetDurationSeconds: platformPlan.videoLength,
        adaptations: [...platformPlan.adaptations],
      });

      const uploadNode = makeNode(planId, NodeType.UploadAsset, {
        platform: platformPlan.platform,
        destinationPath: `videos/${planId}/${platformPlan.platform}`,
        contentType: 'video/mp4',
      });

      const publishNode = makeNode(planId, NodeType.PublishContent, {
        platform: platformPlan.platform,
        priority: platformPlan.publishingPriority,
      });

      nodes.push(animateNode, assembleNode, uploadNode, publishNode);

      edges.push(
        edge(generateImageNode.id, animateNode.id),
        edge(animateNode.id, assembleNode.id),
        edge(voiceNode.id, assembleNode.id),
        edge(musicNode.id, assembleNode.id),
        edge(assembleNode.id, uploadNode.id),
        edge(uploadNode.id, publishNode.id),
      );

      publishNodeIds.push(publishNode.id);
    }

    const notifyNode = makeNode(planId, NodeType.Notify, {
      message: 'Execution completed for all platforms',
      planId,
    });
    nodes.push(notifyNode);

    for (const publishId of publishNodeIds) {
      edges.push(edge(publishId, notifyNode.id));
    }

    if (publishNodeIds.length === 0) {
      edges.push(edge(musicNode.id, notifyNode.id));
    }

    const graph = ExecutionGraph.create({ planId, nodes, edges });

    const estimatedCost = nodes.reduce((sum, n) => sum + n.estimatedCost, 0);
    const estimatedDurationMs = productionPlan.estimatedProductionDays * 24 * 60 * 60 * 1000;

    const context = ExecutionContext.create({
      planId: graph.id,
      campaignId: input.campaignId,
      ownerId: input.ownerId,
      variables: { productionPlanId: planId },
      artifacts: [],
    });

    return { graph, context, estimatedDurationMs, estimatedCost };
  }
}
