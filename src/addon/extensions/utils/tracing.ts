/**
 * Lightweight distributed tracing using OpenTelemetry API.
 *
 * Tracing is enabled when PI_TRACE=1. By default a no-op tracer is used,
 * so production overhead is negligible.
 */

import { trace, context, SpanStatusCode, type Span, type Tracer } from "@opentelemetry/api";

let tracer: Tracer = trace.getTracer("piclaw", "1.0.0");

export function getTracer(): Tracer {
  return tracer;
}

export function withSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean>,
  fn: (span: Span) => Promise<T> | T,
): Promise<T> | T {
  const t = getTracer();
  const span = t.startSpan(name, { attributes });
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err: unknown) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
      if (err instanceof Error) span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}

export { SpanStatusCode };