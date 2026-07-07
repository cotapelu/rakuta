import { describe, it, expect } from 'vitest';
import { buildTaskPrompt, mapPriority, defaultState } from '../../../extensions/autonomous-engine/extension';
import type { TaskQueueItem } from '../../../extensions/autonomous-engine/types';

describe('buildTaskPrompt', () => {
  it('formats a basic task with undefined estimatedMinutes', () => {
    const task: TaskQueueItem = {
      id: 't1',
      type: 'VIOLATION_FIX',
      priority: 2,
      module: 'src/foo.ts',
      action: 'Fix lint error',
      expectedImpact: 'Clean code',
      estimatedMinutes: undefined,
      risk: 'Low',
      createdAt: new Date(),
    };
    const prompt = buildTaskPrompt(task, defaultState.config);
    expect(prompt).toContain('ID: t1');
    expect(prompt).toContain(`Type: ${task.type}`);
    expect(prompt).toContain(`Priority: ${task.priority} (1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW)`);
    expect(prompt).toContain(`Module: ${task.module}`);
    expect(prompt).toContain(`Action: ${task.action}`);
    expect(prompt).toContain(`Expected Impact: ${task.expectedImpact}`);
    // Estimated Duration includes the raw value (undefined)
    expect(prompt).toContain('Estimated Duration: undefined minutes');
    // risk appears later? The template does not include risk in current code, so we don't test risk.
  });

  it('includes estimatedMinutes when provided', () => {
    const task: TaskQueueItem = {
      id: 't2',
      type: 'PROACTIVE_IMPROVEMENT',
      priority: 3,
      module: 'src/perf.ts',
      action: 'Optimize loop',
      expectedImpact: '2x faster',
      estimatedMinutes: 45,
      risk: 'Medium',
      createdAt: new Date(),
    };
    const prompt = buildTaskPrompt(task, defaultState.config);
    expect(prompt).toContain(`Type: ${task.type}`);
    expect(prompt).toContain('Estimated Duration: 45 minutes');
  });

  it('includes quality gate thresholds from config', () => {
    const config = { ...defaultState.config, qualityGateThreshold: 95, coverageThreshold: 85 };
    const task: TaskQueueItem = {
      id: 't3',
      type: 'VIOLATION_FIX',
      priority: 1,
      module: 'src/sec.ts',
      action: 'Patch',
      expectedImpact: 'Secure',
      estimatedMinutes: 60,
      risk: 'High',
      createdAt: new Date(),
    };
    const prompt = buildTaskPrompt(task, config);
    expect(prompt).toContain('Quality Gate score ≥95');
    expect(prompt).toContain('coverage ≥85%');
  });
});

describe('mapPriority', () => {
  it('maps 1 to CRITICAL', () => {
    expect(mapPriority(1)).toBe('CRITICAL');
  });
  it('maps 2 to HIGH', () => {
    expect(mapPriority(2)).toBe('HIGH');
  });
  it('maps 3 to MEDIUM', () => {
    expect(mapPriority(3)).toBe('MEDIUM');
  });
  it('maps 4+ to LOW', () => {
    expect(mapPriority(4)).toBe('LOW');
    expect(mapPriority(10)).toBe('LOW');
  });
});
