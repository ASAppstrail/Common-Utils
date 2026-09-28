const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';
const MAX_DEPTH = 12;

// Matches "SalesforceNetReactBridge.sendRequest failed: " (any Class.method) and
// "SomethingBridge failed: ". Deliberately NOT any bare word, so "Upload failed: ..." is kept intact.
const BRIDGE_PREFIX = /^\s*(?:[\w$]+\.[\w$.]+|[\w$]*Bridge)\s+failed:\s*/i;
// SOQL errors echo the query + caret first; the real message comes after this line.
const SOQL_ERROR_TAIL = /ERROR at Row:\d+:Column:\d+:?\s*([\s\S]*)$/;
const WSDL_HINT =
  /\s*Please reference your WSDL or the describe call for the appropriate names\.?\s*$/i;

const safeParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

// The bridge often double-encodes JSON, so unwrap until it stops being a JSON string.
const unwrapJson = (value: string): unknown => {
  let current: unknown = value.replace(BRIDGE_PREFIX, '').trim();
  for (let i = 0; i < 3 && typeof current === 'string'; i++) {
    const parsed = safeParse(current);
    if (typeof parsed !== 'string' && (typeof parsed !== 'object' || parsed === null)) break;
    current = parsed;
  }
  return current;
};

const extractMessages = (node: unknown, depth = 0): string[] => {
  if (node == null || depth > MAX_DEPTH) return [];

  if (node instanceof Error) return extractMessages(node.message, depth + 1);

  if (typeof node === 'string') {
    const parsed = unwrapJson(node);
    if (typeof parsed !== 'string') return extractMessages(parsed, depth + 1);
    // Ignore HTML error pages (e.g. gateway / 5xx responses).
    return parsed && !/^\s*</.test(parsed) ? [parsed] : [];
  }

  if (Array.isArray(node)) {
    return node.flatMap((item) => extractMessages(item, depth + 1));
  }

  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    const nested = [
      obj.response,
      obj.body,
      obj.result,
      obj.results,
      obj.compositeResponse,
      obj.graphs,
      obj.graphResponse,
      obj.errors,
    ].flatMap((child) =>
      extractMessages(child, depth + 1),
    );
    if (nested.length > 0) return nested;
    return extractMessages(
      obj.error_description ?? obj.message ?? obj.Message ?? obj.error,
      depth + 1,
    );
  }

  return [];
};

const cleanMessage = (message: string): string => {
  const tail = SOQL_ERROR_TAIL.exec(message.trim());
  return (tail ? tail[1] : message).replace(WSDL_HINT, '').trim();
};

export const parseSalesforceError = (error: unknown): string => {
  const messages = Array.from(new Set(extractMessages(error).map(cleanMessage).filter(Boolean)));
  return messages.length > 0 ? messages.join('; ') : DEFAULT_ERROR_MESSAGE;
};