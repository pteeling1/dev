const LOG_LEVEL = "debug"; // "debug", "info", "warn", "error", "silent"

function log(level, ...args) {
  const levels = ["debug", "info", "warn", "error"];
  if (levels.indexOf(level) >= levels.indexOf(LOG_LEVEL)) {
    console[level](...args);
  }
}

export const logger = {
  debug: (...args) => log("debug", ...args),
  info: (...args) => log("info", ...args),
  warn: (...args) => log("warn", ...args),
  error: (...args) => log("error", ...args),
};