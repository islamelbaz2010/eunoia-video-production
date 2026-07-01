export enum CreativeGoal {
  Education = 'education',
  Entertainment = 'entertainment',
  BrandAwareness = 'brand_awareness',
  LeadGeneration = 'lead_generation',
  AffiliateSales = 'affiliate_sales',
  SaaSConversion = 'saas_conversion',
  ProductLaunch = 'product_launch',
  CommunityGrowth = 'community_growth',
}

export enum Platform {
  YouTube = 'youtube',
  TikTok = 'tiktok',
  Instagram = 'instagram',
  Facebook = 'facebook',
  LinkedIn = 'linkedin',
  X = 'x',
  Website = 'website',
  Whop = 'whop',
}

export enum CreativeStrategyType {
  Educational = 'educational',
  Storytelling = 'storytelling',
  Documentary = 'documentary',
  ProductReview = 'product_review',
  Comparison = 'comparison',
  Tutorial = 'tutorial',
  ViralShort = 'viral_short',
  Listicle = 'listicle',
  News = 'news',
  Explainer = 'explainer',
}

export enum ContentType {
  LongFormVideo = 'long_form_video',
  ShortFormVideo = 'short_form_video',
  Reel = 'reel',
  Post = 'post',
  Article = 'article',
  Podcast = 'podcast',
  LiveStream = 'live_stream',
  Course = 'course',
}

export enum VideoLength {
  Short15s = 'short_15s',
  Short30s = 'short_30s',
  Short60s = 'short_60s',
  Medium3m = 'medium_3m',
  Medium5m = 'medium_5m',
  Medium10m = 'medium_10m',
  Long15m = 'long_15m',
  Long20m = 'long_20m',
  Long30mPlus = 'long_30m_plus',
}

export const VIDEO_LENGTH_SECONDS: Record<VideoLength, number> = {
  [VideoLength.Short15s]: 15,
  [VideoLength.Short30s]: 30,
  [VideoLength.Short60s]: 60,
  [VideoLength.Medium3m]: 180,
  [VideoLength.Medium5m]: 300,
  [VideoLength.Medium10m]: 600,
  [VideoLength.Long15m]: 900,
  [VideoLength.Long20m]: 1200,
  [VideoLength.Long30mPlus]: 1800,
};

export enum HookStrategy {
  Question = 'question',
  Shock = 'shock',
  Story = 'story',
  DataPoint = 'data_point',
  Demonstration = 'demonstration',
  Challenge = 'challenge',
  Controversy = 'controversy',
}

export enum StoryStructure {
  ThreeAct = 'three_act',
  ProblemSolution = 'problem_solution',
  BeforeAfter = 'before_after',
  StepByStep = 'step_by_step',
  HeroJourney = 'hero_journey',
  FAB = 'fab',
}

export enum CTAStrategy {
  Subscribe = 'subscribe',
  LeadMagnet = 'lead_magnet',
  SoftSell = 'soft_sell',
  DirectSell = 'direct_sell',
  SignUp = 'sign_up',
  Community = 'community',
}

export enum ThumbnailStyle {
  HighContrast = 'high_contrast',
  MinimalText = 'minimal_text',
  FaceClose = 'face_close',
  SplitScreen = 'split_screen',
  BeforeAfter = 'before_after',
  Reaction = 'reaction',
}

export enum VoiceStyle {
  Professional = 'professional',
  Conversational = 'conversational',
  Energetic = 'energetic',
  Calm = 'calm',
  Storyteller = 'storyteller',
  Narrator = 'narrator',
}

export enum MusicMood {
  Upbeat = 'upbeat',
  Dramatic = 'dramatic',
  Inspirational = 'inspirational',
  Calm = 'calm',
  Suspenseful = 'suspenseful',
  Playful = 'playful',
}

export enum VisualStyle {
  Modern = 'modern',
  Cinematic = 'cinematic',
  Minimalist = 'minimalist',
  Bold = 'bold',
  Documentary = 'documentary',
  Animated = 'animated',
}

export enum CreativePlanStatus {
  Draft = 'draft',
  Approved = 'approved',
  Rejected = 'rejected',
  InProduction = 'in_production',
}
