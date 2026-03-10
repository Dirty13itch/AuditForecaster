import type { NodeSDK } from '@opentelemetry/sdk-node';

export async function register() {
    // Only run on server-side
    if (typeof window !== 'undefined') return;
    
    // Only enable OpenTelemetry in production when endpoint is configured
    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

    if (process.env.NEXT_RUNTIME === 'nodejs' && otlpEndpoint) {
        // Dynamic import to avoid bundling in client
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
        const { resourceFromAttributes } = await import('@opentelemetry/resources');
        
        const sdk = new NodeSDK({
            resource: resourceFromAttributes({
                'service.name': process.env.OTEL_SERVICE_NAME || 'auditforecaster',
                'service.version': process.env.npm_package_version || '0.1.0',
                'deployment.environment': process.env.NODE_ENV || 'development',
            }),
            traceExporter: new OTLPTraceExporter({
                url: otlpEndpoint + '/v1/traces',
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });

        sdk.start();

        process.on('SIGTERM', () => {
            sdk.shutdown()
                .then(() => console.log('OpenTelemetry SDK shut down'))
                .catch((error) => console.error('Error shutting down OpenTelemetry', error))
                .finally(() => process.exit(0));
        });
    }
}
