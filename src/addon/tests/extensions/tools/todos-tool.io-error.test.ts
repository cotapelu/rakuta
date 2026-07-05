import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { TodoState } from '../../../extensions/tools/todos-tool';

describe('todos-tool file I/O error handling (TodoState)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp('todos-io-');
  });

  afterEach(async () => {
    try { await rm(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('loadFromFile returns false when file missing', async () => {
    const state = new TodoState();
    const result = await state.loadFromFile(tmpDir);
    expect(result).toBe(false);
    expect(state.phases).toHaveLength(0);
  });

  it('loadFromFile returns false on corrupted JSON', async () => {
    const filePath = join(tmpDir, '.piclaw', 'agent', 'todos.json');
    await fs.mkdir(join(tmpDir, '.piclaw', 'agent'), { recursive: true });
    await fs.writeFile(filePath, 'not json{', 'utf-8');
    const state = new TodoState();
    const result = await state.loadFromFile(tmpDir);
    expect(result).toBe(false);
    expect(state.phases).toHaveLength(0);
  });

  it('loadFromFile returns false on version mismatch', async () => {
    const filePath = join(tmpDir, '.piclaw', 'agent', 'todos.json');
    await fs.mkdir(join(tmpDir, '.piclaw', 'agent'), { recursive: true });
    const wrongVersion = {
      version: 2,
      phases: [],
      nextTaskId: 1,
      nextPhaseId: 1,
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(filePath, JSON.stringify(wrongVersion), 'utf-8');
    const state = new TodoState();
    const result = await state.loadFromFile(tmpDir);
    expect(result).toBe(false);
    expect(state.phases).toHaveLength(0);
  });
});
