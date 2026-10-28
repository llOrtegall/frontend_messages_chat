import type { z } from "zod";

// The backend may add fields before this app knows them; a pass per nesting level is plenty.
const MAX_PASSES = 4;

type Issue = z.core.$ZodIssue;

const isUnknownKeys = (issue: Issue): issue is z.core.$ZodIssueUnrecognizedKeys => issue.code === "unrecognized_keys";

const withoutUnknownKeys = (data: unknown, issues: readonly z.core.$ZodIssueUnrecognizedKeys[]): unknown => {
  const copy = structuredClone(data);
  for (const issue of issues) {
    const owner = issue.path.reduce<unknown>((node, key) => (node as Record<PropertyKey, unknown>)?.[key], copy);
    for (const key of issue.keys) delete (owner as Record<string, unknown>)[key];
  }
  return copy;
};

/**
 * Validates backend data against its contract while ignoring fields this build doesn't know yet.
 * The contracts are strict so the backend can't leak fields; a reader only needs the ones it uses,
 * so a field added by a newer backend must not break an older frontend. Anything else still fails.
 */
export const readContract = <S extends z.ZodType>(schema: S, data: unknown): z.ZodSafeParseResult<z.infer<S>> => {
  let input = data;
  let result = schema.safeParse(input);
  for (let pass = 0; !result.success && pass < MAX_PASSES && result.error.issues.every(isUnknownKeys); pass++) {
    input = withoutUnknownKeys(input, result.error.issues.filter(isUnknownKeys));
    result = schema.safeParse(input);
  }
  return result;
};
