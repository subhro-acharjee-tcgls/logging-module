import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto"; // OTLP exporter (supports gRPC)
import {
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"; // OTLP for logs via gRPC
import { trace } from "@opentelemetry/api";
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston";

export async function bootstrapTracing() {
  const grpcUrl =
    process.env["OTEL_BASE_TRACE_URL"] || "grpc://host.docker.internal:4317";
  const serviceName = process.env["SERVICE_NAME"] || " ";

  // OTLP trace exporter using gRPC (Jaeger gRPC endpoint)
  const traceExporter = new OTLPTraceExporter({ url: grpcUrl });

  // Function to dynamically enable or disable instrumentation based on environment variables
  const instrumentations = getNodeAutoInstrumentations({
    "@opentelemetry/instrumentation-fs": { enabled: false },
    "@opentelemetry/instrumentation-winston": { enabled: true },
    "@opentelemetry/instrumentation-dns": { enabled: false },
    "@opentelemetry/instrumentation-express": { enabled: true },
  });

  // OTLP log exporter (using gRPC for logs)
  const logExporter = new OTLPLogExporter({
    url: grpcUrl,
  });

  const consoleLogExporter = new ConsoleLogRecordExporter();

  // Create the SDK (without starting it)
  const sdk = new NodeSDK({
    traceExporter,
    logRecordProcessors: [
      new SimpleLogRecordProcessor(logExporter),
      new SimpleLogRecordProcessor(consoleLogExporter),
    ], // Log exporter for logs (optional)
    instrumentations: [...instrumentations, new WinstonInstrumentation()],
    serviceName: `${process.env["SERVICE_NAME"]}-${process.env["ENV"]}`,
  });

  const tracer = trace.getTracer(serviceName);
  // diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
  return { sdk, tracer };
}
