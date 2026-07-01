// Domain Models
export { ExecutionStatus, TERMINAL_STATUSES } from './domain/models/ExecutionStatus';
export { NodeType } from './domain/models/NodeType';
export { ExecutionArtifact } from './domain/models/ExecutionArtifact';
export type { ExecutionArtifactProps, CreateExecutionArtifactProps } from './domain/models/ExecutionArtifact';
export { ExecutionResult } from './domain/models/ExecutionResult';
export type { ExecutionResultProps } from './domain/models/ExecutionResult';
export { ExecutionEdge } from './domain/models/ExecutionEdge';
export type { ExecutionEdgeProps, EdgeCondition } from './domain/models/ExecutionEdge';
export { ExecutionDependency } from './domain/models/ExecutionDependency';
export type { ExecutionDependencyProps } from './domain/models/ExecutionDependency';
export { ExecutionNode } from './domain/models/ExecutionNode';
export type { ExecutionNodeProps, CreateExecutionNodeProps } from './domain/models/ExecutionNode';
export { ExecutionCheckpoint } from './domain/models/ExecutionCheckpoint';
export type { ExecutionCheckpointProps, CreateExecutionCheckpointProps } from './domain/models/ExecutionCheckpoint';
export { ExecutionContext } from './domain/models/ExecutionContext';
export type { ExecutionContextProps } from './domain/models/ExecutionContext';
export { ExecutionGraph } from './domain/models/ExecutionGraph';
export type { ExecutionGraphProps, CreateExecutionGraphProps } from './domain/models/ExecutionGraph';
export { ExecutionPlan } from './domain/models/ExecutionPlan';
export type { ExecutionPlanProps, CreateExecutionPlanProps } from './domain/models/ExecutionPlan';

// Repository
export type { IExecutionRepository, ExecutionFilter } from './domain/repositories/IExecutionRepository';

// Events
export { EXECUTION_EVENT_TYPES } from './events/ExecutionEvents';
export type {
  ExecutionEventType,
  ExecutionStarted,
  ExecutionNodeStarted,
  ExecutionNodeCompleted,
  ExecutionNodeFailed,
  ExecutionPaused,
  ExecutionResumed,
  ExecutionCancelled,
  ExecutionFinished,
} from './events/ExecutionEvents';

// Adapter Interfaces
export type { IImageGenerator, ImageGenerationInput, ImageGenerationOutput } from './adapters/IImageGenerator';
export type { IVideoGenerator, VideoGenerationInput, VideoGenerationOutput } from './adapters/IVideoGenerator';
export type { IVoiceGenerator, VoiceGenerationInput, VoiceGenerationOutput } from './adapters/IVoiceGenerator';
export type { IMusicGenerator, MusicGenerationInput, MusicGenerationOutput } from './adapters/IMusicGenerator';
export type { IVideoAssembler, VideoAssemblyInput, VideoAssemblyOutput } from './adapters/IVideoAssembler';
export type { IUploader, UploadInput, UploadOutput } from './adapters/IUploader';
export type { IPublisher, PublishInput, PublishOutput } from './adapters/IPublisher';

// Mock Adapters
export { MockImageGenerator } from './adapters/mock/MockImageGenerator';
export { MockVideoGenerator } from './adapters/mock/MockVideoGenerator';
export { MockVoiceGenerator } from './adapters/mock/MockVoiceGenerator';
export { MockMusicGenerator } from './adapters/mock/MockMusicGenerator';
export { MockVideoAssembler } from './adapters/mock/MockVideoAssembler';
export { MockUploader } from './adapters/mock/MockUploader';
export { MockPublisher } from './adapters/mock/MockPublisher';

// Graph Engine
export { ExecutionGraphEngine } from './graph/ExecutionGraphEngine';
export type { GraphValidationResult } from './graph/ExecutionGraphEngine';

// Planning
export { ExecutionPlanner } from './planning/ExecutionPlanner';
export type { PlannerInput, PlannerOutput } from './planning/ExecutionPlanner';

// Validation
export { ExecutionValidator } from './validation/ExecutionValidator';
export type { ValidationError, ExecutionValidationResult } from './validation/ExecutionValidator';

// Orchestration
export { ExecutionEngine } from './orchestration/ExecutionEngine';
export type { ExecutionAdapters } from './orchestration/ExecutionEngine';

// Application
export { ExecutionService } from './application/ExecutionService';
export type { ExecuteProductionPlanInput } from './application/ExecutionService';

// Infrastructure
export { SupabaseExecutionRepository } from './infrastructure/SupabaseExecutionRepository';
