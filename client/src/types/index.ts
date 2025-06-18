export interface ComparisonResult {
  oldFileName: string;
  newFileName: string;
  overallResult: 'Pass' | 'Fail' | 'Error';
  executionTime: number;
  results: {
    [key: string]: {
      old: string | null;
      new: string | null;
      result: 'Pass' | 'Fail';
    };
  };
  error?: string;
} 