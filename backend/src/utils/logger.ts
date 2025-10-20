interface LogContext {
  error?: unknown;
  [key: string]: unknown;
}

/* Simple structured logger to avoid pulling an additional dependency */
function format(context: LogContext | undefined): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(context, (_key, value) => {
    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack,
      };
    }
    return value;
  })}`;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.LOG_LEVEL === "debug") {
      // eslint-disable-next-line no-console
      console.debug(`[DEBUG] ${message}${format(context)}`);
    }
  },
  info(message: string, context?: LogContext) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}${format(context)}`);
  },
  warn(message: string, context?: LogContext) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}${format(context)}`);
  },
  error(message: string, context?: LogContext) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}${format(context)}`);
  },
};
