import { createDomainEvent } from '../../core/events/DomainEvent';
import type { IEventBus } from '../../core/events/IEventBus';
import type { IMetricsService } from '../../core/metrics/IMetricsService';
import type { ILogger } from '../../shared/logger/ILogger';
import { AppError, NotFoundError } from '../../shared/errors/AppError';
import { ExecutionPlan } from '../domain/models/ExecutionPlan';
import { ExecutionNode } from '../domain/models/ExecutionNode';
import { ExecutionResult } from '../domain/models/ExecutionResult';
import { ExecutionArtifact } from '../domain/models/ExecutionArtifact';
import { ExecutionCheckpoint } from '../domain/models/ExecutionCheckpoint';
import { ExecutionStatus } from '../domain/models/ExecutionStatus';
import { NodeType } from '../domain/models/NodeType';
import type { IExecutionRepository } from '../domain/repositories/IExecutionRepository';
import { ExecutionGraphEngine } from '../graph/ExecutionGraphEngine';
import { EXECUTION_EVENT_TYPES } from '../events/ExecutionEvents';
import type { IImageGenerator } from '../adapters/IImageGenerator';
import type { IVideoGenerator } from '../adapters/IVideoGenerator';
import type { IVoiceGenerator } from '../adapters/IVoiceGenerator';
import type { IMusicGenerator } from '../adapters/IMusicGenerator';
import type { IVideoAssembler } from '../adapters/IVideoAssembler';
import type { IUploader } from '../adapters/IUploader';
import type { IPublisher } from '../adapters/IPublisher';
import type { ExecutionContext } from '../domain/models/ExecutionContext';

export interface ExecutionAdapters {
  imageGenerator: IImageGenerator;
  videoGenerator: IVideoGenerator;
  voiceGenerator: IVoiceGenerator;
  musicGenerator: IMusicGenerator;
  videoAssembler: IVideoAssembler;
  uploader: IUploader;
  publisher: IPublisher;
}

export class ExecutionEngine {
  private readonly logger: ILogger;
  private readonly graphEngine: ExecutionGraphEngine;
  private readonly cancellationTokens = new Set<string>();

  constructor(
    private readonly repository: IExecutionRepository,
    private readonly adapters: ExecutionAdapters,
    private readonly eventBus: IEventBus,
    private readonly metrics: IMetricsService,
    logger: ILogger,
  ) {
    this.logger = logger.child({ service: 'ExecutionEngine' });
    this.graphEngine = new ExecutionGraphEngine();
  }

  async execute(plan: ExecutionPlan): Promise<ExecutionPlan> {
    this.logger.info({ planId: plan.id }, 'Execution started');

    const startTime = Date.now();
    let current = plan.withStartedAt(new Date());
    current = await this.repository.savePlan(current);

    await this.eventBus.publish(
      createDomainEvent(EXECUTION_EVENT_TYPES.Started, current.id, {
        ownerId: current.ownerId,
        campaignId: current.campaignId,
        nodeCount: current.graph.nodes.length,
      }),
    );

    try {
      current = await this.runGraph(current);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error({ planId: plan.id, error: errMsg }, 'Execution failed with unexpected error');
      current = current.withCompletedAt(new Date(), ExecutionStatus.Failed);
      current = await this.repository.savePlan(current);
    }

    const durationMs = Date.now() - startTime;
    this.metrics.recordExecutionTime(durationMs);

    const finalStatus = current.status;
    if (finalStatus === ExecutionStatus.Succeeded) {
      this.metrics.incrementJobsExecuted();
    } else if (finalStatus === ExecutionStatus.Failed) {
      this.metrics.incrementJobsFailed();
    }

    await this.eventBus.publish(
      createDomainEvent(EXECUTION_EVENT_TYPES.Finished, current.id, {
        status: finalStatus,
        completedAt: current.completedAt ?? new Date(),
        durationMs,
        succeededNodes: current.graph.succeededNodeCount(),
        failedNodes: current.graph.failedNodeCount(),
      }),
    );

    this.logger.info({ planId: plan.id, status: finalStatus, durationMs }, 'Execution finished');
    return current;
  }

