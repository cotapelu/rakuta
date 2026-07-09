import { createLogger } from "../utils/logger.js";
import { TaskQueueItem, Violation, ImprovementType, CoverageMetrics } from "./types.js";
import * as path from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { QualityGate } from "./quality-gate.js";
import { SystemAudit } from "./system-audit.js";

const logger = createLogger('TaskDiscovery');

export class TaskDiscovery {
  private cwd: string;
  private qualityGate: QualityGate;

  constructor(cwd: string, qualityGate: QualityGate) {
    this.cwd = cwd;
    this.qualityGate = qualityGate;
  }

  async discoverTasks(): Promise<TaskQueueItem[]> {
    logger.log('Starting task discovery...');
    const tasks: TaskQueueItem[] = [];

    // Run quality gate
    const gateResult = await this.qualityGate.runGate();

    if (gateResult.violations.length > 0) {
      logger.log(`Found ${gateResult.violations.length} violations`);
      tasks.push(...this.tasksFromViolations(gateResult.violations));
    } else {
      logger.log('No violations - proactive analysis');
      tasks.push(...(await this.proactiveAnalysis(gateResult.coverage)));
    }

    // Sort by priority (lower number = higher priority)
    return tasks.sort((a, b) => a.priority - b.priority);
  }

  private tasksFromViolations(violations: Violation[]): TaskQueueItem[] {
    return violations.map((v, idx) => {
      const id = `violation-${Date.now()}-${idx}`;
      const priority = this.violationToPriority(v);
      const [action, estimatedMinutes, risk] = this.suggestFixAction(v);

      return {
        id,
        type: 'VIOLATION_FIX',
        priority,
        violation: v,
        module: v.file,
        action,
        expectedImpact: `Fix ${v.type} issue: ${v.message}`,
        estimatedMinutes,
        risk: 'Low', // default for violation fixes
        createdAt: new Date(),
        attempts: 0,
      };
    });
  }

  private violationToPriority(v: Violation): number {
    switch (v.severity) {
      case 'CRITICAL': return 1;
      case 'HIGH': return 2;
      case 'MEDIUM': return 3;
      case 'LOW': return 4;
      default: return 4;
    }
  }

  private suggestFixAction(v: Violation): [string, number, 'Low' | 'Medium' | 'High'] {
    if (v.ruleId) {
      switch (v.ruleId) {
        case 'no-explicit-any':
          return ['Replace \'any\' with specific type or \'unknown\'', 30, 'Low'];
        case 'max-lines-per-function':
          return ['Refactor function to reduce complexity and lines', 60, 'Medium'];
        case 'complexity':
          return ['Extract nested conditionals into guard clauses and helper functions', 90, 'Medium'];
        case 'no-unused-vars':
          return ['Remove or use the unused variable', 15, 'Low'];
      }
    }

    switch (v.type) {
      case 'SECURITY':
        return [`Fix security issue: ${v.message}`, 120, 'High'];
      case 'PERFORMANCE':
        return [`Optimize performance: ${v.message}`, 90, 'Medium'];
      case 'QUALITY':
        return [`Improve code quality: ${v.message}`, 45, 'Low'];
      default:
        return [`Fix issue in ${v.file}`, 30, 'Low'];
    }
  }

