import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';

export function register() {
    // Only enable OpenTelemetry in production when endpoint is configured
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (process.env.NEXT_RUNTIME === 'nodejs' && otlpEndpoint) {
        const sdk = new NodeSDK({
            resource: new Resource({
                'service.name': process.env.OTEL_SERVICE_NAME || 'auditforecaster',
                'service.version': process.env.npm_package_version || '0.1.0',
                'deployment.environment': process.env.NODE_ENV || 'development',
            }),
            traceExporter: new OTLPTraceExporter({
                url: `${otlpEndpoint}/v1/traces`,
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    // Disable noisy instrumentations
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });

        sdk.start();

        // Graceful shutdown
        process.on('SIGTERM', () => {
            sdk.shutdown()
                .then(() => console.log('OpenTelemetry SDK shut down'))
                .catch((error) => console.error('Error shutting down OpenTelemetry', error))
                .finally(() => process.exit(0));
        });
    }
}