  async cancel(planId: string, reason: string | null = null): Promise<ExecutionPlan> {
    const plan = await this.repository.findPlanById(planId);
    if (plan === null) throw new NotFoundError('ExecutionPlan', planId);

    if (plan.isTerminal()) {
      throw new AppError(
        `Cannot cancel execution plan ${planId}: already in terminal status ${plan.status}`,
        'EXECUTION_ALREADY_TERMINAL',
      );
    }

    this.cancellationTokens.add(planId);

    let updated = plan;
    const updatedNodes = updated.graph.nodes.map(node => {
      if (!node.isTerminal()) {
        return node.withStatus(ExecutionStatus.Cancelled);
      }
      return node;
    });

    let updatedGraph = updated.graph;
    for (const node of updatedNodes) {
      updatedGraph = updatedGraph.withUpdatedNode(node);
    }

    updated = updated.withGraph(updatedGraph).withCompletedAt(new Date(), ExecutionStatus.Cancelled);
    updated = await this.repository.savePlan(updated);

    await this.eventBus.publish(
      createDomainEvent(EXECUTION_EVENT_TYPES.Cancelled, planId, {
        cancelledAt: new Date(),
        reason,
      }),
    );

    this.logger.info({ planId, reason }, 'Execution cancelled');
    return updated;
  }

  async resume(planId: string): Promise<ExecutionPlan> {
    const plan = await this.repository.findPlanById(planId);
    if (plan === null) throw new NotFoundError('ExecutionPlan', planId);

    if (plan.status !== ExecutionStatus.Failed) {
      throw new AppError(
        `Cannot resume execution plan ${planId}: status is ${plan.status}`,
        'EXECUTION_NOT_RESUMABLE',
      );
    }

    this.cancellationTokens.delete(planId);

    const checkpoint = plan.latestCheckpoint();
    let current = plan.withStatus(ExecutionStatus.Running);
    current = await this.repository.savePlan(current);

    await this.eventBus.publish(
      createDomainEvent(EXECUTION_EVENT_TYPES.Resumed, planId, {
        resumedAt: new Date(),
        fromCheckpointId: checkpoint?.id ?? null,
      }),
    );

    this.logger.info({ planId, fromCheckpointId: checkpoint?.id ?? null }, 'Execution resumed');
    return this.execute(current);
  }

  private async runGraph(plan: ExecutionPlan): Promise<ExecutionPlan> {
    let current = plan;

    while (true) {
      if (this.cancellationTokens.has(current.id)) {
        this.cancellationTokens.delete(current.id);
        current = current.withCompletedAt(new Date(), ExecutionStatus.Cancelled);
        return await this.repository.savePlan(current);
      }

      if (current.graph.isComplete()) {
        const finalStatus = current.graph.hasFailed()
          ? ExecutionStatus.Failed
          : ExecutionStatus.Succeeded;
        current = current.withCompletedAt(new Date(), finalStatus);
        return await this.repository.savePlan(current);
      }

      const completedIds = new Set(
        current.graph.nodes.filter(n => n.status === ExecutionStatus.Succeeded).map(n => n.id),
      );
      const cancelledIds = new Set(
        current.graph.nodes.filter(n => n.status === ExecutionStatus.Cancelled).map(n => n.id),
      );

      const failedNodes = current.graph.nodes.filter(n => n.status === ExecutionStatus.Failed);
      const nonRetryableFailed = failedNodes.filter(n => !n.canRetry());
      if (nonRetryableFailed.length > 0) {
        current = current.withCompletedAt(new Date(), ExecutionStatus.Failed);
        return await this.repository.savePlan(current);
      }

      // Reset retrying nodes back to Pending so they are re-queued in the next pass
      const retryingNodes = current.graph.nodes.filter(
        n => n.status === ExecutionStatus.Retrying,
      );
      if (retryingNodes.length > 0) {
        let rg = current.graph;
        for (const rn of retryingNodes) {
          rg = rg.withUpdatedNode(rn.withStatus(ExecutionStatus.Pending));
        }
        current = current.withGraph(rg);
        continue;
      }

      const readyNodes = this.graphEngine.getReadyNodes(
        [...current.graph.nodes],
        [...current.graph.edges],
        completedIds,
        cancelledIds,
      );

      if (readyNodes.length === 0) {
        const runningOrRetrying = current.graph.nodes.filter(
          n => n.status === ExecutionStatus.Running || n.status === ExecutionStatus.Retrying,
        );
        if (runningOrRetrying.length === 0) {
          const finalStatus = current.graph.hasFailed()
            ? ExecutionStatus.Failed
            : ExecutionStatus.Succeeded;
          current = current.withCompletedAt(new Date(), finalStatus);
          return await this.repository.savePlan(current);
        }
        break;
      }

      const startedNodes = readyNodes.map(n => n.withStatus(ExecutionStatus.Running));
      let updatedGraph = current.graph;
      for (const node of startedNodes) {
        updatedGraph = updatedGraph.withUpdatedNode(node);
      }
      current = current.withGraph(updatedGraph);

      const results = await Promise.all(
        startedNodes.map(node => this.executeNode(node, current.context)),
      );

      for (const resultNode of results) {
        updatedGraph = updatedGraph.withUpdatedNode(resultNode);
      }
      current = current.withGraph(updatedGraph);

      current = await this.checkpoint(current);
      current = await this.repository.savePlan(current);
    }

    return current;
  }

