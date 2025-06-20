export interface ComparisonResult {
  id: string;
  oldFileName: string;
  newFileName: string;
  overallResult: 'Pass' | 'Fail' | 'Error';
  executionTime: number;
  results: ResultDetail[];
  error?: string;
}

export interface ResultDetail {
  key: string;
  old: string;
  new: string;
  result: 'Pass' | 'Fail';
  group: string;
  y?: number;
  type?: 'different' | 'same' | 'custom';
} 