export async function register() {
    // ---- Environment variable validation ----
    // Runs once at server startup. In production, missing required vars will
    // throw and prevent the server from accepting traffic with a broken config.
    const { validateEnv } = await import('@/lib/env')
    validateEnv()

    // ---- OpenTelemetry ----
    // OpenTelemetry is only used in production with a configured OTLP endpoint.
    // The @opentelemetry/sdk-node and @opentelemetry/auto-instrumentations-node
    // packages have deep Node.js native module dependencies (stream, fs, net, etc.)
    // that are incompatible with webpack bundling. In production, these are loaded
    // via serverExternalPackages in next.config.ts.
    //
    // To enable: set OTEL_EXPORTER_OTLP_ENDPOINT env var and ensure
    // serverExternalPackages includes all @opentelemetry/* packages.
    if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
        return;
    }

    // Use eval to prevent webpack from following the import
    const importModule = new Function('specifier', 'return import(specifier)');

    try {
        const { NodeSDK } = await importModule('@opentelemetry/sdk-node');
        const { getNodeAutoInstrumentations } = await importModule('@opentelemetry/auto-instrumentations-node');
        const { OTLPTraceExporter } = await importModule('@opentelemetry/exporter-trace-otlp-http');
        const { Resource } = await importModule('@opentelemetry/resources');

        const sdk = new NodeSDK({
            resource: new Resource({
                'service.name': process.env.OTEL_SERVICE_NAME || 'auditforecaster',
                'service.version': process.env.npm_package_version || '0.1.0',
                'deployment.environment': process.env.NODE_ENV || 'development',
            }),
            traceExporter: new OTLPTraceExporter({
                url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
            }),
            instrumentations: [
                getNodeAutoInstrumentations({
                    '@opentelemetry/instrumentation-fs': { enabled: false },
                }),
            ],
        });

        sdk.start();

        if (typeof process.on === 'function') {
            process.on('SIGTERM', () => {
                sdk.shutdown()
                    .then(() => console.log('OpenTelemetry SDK shut down'))
                    .catch((error: unknown) => console.error('Error shutting down OpenTelemetry', error))
                    .finally(() => process.exit(0));
            });
        }
    } catch (error) {
        console.warn('Failed to initialize OpenTelemetry:', error);
    }
}
