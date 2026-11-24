/**
 * Async Mutex - Simple reentrancy-safe lock for async operations
 *
 * Provides a clean way to serialize async operations and prevent race conditions.
 * Usage:
 *   const mutex = new Mutex();
 *   const release = await mutex.lock();
 *   try {
 *     // critical section
 *   } finally {
 *     release();
 *   }
 */

export class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];
  private lockTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Acquire the lock.
   * If available, returns release function immediately.
   * If locked, returns a promise that resolves when lock becomes available.
   * Includes a safety timeout to prevent permanent lock starvation.
   */
  async lock(timeoutMs: number = 30000): Promise<() => void> {
    if (!this.locked) {
      this.locked = true;
      this.armTimeout(timeoutMs);
      return () => this.unlock();
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.queue.indexOf(wrapped);
        if (idx >= 0) this.queue.splice(idx, 1);
        reject(new Error('Mutex lock timeout'));
      }, timeoutMs);
      const wrapped = () => {
        clearTimeout(timer);
        resolve(() => this.unlock());
      };
      this.queue.push(wrapped);
    });
  }

  private armTimeout(ms: number): void {
    if (this.lockTimeout) clearTimeout(this.lockTimeout);
    this.lockTimeout = setTimeout(() => {
      // Force unlock if holder never released
      if (this.locked) {
        this.locked = false;
        if (this.queue.length > 0) {
          const next = this.queue.shift()!;
          next();
        }
      }
    }, ms);
  }

  private unlock(): void {
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
      this.armTimeout(30000);
    } else {
      this.locked = false;
    }
  }
}

