// Instrumentation for OpenTelemetry (optional)
// Only initialized when OTEL_EXPORTER_OTLP_ENDPOINT is set

export async function register() {
    // Only enable OpenTelemetry in production server runtime when endpoint is configured
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }

    const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!otlpEndpoint) {
        return;
    }

    // Dynamic import to avoid bundling issues
    try {
        const { NodeSDK } = await import('@opentelemetry/sdk-node');
        const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http');
        const { Resource } = await import('@opentelemetry/resources');

        const sdk = new NodeSDK({
            resource: new Resource({
                'service.name': process.env.OTEL_SERVICE_NAME || 'auditforecaster',
                'service.version': process.env.npm_package_version || '0.1.0',
                'deployment.environment': process.env.NODE_ENV || 'development',
            }),
            traceExporter: new OTLPTraceExporter({
                url: `${otlpEndpoint}/v1/traces`,
            }),
        });

        sdk.start();

        process.on('SIGTERM', () => {
            sdk.shutdown()
                .then(() => console.log('OpenTelemetry SDK shut down'))
                .catch((error) => console.error('Error shutting down OpenTelemetry', error))
                .finally(() => process.exit(0));
        });
    } catch (error) {
        console.warn('Failed to initialize OpenTelemetry:', error);
    }
}
