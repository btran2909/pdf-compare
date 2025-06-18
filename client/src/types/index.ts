export interface ComparisonResult {
  id: string;
  oldFileName: string;
  newFileName: string;
  overallResult: 'Pass' | 'Fail' | 'Error';
  executionTime: number;
  results: {
    [key: string]: {
      old: string | null;
      new: string | null;
      result: 'Pass' | 'Fail';
      y?: number;  // Optional Y coordinate for line positioning
    };
  };
  error?: string;
} 