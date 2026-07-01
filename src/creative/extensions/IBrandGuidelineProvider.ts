export interface BrandGuidelines {
  primaryColors: string[];
  secondaryColors: string[];
  fontFamily: string;
  tone: string;
  forbiddenWords: string[];
  logoUsage: string;
}

export interface IBrandGuidelineProvider {
  getGuidelines(brandId: string): Promise<BrandGuidelines | null>;
  isAvailable(): boolean;
}