  private async executeNode(node: ExecutionNode, context: ExecutionContext): Promise<ExecutionNode> {
    const startedNode = node.withStartedAt(new Date());
    const startTime = Date.now();

    await this.eventBus.publish(
      createDomainEvent(EXECUTION_EVENT_TYPES.NodeStarted, node.planId, {
        nodeId: node.id,
        nodeType: node.type,
        planId: node.planId,
      }),
    );

    try {
      const output = await this.dispatchNodeExecution(startedNode, context);
      const durationMs = Date.now() - startTime;

      const result = ExecutionResult.create({
        nodeId: node.id,
        status: ExecutionStatus.Succeeded,
        output,
        durationMs,
        error: null,
        completedAt: new Date(),
      });

      const completedNode = startedNode.withResult(result);

      this.metrics.recordProviderLatency(node.type, durationMs);

      await this.eventBus.publish(
        createDomainEvent(EXECUTION_EVENT_TYPES.NodeCompleted, node.planId, {
          nodeId: node.id,
          nodeType: node.type,
          planId: node.planId,
          durationMs,
        }),
      );

      this.logger.info({ nodeId: node.id, type: node.type, durationMs }, 'Node succeeded');
      return completedNode;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const errMsg = err instanceof Error ? err.message : String(err);
      const willRetry = startedNode.canRetry();

      const result = ExecutionResult.create({
        nodeId: node.id,
        status: willRetry ? ExecutionStatus.Retrying : ExecutionStatus.Failed,
        output: {},
        durationMs,
        error: errMsg,
        completedAt: new Date(),
      });

      const failedNode = willRetry
        ? startedNode.withRetry()
        : startedNode.withResult(result);

      await this.eventBus.publish(
        createDomainEvent(EXECUTION_EVENT_TYPES.NodeFailed, node.planId, {
          nodeId: node.id,
          nodeType: node.type,
          planId: node.planId,
          error: errMsg,
          retryCount: failedNode.retryCount,
          willRetry,
        }),
      );

      this.logger.warn(
        { nodeId: node.id, type: node.type, error: errMsg, willRetry },
        'Node failed',
      );

      return failedNode;
    }
  }

