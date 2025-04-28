import process from 'node:process';

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
	url: process.env?.OTEL_EXPORTER_OTLP_ENDPOINT_TRACES || 'http://localhost:4317/api/traces',
});

export const sdk = new NodeSDK({
	resource: resourceFromAttributes({
		[ATTR_SERVICE_NAME]: process.env?.OTEL_SERVICE_NAME || 'unknown-service',
	}),
	traceExporter,
	metricReader: new PeriodicExportingMetricReader({
		exporter: new OTLPMetricExporter({
			url: process.env?.OTEL_EXPORTER_OTLP_ENDPOINT_METRICS || 'http://localhost:4317/api/metrics',
		}),
	}),
	spanProcessors: [new BatchSpanProcessor(traceExporter)],
	instrumentations: [
		getNodeAutoInstrumentations({
			'@opentelemetry/instrumentation-http': {
				enabled: true,
			},
			'@opentelemetry/instrumentation-pino': { enabled: true },
			'@opentelemetry/instrumentation-pg': { enabled: true },
			'@opentelemetry/instrumentation-redis': { enabled: true },
		}),
	],
});

sdk.start();
