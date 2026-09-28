import NetInfo from '@react-native-community/netinfo';


export type NetworkStrength = 'none' | 'weak' | 'good';
export interface NetworkStatus {
  online: boolean;
  strength: NetworkStrength;
  latencyMs: number | null;
}

const TIMEOUT_MS = 5000;
const WEAK_LATENCY_MS = 1500;
const OFFLINE: NetworkStatus = { online: false, strength: 'none', latencyMs: null };

type UrlSource = string | (() => string | undefined | Promise<string | undefined>);
let probeUrl: UrlSource | undefined;
let inflight: Promise<NetworkStatus> | null = null;

export const setProbeUrl = (url: UrlSource): void => {
  probeUrl = url;
};

const run = async (): Promise<NetworkStatus> => {
  try {
    const info = await NetInfo.fetch();
    if (info.isConnected === false || info.type === 'none') return OFFLINE;
    const slowCellular =
      info.type === 'cellular' && ['2g', '3g'].includes(info.details?.cellularGeneration ?? '');

    let url: string | undefined;
    try {
      url = typeof probeUrl === 'function' ? await probeUrl() : probeUrl;
    } catch {
      url = undefined; // e.g. not logged in yet
    }
    if (!url) {
      // No backend URL yet: trust NetInfo's own reachability flag.
      if (info.isInternetReachable === false) return OFFLINE;
      return { online: true, strength: slowCellular ? 'weak' : 'good', latencyMs: null };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const started = Date.now();
    try {
      const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}_=${started}`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      void res.text().catch(() => undefined); // release the connection
      const isJson = (res.headers.get('content-type') ?? '').toLowerCase().includes('json');
      if (res.status >= 500 || !isJson) return OFFLINE;
      return {
        online: true,
        strength: slowCellular || latencyMs > WEAK_LATENCY_MS ? 'weak' : 'good',
        latencyMs,
      };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return OFFLINE; // timeout, DNS failure, no route, native module error
  }
};

export const checkNetwork = (): Promise<NetworkStatus> => {
  inflight ??= run().finally(() => {
    inflight = null;
  });
  return inflight;
};