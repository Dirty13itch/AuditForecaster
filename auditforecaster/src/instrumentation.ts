import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
// import { Resource } from '@opentelemetry/resources';
// import { SEMRESATTRS_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const sdk = new NodeSDK({
            // resource: new Resource({
            //     'service.name': 'auditforecaster',
            // }),
            traceExporter: new OTLPTraceExporter(),
            instrumentations: [getNodeAutoInstrumentations()],
        });

        sdk.start();
    }
}
