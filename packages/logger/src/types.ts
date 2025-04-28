export interface LogRecord {
	trace_id?: string;
	span_id?: string;
	trace_flags?: string;
	requestId?: string;
	[key: string]: unknown;
}
