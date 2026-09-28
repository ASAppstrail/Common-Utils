import NetInfo from '@react-native-community/netinfo';
import { checkNetwork, setProbeUrl } from '../src/Networkutils';

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn() },
}));

const mockNetInfo = NetInfo.fetch as unknown as jest.Mock;
const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const PROBE_URL = 'https://example.my.salesforce.com/services/data/';

const netInfoState = (overrides: Record<string, unknown> = {}) => ({
  type: 'wifi',
  isConnected: true,
  isInternetReachable: true,
  details: {},
  ...overrides,
});

const response = (status: number, contentType: string) => ({
  status,
  headers: { get: () => contentType },
  text: () => Promise.resolve(''),
});

beforeEach(() => {
  jest.resetAllMocks();
  mockNetInfo.mockResolvedValue(netInfoState());
  mockFetch.mockResolvedValue(response(200, 'application/json'));
  setProbeUrl(PROBE_URL);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('checkNetwork', () => {
  it('returns offline without calling the backend when the device has no connection', async () => {
    mockNetInfo.mockResolvedValue(netInfoState({ type: 'none', isConnected: false }));

    const result = await checkNetwork();

    expect(result).toEqual({ online: false, strength: 'none', latencyMs: null });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns online + good when the backend answers quickly with JSON', async () => {
    const result = await checkNetwork();

    expect(result.online).toBe(true);
    expect(result.strength).toBe('good');
    expect(result.latencyMs).not.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns online + weak when the backend answers slowly', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(3000); // 2000 ms

    const result = await checkNetwork();

    expect(result.online).toBe(true);
    expect(result.strength).toBe('weak');
    expect(result.latencyMs).toBe(2000);
  });

  it('returns online + weak on a 3G cellular link', async () => {
    mockNetInfo.mockResolvedValue(
      netInfoState({ type: 'cellular', details: { cellularGeneration: '3g' } }),
    );

    const result = await checkNetwork();

    expect(result.online).toBe(true);
    expect(result.strength).toBe('weak');
  });

  it('returns offline when a captive portal answers with HTML', async () => {
    mockFetch.mockResolvedValue(response(200, 'text/html; charset=utf-8'));

    expect(await checkNetwork()).toEqual({ online: false, strength: 'none', latencyMs: null });
  });

  it('returns offline when the backend returns a 5xx', async () => {
    mockFetch.mockResolvedValue(response(503, 'application/json'));

    expect(await checkNetwork()).toEqual({ online: false, strength: 'none', latencyMs: null });
  });

  it('returns offline when the request fails (DNS / no route)', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));

    expect(await checkNetwork()).toEqual({ online: false, strength: 'none', latencyMs: null });
  });

  it('returns offline when the backend does not answer within the timeout', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    const promise = checkNetwork();
    for (let i = 0; i < 5; i++) await Promise.resolve(); // let the request start and the timer register
    await jest.advanceTimersByTimeAsync(5000);

    expect(await promise).toEqual({ online: false, strength: 'none', latencyMs: null });
  });

  it('falls back to the device reachability flag when no probe URL is set', async () => {
    setProbeUrl(undefined as any);

    expect((await checkNetwork()).online).toBe(true);
    expect(mockFetch).not.toHaveBeenCalled();

    mockNetInfo.mockResolvedValue(netInfoState({ isInternetReachable: false }));
    expect((await checkNetwork()).online).toBe(false);
  });

  it('never throws, even if NetInfo itself fails', async () => {
    mockNetInfo.mockRejectedValue(new Error('native module error'));

    await expect(checkNetwork()).resolves.toEqual({ online: false, strength: 'none', latencyMs: null });
  });

  it('shares one request between simultaneous callers', async () => {
    const [a, b] = await Promise.all([checkNetwork(), checkNetwork()]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });
});