  private async dispatchNodeExecution(
    node: ExecutionNode,
    context: ExecutionContext,
  ): Promise<Record<string, unknown>> {
    const cfg = node.config;

    switch (node.type) {
      case NodeType.GenerateScript: {
        return {
          scenes: cfg['scenes'],
          totalDurationSeconds: cfg['totalDurationSeconds'],
          language: cfg['language'],
          generatedAt: new Date().toISOString(),
        };
      }

      case NodeType.GenerateImagePrompt: {
        return {
          prompt: cfg['imagePrompt'],
          style: cfg['thumbnailStyle'],
          colorScheme: cfg['colorScheme'],
          generatedAt: new Date().toISOString(),
        };
      }

      case NodeType.GenerateImage: {
        const style = typeof cfg['style'] === 'string' ? cfg['style'] : 'default';
        const dimensions = (cfg['dimensions'] as { width: number; height: number } | undefined) ?? { width: 1920, height: 1080 };
        const prompt = String(
          context.getVariable('imagePrompt') ?? `Style: ${style}`,
        );
        const result = await this.adapters.imageGenerator.generate({
          prompt,
          style,
          dimensions,
          metadata: { nodeId: node.id },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.AnimateImage: {
        const imageUrl = String(context.getVariable('imageUrl') ?? 'mock://default-image.png');
        const platform = typeof cfg['platform'] === 'string' ? cfg['platform'] : 'unknown';
        const durationSeconds = typeof cfg['videoLength'] === 'number' ? cfg['videoLength'] : 60;
        const result = await this.adapters.videoGenerator.generate({
          imageUrl,
          durationSeconds,
          motionStyle: 'cinematic',
          metadata: { nodeId: node.id, platform },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.GenerateVoice: {
        const voiceStyle = typeof cfg['voiceStyle'] === 'string' ? cfg['voiceStyle'] : 'neutral';
        const tone = typeof cfg['tone'] === 'string' ? cfg['tone'] : 'professional';
        const pacing = typeof cfg['pacing'] === 'string' ? cfg['pacing'] : 'medium';
        const language = typeof cfg['language'] === 'string' ? cfg['language'] : 'en';
        const script = String(context.getVariable('script') ?? 'Default script text');
        const result = await this.adapters.voiceGenerator.generate({
          text: script,
          voiceStyle,
          tone,
          pacing,
          language,
          metadata: { nodeId: node.id },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.GenerateMusic: {
        const mood = typeof cfg['mood'] === 'string' ? cfg['mood'] : 'neutral';
        const genre = typeof cfg['genre'] === 'string' ? cfg['genre'] : 'ambient';
        const tempoBpm = typeof cfg['tempoBpm'] === 'number' ? cfg['tempoBpm'] : 120;
        const durationSeconds = typeof cfg['durationSeconds'] === 'number' ? cfg['durationSeconds'] : 60;
        const energyLevel = typeof cfg['energyLevel'] === 'number' ? cfg['energyLevel'] : 50;
        const result = await this.adapters.musicGenerator.generate({
          mood,
          genre,
          tempoBpm,
          durationSeconds,
          energyLevel,
          metadata: { nodeId: node.id },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.AssembleVideo: {
        const videoUrl = String(context.getVariable('animatedVideoUrl') ?? 'mock://video.mp4');
        const voiceUrl = String(context.getVariable('voiceUrl') ?? 'mock://voice.mp3');
        const musicUrl = String(context.getVariable('musicUrl') ?? 'mock://music.mp3');
        const platform = typeof cfg['platform'] === 'string' ? cfg['platform'] : 'unknown';
        const targetDurationSeconds = typeof cfg['targetDurationSeconds'] === 'number' ? cfg['targetDurationSeconds'] : 60;
        const result = await this.adapters.videoAssembler.assemble({
          videoUrl,
          voiceUrl,
          musicUrl,
          platform,
          targetDurationSeconds,
          metadata: { nodeId: node.id },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.UploadAsset: {
        const sourceUrl = String(context.getVariable('assembledVideoUrl') ?? 'mock://assembled.mp4');
        const destinationPath = typeof cfg['destinationPath'] === 'string' ? cfg['destinationPath'] : `videos/${node.id}`;
        const contentType = typeof cfg['contentType'] === 'string' ? cfg['contentType'] : 'video/mp4';
        const result = await this.adapters.uploader.upload({
          sourceUrl,
          destinationPath,
          contentType,
          metadata: { nodeId: node.id },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.PublishContent: {
        const assetUrl = String(context.getVariable('uploadedAssetUrl') ?? 'mock://asset.mp4');
        const platform = typeof cfg['platform'] === 'string' ? cfg['platform'] : 'unknown';
        const result = await this.adapters.publisher.publish({
          assetUrl,
          platform,
          title: String(context.getVariable('title') ?? 'Untitled'),
          description: String(context.getVariable('description') ?? ''),
          tags: [],
          scheduledAt: null,
          metadata: { nodeId: node.id },
        });
        return result as unknown as Record<string, unknown>;
      }

      case NodeType.Notify: {
        this.logger.info({ nodeId: node.id, message: cfg['message'] }, 'Notify node executed');
        return { notified: true, at: new Date().toISOString(), message: cfg['message'] };
      }

      case NodeType.CustomPlugin: {
        return { executed: true, at: new Date().toISOString(), pluginConfig: cfg };
      }

      default: {
        return { skipped: true, reason: 'Unknown node type' };
      }
    }
  }

  private async checkpoint(plan: ExecutionPlan): Promise<ExecutionPlan> {
    const nodeStatuses: Record<string, ExecutionStatus> = {};
    for (const node of plan.graph.nodes) {
      nodeStatuses[node.id] = node.status;
    }

    const artifacts = plan.graph.nodes
      .filter(n => n.status === ExecutionStatus.Succeeded && n.result !== null)
      .map(n =>
        ExecutionArtifact.create({
          nodeId: n.id,
          type: n.type,
          url: null,
          data: n.result !== null ? { ...n.result.output } : {},
        }),
      );

    const checkpoint = ExecutionCheckpoint.create({
      planId: plan.id,
      nodeStatuses,
      artifacts,
    });

    await this.repository.saveCheckpoint(checkpoint);
    return plan.withCheckpoint(checkpoint);
  }
}
