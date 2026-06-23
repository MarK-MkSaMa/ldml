const DEFAULT_ALLOWED_PROTOCOLS = ["https:", "http:"] as const;

export function normalizeSafeExternalUrl(
  value: string | null | undefined,
  options: {
    allowedProtocols?: readonly string[];
    allowedHosts?: readonly string[];
    fieldName?: string;
  } = {},
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const fieldName = options.fieldName ?? "链接";
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName}格式不正确`);
  }

  const allowedProtocols = options.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS;
  if (!allowedProtocols.includes(url.protocol)) {
    throw new Error(`${fieldName}仅支持 http 或 https 链接`);
  }

  if (options.allowedHosts && options.allowedHosts.length > 0) {
    const hostname = url.hostname.toLowerCase();
    const allowed = options.allowedHosts.some((host) => {
      const normalized = host.toLowerCase();
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    });
    if (!allowed) {
      throw new Error(`${fieldName}必须来自允许的网站`);
    }
  }

  return url.toString();
}

export function isSafeExternalUrl(
  value: string | null | undefined,
  options?: Parameters<typeof normalizeSafeExternalUrl>[1],
): value is string {
  try {
    return normalizeSafeExternalUrl(value, options) !== null;
  } catch {
    return false;
  }
}

export function normalizeLinuxDoUrl(value: string | null | undefined): string | null {
  return normalizeSafeExternalUrl(value, {
    allowedProtocols: ["https:"],
    allowedHosts: ["linux.do"],
    fieldName: "Linux DO 链接",
  });
}
