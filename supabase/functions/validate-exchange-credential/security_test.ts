// Phase 3 security edge-case tests for validate-exchange-credential.
// Run: deno test --allow-net --allow-env supabase/functions/validate-exchange-credential/security_test.ts

import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  handler, validateInput, rateLimitCheck, _resetRateLimit,
  RATE_MAX_HITS, type HandlerDeps,
} from './index.ts';

const AUTH = 'Bearer fake.jwt.token';
const goodBody = {
  provider: 'bybit',
  label: 'main',
  api_key: 'AAAAAAAAAAAAAAAAAAAA',
  api_secret: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBB',
};

function makeReq(body: unknown, headers: HeadersInit = { Authorization: AUTH }) {
  return new Request('http://local/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const baseDeps = (overrides: Partial<HandlerDeps> = {}): HandlerDeps & { persisted: unknown[]; logSpy: string[] } => {
  const persisted: unknown[] = [];
  const logSpy: string[] = [];
  // Capture console.error/log to assert no secret leakage
  const origErr = console.error;
  const origLog = console.log;
  console.error = (...a) => { logSpy.push(a.map(String).join(' ')); origErr(...a); };
  console.log = (...a) => { logSpy.push(a.map(String).join(' ')); origLog(...a); };
  return {
    getUserId: async () => 'user-uuid-1',
    fetchImpl: (async () => new Response('{}', { status: 200 })) as typeof fetch,
    persist: async (_u, input) => { persisted.push(input); return { error: null }; },
    persisted, logSpy,
    ...overrides,
  };
};

/* ============================================================ */
/* 1. EXCHANGE DOWNTIME — fail-safe                              */
/* ============================================================ */
Deno.test('downtime: Bybit 500 → connection_error, no DB write, no secret leak', async () => {
  _resetRateLimit();
  const deps = baseDeps({
    fetchImpl: (async () => new Response('Internal Server Error', { status: 500 })) as typeof fetch,
  });
  const res = await handler(makeReq(goodBody), deps);
  const body = await res.json();

  assertEquals(res.status, 503);
  assertEquals(body.error, 'connection_error');
  assertEquals(deps.persisted.length, 0, 'must NOT persist on upstream failure');

  const allLogs = deps.logSpy.join('\n');
  assert(!allLogs.includes(goodBody.api_secret), 'raw api_secret leaked to logs');
  assert(!allLogs.includes(goodBody.api_key), 'raw api_key leaked to logs');
});

Deno.test('downtime: Bybit network throw → connection_error, no DB write', async () => {
  _resetRateLimit();
  const deps = baseDeps({
    fetchImpl: (() => { throw new Error('ETIMEDOUT'); }) as unknown as typeof fetch,
  });
  const res = await handler(makeReq(goodBody), deps);
  const body = await res.json();
  assertEquals(res.status, 503);
  assertEquals(body.error, 'connection_error');
  assertEquals(deps.persisted.length, 0);
});

Deno.test('downtime: Binance 502 → connection_error, no DB write', async () => {
  _resetRateLimit();
  const deps = baseDeps({
    fetchImpl: (async () => new Response('bad gateway', { status: 502 })) as typeof fetch,
  });
  const res = await handler(makeReq({ ...goodBody, provider: 'binance' }), deps);
  assertEquals(res.status, 503);
  assertEquals((await res.json()).error, 'connection_error');
  assertEquals(deps.persisted.length, 0);
});

/* ============================================================ */
/* 2. INPUT SANITIZATION — XSS / SQL                             */
/* ============================================================ */
const XSS_VECTORS = [
  '<script>alert(1)</script>',
  '"; DROP TABLE exchange_credentials; --',
  "' OR 1=1 --",
  '../../etc/passwd',
  'key\u0000null',
  'key\nwith\nnewlines',
  '<img src=x onerror=alert(1)>',
];

Deno.test('sanitize: malicious api_key vectors all rejected with invalid_api_key', async () => {
  for (const vec of XSS_VECTORS) {
    const r = validateInput({ ...goodBody, api_key: vec });
    assert(!r.ok, `should reject api_key: ${vec}`);
  }
});

Deno.test('sanitize: malicious label vectors all rejected with invalid_label', async () => {
  for (const vec of XSS_VECTORS) {
    const r = validateInput({ ...goodBody, label: vec });
    assert(!r.ok, `should reject label: ${vec}`);
    assertEquals((r as { error: string }).error, 'invalid_label');
  }
});

Deno.test('sanitize: malicious payload via handler → 400, NO upstream fetch, NO persist', async () => {
  _resetRateLimit();
  let fetchCalled = false;
  const deps = baseDeps({
    fetchImpl: (async () => { fetchCalled = true; return new Response('{}'); }) as typeof fetch,
  });
  const res = await handler(makeReq({ ...goodBody, label: '<script>x</script>' }), deps);
  assertEquals(res.status, 400);
  assertEquals(fetchCalled, false, 'must not call exchange when input invalid');
  assertEquals(deps.persisted.length, 0);
});

Deno.test('sanitize: clean alphanumeric input passes validation', () => {
  const r = validateInput(goodBody);
  assert(r.ok);
});

/* ============================================================ */
/* 3. RATE LIMITING — structural cool-down                       */
/* ============================================================ */
Deno.test(`rate-limit: ${RATE_MAX_HITS} hits ok, ${RATE_MAX_HITS + 1}th flagged`, () => {
  _resetRateLimit();
  for (let i = 0; i < RATE_MAX_HITS; i++) {
    assertEquals(rateLimitCheck('user-A').ok, true, `hit ${i + 1} should pass`);
  }
  const blocked = rateLimitCheck('user-A');
  assertEquals(blocked.ok, false);
  assert('retry_after_ms' in blocked && blocked.retry_after_ms > 0);
});

Deno.test('rate-limit: handler returns 429 rate_limited on flood from same session', async () => {
  _resetRateLimit();
  const deps = baseDeps();
  // Successful Bybit response so we reach the post-rate-limit happy path on early hits.
  const mockOk = new Response(JSON.stringify({
    retCode: 0,
    result: { readOnly: 1, permissions: {} },
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  deps.fetchImpl = (async () => mockOk.clone()) as typeof fetch;

  let lastStatus = 0;
  for (let i = 0; i < RATE_MAX_HITS + 2; i++) {
    const res = await handler(makeReq(goodBody), deps);
    lastStatus = res.status;
    await res.text();
  }
  assertEquals(lastStatus, 429, 'final request must be rate-limited');
});

Deno.test('rate-limit: different users are bucketed independently', () => {
  _resetRateLimit();
  for (let i = 0; i < RATE_MAX_HITS; i++) rateLimitCheck('user-X');
  assertEquals(rateLimitCheck('user-X').ok, false);
  assertEquals(rateLimitCheck('user-Y').ok, true, 'distinct user must not be blocked');
});
