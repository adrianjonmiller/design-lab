/** A mistake in the command line or lab.config.js, which the user fixes: reported without a stack. */
export class UsageError extends Error {}

/** What to print for an error: just the message for a UsageError, the stack for anything else. */
export const formatError = (err) => (err instanceof UsageError ? err.message : (err?.stack ?? String(err)))
