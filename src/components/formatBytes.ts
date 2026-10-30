const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * KILOBYTE;

export const formatBytes = (bytes: number): string => {
  if (bytes < KILOBYTE) return `${bytes} B`;
  if (bytes < MEGABYTE) return `${(bytes / KILOBYTE).toFixed(0)} KB`;
  return `${(bytes / MEGABYTE).toFixed(1)} MB`;
};
