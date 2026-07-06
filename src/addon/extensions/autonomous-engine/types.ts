export type ImprovementType =
  | 'VIOLATION_FIX'
  | 'PROACTIVE_IMPROVEMENT'
  | 'SECURITY'
  | 'PERFORMANCE'
  | 'REFACTOR'
  | 'DOCUMENTATION'
  | 'OBSERVABILITY'
  | 'UPGRADE'
  | 'TEST'
  | 'BUGFIX';

export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ViolationType = 'SECURITY' | 'PERFORMANCE' | 'QUALITY' | 'STYLE' | 'COMPLEXITY';

export interface Violation {
  type: ViolationType;
  severity: ViolationSeverity;
  file: string;
  line: number;
  column: number;
  message: string;
  ruleId: string;
}

export interface TaskQueueItem {
  id: string;
  type: ImprovementType;
  priority: number; // 1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW
  violation?: Violation;
  improvementType?: ImprovementType;
  module: string;
  action: string;
  expectedImpact: string;
  estimatedMinutes: number;
  createdAt: Date;
  attempts: number;
  risk: 'Low' | 'Medium' | 'High';
}

export interface CoverageMetrics {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  allAboveThreshold: boolean;
}

export interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  violations: Violation[];
  coverage: CoverageMetrics;
  buildStatus: 'success' | 'failure' | 'skipped';
  testResults: TestResults;
}

export interface MetricsLogEntry {
  cycle: number;
  task: string;
  type: string;
  priority: string;
  status: '✅ Success' | '❌ Failed' | '⚠️ Partial';
  coverageDelta?: {
    statements: number;
    branches: number;
  };
  qualityGateScore: number;
  timestamp: string;
}

export interface AutonomousEngineConfig {
  discoveryIntervalMs: number;
  maxTasksPerBatch: number;
  qualityGateThreshold: number;
  coverageThreshold: number;
  autoCommit: boolean;
  autoPush: boolean;
  emergencyEnabled: boolean;
  maxConsecutiveFailures: number;
  maxQueueSize: number;
  taskTimeoutMs: number;
}

export const DEFAULT_CONFIG: AutonomousEngineConfig = {
  discoveryIntervalMs: 2 * 60 * 60 * 1000, // 2 hours
  maxTasksPerBatch: 3,
  qualityGateThreshold: 90,
  coverageThreshold: 80,
  autoCommit: true,
  autoPush: false,
  emergencyEnabled: true,
  maxConsecutiveFailures: 5,
  maxQueueSize: 30,
  taskTimeoutMs: 60 * 60 * 1000, // 1 hour
};