  private async proactiveAnalysis(coverage: CoverageMetrics): Promise<TaskQueueItem[]> {
    const tasks: TaskQueueItem[] = [];
    const now = Date.now();

    // Coverage improvement (high priority if below 85%)
    if (coverage.branches < 85) {
      tasks.push({
        id: `proactive-coverage-branch-${now}`,
        type: 'PROACTIVE_IMPROVEMENT',
        priority: 2,
        improvementType: 'TESTS' as ImprovementType,
        module: 'codebase',
        action: 'Increase branch coverage to >85% (currently ' + coverage.branches + '%)',
        expectedImpact: 'Better test coverage, fewer bugs',
        estimatedMinutes: 120,
        risk: 'Medium',
        createdAt: new Date(),
        attempts: 0,
      });
    }

    if (coverage.statements < 85) {
      tasks.push({
        id: `proactive-coverage-statements-${now}`,
        type: 'PROACTIVE_IMPROVEMENT',
        priority: 3,
        improvementType: 'TESTS' as ImprovementType,
        module: 'codebase',
        action: 'Increase statement coverage to >85% (currently ' + coverage.statements + '%)',
        expectedImpact: 'Improved code coverage',
        estimatedMinutes: 90,
        risk: 'Medium',
        createdAt: new Date(),
        attempts: 0,
      });
    }

    // Security checks (always add)
    tasks.push({
      id: `proactive-security-secrets-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 1,
      improvementType: 'SECURITY' as ImprovementType,
      module: 'codebase',
      action: 'Scan for hardcoded secrets and remove',
      expectedImpact: 'No secrets in source code',
      estimatedMinutes: 60,
      risk: 'High',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-security-tls-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 3,
      improvementType: 'SECURITY' as ImprovementType,
      module: 'network',
      action: 'Verify TLS 1.2+ on all external HTTP calls',
      expectedImpact: 'Secure network communication',
      estimatedMinutes: 30,
      risk: 'Medium',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-security-jwt-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 3,
      improvementType: 'SECURITY' as ImprovementType,
      module: 'auth',
      action: 'Enforce RS256 for JWT signing (no HS256)',
      expectedImpact: 'Stronger token integrity',
      estimatedMinutes: 45,
      risk: 'High',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-complexity-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 3,
      improvementType: 'REFACTOR' as ImprovementType,
      module: 'codebase',
      action: 'Refactor high-complexity functions (cyclomatic ≥8)',
      expectedImpact: 'Improved maintainability and reduced bugs',
      estimatedMinutes: 180,
      risk: 'Medium',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-docs-jsdoc-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 4,
      improvementType: 'DOCUMENTATION' as ImprovementType,
      module: 'public APIs',
      action: 'Add missing JSDoc for exported functions and classes',
      expectedImpact: 'Better IDE support and understanding',
      estimatedMinutes: 90,
      risk: 'Low',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-obs-logs-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 4,
      improvementType: 'OBSERVABILITY' as ImprovementType,
      module: 'logging',
      action: 'Add structured JSON logging with correlation IDs',
      expectedImpact: 'Machine-parseable logs for debugging',
      estimatedMinutes: 90,
      risk: 'Low',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-obs-metrics-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 4,
      improvementType: 'OBSERVABILITY' as ImprovementType,
      module: 'metrics',
      action: 'Add Prometheus metrics endpoints',
      expectedImpact: 'Monitor request rates, errors, latencies',
      estimatedMinutes: 120,
      risk: 'Low',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-obs-health-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 4,
      improvementType: 'OBSERVABILITY' as ImprovementType,
      module: 'health checks',
      action: 'Implement /health/live and /health/ready endpoints',
      expectedImpact: 'Orchestration readiness (K8s/docker)',
      estimatedMinutes: 60,
      risk: 'Low',
      createdAt: new Date(),
      attempts: 0,
    });

    tasks.push({
      id: `proactive-deps-update-${now}`,
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 3,
      improvementType: 'UPGRADE' as ImprovementType,
      module: 'dependencies',
      action: 'Update outdated packages to latest stable',
      expectedImpact: 'Security patches and new features',
      estimatedMinutes: 60,
      risk: 'Medium',
      createdAt: new Date(),
      attempts: 0,
    });

    // System health audit (critical & high findings) — GOAL.md Section 11
    try {
      const auditor = new SystemAudit(this.cwd);
      const report = await auditor.runFullAudit();
      for (const finding of report.findings) {
        if (finding.severity === 'CRITICAL' || finding.severity === 'HIGH') {
          const priority = finding.severity === 'CRITICAL' ? 1 : 2;
          const moduleName = finding.location !== 'codebase'
            ? finding.location.split(/[\\/]/).pop()?.replace(/\.[^.]*$/, '') || 'codebase'
            : 'codebase';
          tasks.push({
            id: `audit-${finding.dimension.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            type: 'PROACTIVE_IMPROVEMENT' as ImprovementType,
            priority,
            improvementType: this.mapDimensionToType(finding.dimension),
            module: moduleName,
            action: `[AUDIT] ${finding.fix}`,
            expectedImpact: `Fix ${finding.dimension} issue: ${finding.rootCause}`,
            estimatedMinutes: this.estimateMinutes(finding.severity, finding.dimension),
            risk: this.mapSeverityToRisk(finding.severity),
            createdAt: new Date(),
            attempts: 0,
          });
        }
      }
    } catch (error) {
      logger.warn('System audit health check failed during proactive analysis', { error });
    }

    return tasks;
  }

  // Helper to map audit dimension to ImprovementType
  private mapDimensionToType(dimension: string): ImprovementType {
    switch (dimension) {
      case 'Security (STRIDE)':
      case 'Security':
        return 'SECURITY';
      case 'Scalability':
      case 'Performance':
        return 'PERFORMANCE';
      case 'Observability & Monitoring':
        return 'OBSERVABILITY';
      case 'Caching & Consistency':
      case 'Database & Data Integrity':
        return 'REFACTOR'; // often requires architectural changes
      case 'Business Logic Integrity':
      case 'End-to-End Flow':
      case 'Concurrency & Race Condition':
      case 'Idempotency':
      case 'Failure Scenarios':
        return 'REFACTOR';
      default:
        return 'REFACTOR';
    }
  }

  private mapSeverityToRisk(severity: string): 'Low' | 'Medium' | 'High' {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
      default:
        return 'Low';
    }
  }

  private estimateMinutes(severity: string, dimension: string): number {
    const base = severity === 'CRITICAL' ? 120 : severity === 'HIGH' ? 90 : 60;
    // Certain dimensions tend to be larger effort
    if (dimension.includes('Scalability') || dimension.includes('Database') || dimension.includes('Concurrency')) {
      return base * 2; // more complex
    }
    return base;
  }
}

export default TaskDiscovery;
