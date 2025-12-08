// Instrumentation stub - OpenTelemetry disabled to fix webpack bundling issues
// To re-enable, see: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
    // OpenTelemetry temporarily disabled due to webpack bundling issues with gRPC
    // The @opentelemetry packages try to bundle Node.js built-ins (net, zlib)
    // which aren't available in edge runtime

    // To enable OpenTelemetry later:
    // 1. Use @opentelemetry/exporter-trace-otlp-http (not gRPC)
    // 2. Ensure all imports are server-only
    // 3. Consider using next.config.js serverExternalPackages
}
