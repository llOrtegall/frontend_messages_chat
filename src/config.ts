// The only place that reads the environment. Next inlines NEXT_PUBLIC_* at build time.
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
} as const;
