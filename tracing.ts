import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"; // OTLP exporter (supports gRPC)
import { SimpleLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"; // OTLP for logs via gRPC
import { trace } from "@opentelemetry/api";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";

export async function bootstrapTracing() {
  const tracingUrl =
    process.env["OTEL_BASE_TRACE_URL"] || "grpc://host.docker.internal:4317";
  const serviceName = process.env["SERVICE_NAME"] || " ";

  // OTLP trace exporter using gRPC (Jaeger gRPC endpoint)
  const traceExporter = new OTLPTraceExporter({ url: tracingUrl });

  // Function to dynamically enable or disable instrumentation based on environment variables
  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-winston": { enabled: true },
    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-express": { enabled: true },
  });

  // OTLP log exporter (using gRPC for logs)
  const logExporter = new OTLPLogExporter({
    url: tracingUrl,
  });

  // Create the SDK (without starting it)
  const sdk = new NodeSDK({
    traceExporter,
    instrumentations: [...instrumentations, new WinstonInstrumentation()],
    logRecordProcessors: [new SimpleLogRecordProcessor(logExporter)], // Log exporter for logs (optional)
    serviceName: `${process.env["SERVICE_NAME"]}-${process.env["ENV"]}`,
  });

  const tracer = trace.getTracer(serviceName);
  // diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
  return { sdk, tracer };
}
