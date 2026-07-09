type LogLevel = "info" | "warn" | "error" | "debug" | "success";

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[36m",    // cyan
  warn: "\x1b[33m",    // yellow
  error: "\x1b[31m",   // red
  debug: "\x1b[90m",   // gray
  success: "\x1b[32m", // green
};

const ICONS: Record<LogLevel, string> = {
  info: "ℹ",
  warn: "⚠",
  error: "✖",
  debug: "⊙",
  success: "✔",
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

function formatTimestamp(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function log(level: LogLevel, label: string, message: string, data?: unknown): void {
  const color = COLORS[level];
  const icon = ICONS[level];
  const time = formatTimestamp();

  console.log(`${BOLD}${color}${icon} [${time}] [${label}]${RESET} ${message}`);

  if (data !== undefined) {
    console.log(`  ${COLORS.debug}${JSON.stringify(data, null, 2)}${RESET}`);
  }
}

export const logger = {
  info: (label: string, message: string, data?: unknown) => log("info", label, message, data),
  warn: (label: string, message: string, data?: unknown) => log("warn", label, message, data),
  error: (label: string, message: string, data?: unknown) => log("error", label, message, data),
  debug: (label: string, message: string, data?: unknown) => log("debug", label, message, data),
  success: (label: string, message: string, data?: unknown) => log("success", label, message, data),
};
