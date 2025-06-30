import { logger } from './logger';

const measurements: Record<string, number> = {};

export function perfStart(label: string): void {
  measurements[label] = Date.now();
}

export function perfEnd(label: string): void {
  const start = measurements[label];
  if (start) {
    const duration = Date.now() - start;
    logger.debug(`[PERF] ${label} took ${duration}ms`);
    delete measurements[label];
  }
}