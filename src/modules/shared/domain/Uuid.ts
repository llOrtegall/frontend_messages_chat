const FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every id the backend hands out is a UUID. */
export const isUuid = (value: string): boolean => FORMAT.test(value);
