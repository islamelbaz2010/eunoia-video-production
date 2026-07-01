import { PromptPackage, makeLLMPrompt, makeImagePrompt, makeVideoPrompt, makeVoicePrompt, makeMusicPrompt } from '../domain/models/PromptPackage';
import type { ContentBrief } from '../domain/models/ContentBrief';
import type { CreativeStrategy } from '../domain/models/CreativeStrategy';
import type { ScriptPlan, SceneDescription } from '../domain/models/ScriptPlan';
import { TaskType } from '../../ai/domain/types/TaskType';

export class PromptBuilder {
  buildPromptPackage(
    planId: string,
    brief: ContentBrief,
    strategy: CreativeStrategy,
    scriptPlan: ScriptPlan,
  ): PromptPackage {
    const llmPrompts = this.buildLLMPrompts(brief, strategy, scriptPlan);
    const imagePrompts = this.buildImagePrompts(brief, strategy);
    const videoPrompts = this.buildVideoPrompts(scriptPlan, strategy);
    const voicePrompts = this.buildVoicePrompts(scriptPlan, strategy);
    const musicPrompts = this.buildMusicPrompts(strategy, scriptPlan.totalDurationSeconds);

    return PromptPackage.create({
      planId,
      llmPrompts,
      imagePrompts,
      videoPrompts,
      voicePrompts,
      musicPrompts,
    });
  }

  private buildLLMPrompts(
    brief: ContentBrief,
    strategy: CreativeStrategy,
    scriptPlan: ScriptPlan,
  ) {
    const systemPrompt = this.buildScriptSystemPrompt(brief, strategy);

    const outline = makeLLMPrompt({
      taskType: TaskType.Script,
      systemPrompt,
      userPrompt: `Create a script outline for a ${strategy.strategyType} video about "${brief.topic}". Target audience: ${brief.targetAudience}. Key messages: ${brief.keyMessages.join(', ')}.`,
      context: `Goal: ${brief.goal}. CTA: ${brief.callToAction}. Platform: ${brief.primaryPlatform}.`,
      maxTokens: 2000,
      temperature: 0.7,
      preferredProvider: strategy.providerFor('script'),
    });

    const scenePrompts = scriptPlan.scenes.map(scene =>
      makeLLMPrompt({
        taskType: TaskType.Script,
        systemPrompt,
        userPrompt: `Write the voiceover script for scene ${scene.index + 1}: "${scene.title}". Duration: ${scene.durationSeconds}s. Visual: ${scene.visualCue}.`,
        context: `Topic: ${brief.topic}. Voice style: ${strategy.voiceStyle}. Hook: ${strategy.hookStrategy}.`,
        maxTokens: 500,
        temperature: 0.7,
        preferredProvider: strategy.providerFor('script'),
      }),
    );

    return [outline, ...scenePrompts];
  }

  private buildImagePrompts(brief: ContentBrief, strategy: CreativeStrategy) {
    const thumbnail = makeImagePrompt({
      description: `Thumbnail for ${strategy.strategyType} video about "${brief.topic}". Style: ${strategy.visualStyle}. Target: ${brief.targetAudience}.`,
      style: `${strategy.visualStyle}, high contrast, eye-catching, professional`,
      aspectRatio: '16:9',
      negativePrompt: 'blurry, low quality, cluttered, dark',
      referenceStyle: strategy.strategyType,
    });

    return [thumbnail];
  }

  private buildVideoPrompts(scriptPlan: ScriptPlan, strategy: CreativeStrategy) {
    return scriptPlan.scenes.map(scene =>
      makeVideoPrompt({
        description: scene.visualCue,
        sceneIndex: scene.index,
        durationSeconds: scene.durationSeconds,
        transitions: scene.index > 0 ? 'smooth cut' : null,
        style: strategy.visualStyle,
      }),
    );
  }

  private buildVoicePrompts(scriptPlan: ScriptPlan, strategy: CreativeStrategy) {
    return scriptPlan.scenes.map(scene =>
      makeVoicePrompt({
        text: scene.voiceoverText,
        voiceStyle: strategy.voiceStyle,
        language: scriptPlan.language,
        emphasis: this.extractEmphasisWords(scene),
      }),
    );
  }

  private buildMusicPrompts(strategy: CreativeStrategy, durationSeconds: number) {
    const music = makeMusicPrompt({
      mood: strategy.musicMood,
      genre: GENRE_BY_MOOD[strategy.musicMood] ?? 'ambient',
      durationSeconds,
      tempoBpm: TEMPO_BY_MOOD[strategy.musicMood] ?? 120,
      energyLevel: ENERGY_BY_MOOD[strategy.musicMood] ?? 60,
    });

    return [music];
  }

  private buildScriptSystemPrompt(brief: ContentBrief, strategy: CreativeStrategy): string {
    return [
      `You are an expert ${strategy.strategyType} content writer.`,
      `Audience: ${brief.targetAudience}.`,
      `Goal: ${brief.goal}.`,
      `Hook strategy: ${strategy.hookStrategy}.`,
      `Story structure: ${strategy.storyStructure}.`,
      `CTA strategy: ${strategy.ctaStrategy}.`,
      `Keywords to include naturally: ${brief.keywords.join(', ')}.`,
    ].join(' ');
  }

  private extractEmphasisWords(scene: SceneDescription): string[] {
    const words = scene.voiceoverText.split(/\s+/);
    return words.filter(w => w.length > 7).slice(0, 3);
  }
}

const GENRE_BY_MOOD: Record<string, string> = {
  upbeat: 'pop',
  dramatic: 'orchestral',
  inspirational: 'cinematic',
  calm: 'ambient',
  suspenseful: 'thriller',
  playful: 'indie',
};

const TEMPO_BY_MOOD: Record<string, number> = {
  upbeat: 140,
  dramatic: 80,
  inspirational: 100,
  calm: 70,
  suspenseful: 90,
  playful: 130,
};

const ENERGY_BY_MOOD: Record<string, number> = {
  upbeat: 85,
  dramatic: 70,
  inspirational: 65,
  calm: 30,
  suspenseful: 55,
  playful: 75,
};
