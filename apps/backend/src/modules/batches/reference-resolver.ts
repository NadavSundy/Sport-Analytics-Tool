/**
 * Compatibility export for existing backend callers/tests. The resolver lives
 * in a server-side shared package so the API and asynchronous worker execute
 * exactly the same reference-resolution rules.
 */
export * from '@sport-analytics/batch-processing';
