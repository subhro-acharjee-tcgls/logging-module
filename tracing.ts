import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';  // OTLP exporter (supports gRPC)
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';  // OTLP for logs via gRPC
import { trace } from '@opentelemetry/api';

export async function bootstrapTracing() {
  console.log("inside bootstrap tracing");

  const grpcUrl = process.env['OTEL_BASE_URL']|| 'grpc://host.docker.internal:4317';

  console.log('Trace exporter URL:', grpcUrl);


  // OTLP trace exporter using gRPC (Jaeger gRPC endpoint)
  const traceExporter =  new OTLPTraceExporter({ url: grpcUrl });

  console.log("grpc url=======", grpcUrl);

  // Function to dynamically enable or disable instrumentation based on environment variables
  const instrumentations = getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-fs': { enabled: false },
    '@opentelemetry/instrumentation-winston': { enabled: true },
    '@opentelemetry/instrumentation-dns': { enabled: false },
    '@opentelemetry/instrumentation-express': { enabled: true },
  });

  // OTLP log exporter (using gRPC for logs)
  const logExporter = new OTLPLogExporter({
    url: grpcUrl  
  });

  // Create the SDK (without starting it)
  const sdk = new NodeSDK({
    traceExporter,
    logRecordProcessors: [new SimpleLogRecordProcessor(logExporter)],  // Log exporter for logs (optional)
    instrumentations,
    serviceName: `${process.env['SERVICE_NAME']}-${process.env['ENV']}`,
  });

  console.log('OpenTelemetry with OTLP (gRPC to Jaeger) is set up!');

  const tracer = trace.getTracer('bootstrap-tracing'); 
  return { sdk, tracer };
}
