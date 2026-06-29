export interface ABTestVariant {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
}

export interface ABTestResult {
  testId: string;
  winner: string | null;
  variants: ABTestVariant[];
  conversionRates: Record<string, number>;
  confidenceInterval: number;
  sampleSize: number;
}

export interface IABTestingService {
  getTestResults(testId: string): Promise<ABTestResult | null>;
  createTest(name: string, variants: ABTestVariant[]): Promise<string>;
  recordConversion(testId: string, variantId: string): Promise<void>;
}
