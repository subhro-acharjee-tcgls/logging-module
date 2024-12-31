import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';  // OTLP exporter (supports gRPC)
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';  // OTLP for logs via gRPC

// Set up logging for OpenTelemetry
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Function to check if tracing is enabled for a specific service
function isTracingEnabled(service: string): boolean {
  return process.env[`TRACING_${service.toUpperCase()}_ENABLED`] === 'true';
}
console.log(process.env['SERVICE_NAME']);
// Confirm the gRPC URL is correct
const grpcUrl = process.env['GRPC_URL'] || 'grpc://jaeger:14250'; 
const httpUrl = process.env['HTTP_URL'] || 'http://jaeger:14268/api/traces';

console.log('Trace exporter URL:', grpcUrl);
const useGrpc = process.env['USE_GRPC'] === 'true';
// OTLP trace exporter using gRPC (Jaeger gRPC endpoint)
const traceExporter = new OTLPTraceExporter({
url: useGrpc ? grpcUrl : httpUrl, 
  headers: {},  // Optional headers, if required (e.g., authorization)
  // gRPC configurations can also be added here (e.g., credentials or insecure mode)
});

// Function to dynamically enable or disable instrumentation based on environment variables
const instrumentations = getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-fs': { enabled: isTracingEnabled('fs') },
  '@opentelemetry/instrumentation-winston': { enabled: isTracingEnabled('winston') },
  '@opentelemetry/instrumentation-dns': { enabled: isTracingEnabled('dns') },
  '@opentelemetry/instrumentation-express': { enabled: isTracingEnabled('express') },
});

// OTLP log exporter (using gRPC for logs)
const logExporter = new OTLPLogExporter({
    url: useGrpc ? grpcUrl : httpUrl,  
});

const sdk = new NodeSDK({
  traceExporter,
  logRecordProcessors: [new SimpleLogRecordProcessor(logExporter)],  // Log exporter for logs (optional)
  instrumentations,
  serviceName:'feature-flag'

//   serviceName: `${process.env['SERVICE_NAME']}-${process.env['ENV']}`,
});

// Start the OpenTelemetry SDK
sdk.start();
console.log('OpenTelemetry with OTLP (gRPC to Jaeger) is running!');
