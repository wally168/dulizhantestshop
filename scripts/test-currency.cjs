const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')

// Exercise the actual TypeScript modules without introducing a separate test framework.
function load(relativePath, mocks = {}, globals = {}) {
  const module = { exports: {} }
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText
  vm.runInNewContext(code, {
    module, exports: module.exports, AbortSignal, console,
    require: name => Object.hasOwn(mocks, name) ? mocks[name] : require(name),
    ...globals,
  })
  return module.exports
}

const currency = load('src/lib/currencies.ts')
const rows = currency.CURRENCIES.filter(c => c.code !== 'USD').map(({ code }) => ({
  date: '2026-11-06', base: 'USD', quote: code, rate: code === 'JPY' ? 150 : 1.5,
}))
const snapshot = currency.parseExchangeRates(rows)

test('conversion uses USD amounts, ISO precision and unambiguous currency codes', () => {
  assert.equal(currency.formatConvertedPrice(10, 'AUD', 1.5).replace(/\s/g, ''), 'AUD15.00')
  assert.equal(currency.formatConvertedPrice(10.01, 'JPY', 150).replace(/\s/g, ''), 'JPY1,502')
  assert.equal(currency.formatConvertedPrice(0, 'EUR', 0.9).replace(/\s/g, ''), 'EUR0.00')
  const cartUSD = 3.79 * 3 + 10 * 2
  assert.equal(currency.formatConvertedPrice(cartUSD, 'AUD', 1.5).replace(/\s/g, ''), 'AUD47.06')
  assert.equal(currency.formatConvertedPrice(cartUSD, 'USD').replace(/\s/g, ''), 'USD31.37')
  for (const { code } of currency.CURRENCIES) assert.ok(currency.formatConvertedPrice(10, code, snapshot.rates[code]).includes(code))
})

test('missing, malformed and nonpositive rates are rejected instead of mislabeling USD', () => {
  assert.equal(snapshot.rates.USD, 1)
  assert.equal(currency.isExchangeRateSnapshot(snapshot), true)
  assert.throws(() => currency.parseExchangeRates(rows.slice(1)))
  for (const rate of [0, -1, NaN, Infinity, '1.5']) {
    assert.throws(() => currency.parseExchangeRates([{ ...rows[0], rate }, ...rows.slice(1)]))
  }
  assert.throws(() => currency.parseExchangeRates([{ ...rows[0], date: 'bad' }, ...rows.slice(1)]))
  assert.equal(currency.isExchangeRateSnapshot({ ...snapshot, rates: { USD: 1 } }), false)
  assert.equal(currency.isCurrencyCode('INVALID'), false)
})

test('rate API caches successful validated data and never caches provider failures', async () => {
  let fail = false
  const api = load('src/app/api/exchange-rates/route.ts', {
    '@/lib/currencies': currency,
    'next/server': { NextResponse: { json: (data, options) => ({ data, ...options }) } },
  }, {
    fetch: async (url, options) => {
      assert.ok(url.includes('base=USD&quotes=AUD,EUR,GBP,JPY'))
      assert.equal(options.next.revalidate, 3600)
      return { ok: !fail, status: fail ? 500 : 200, json: async () => rows }
    },
    console: { error() {} },
  })
  const ok = await api.GET()
  assert.equal(ok.data.rates.AUD, 1.5)
  assert.ok(ok.headers['Cache-Control'].includes('s-maxage=3600'))
  fail = true
  const failed = await api.GET()
  assert.equal(failed.status, 503)
  assert.equal(failed.headers['Cache-Control'], 'no-store')
})

function providerHarness(initialCurrency = 'USD') {
  const slots = [], effects = [], events = new Map()
  let cursor = 0, configuredCurrency = initialCurrency, failRates = false, failSettings = false, rateRequests = 0
  const hooks = {
    ...React,
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }]
    },
    useRef(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = { current: initial }
      return slots[i]
    },
    useCallback(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((d, j) => slots[i].deps[j] !== d)) slots[i] = { fn, deps }
      return slots[i].fn
    },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || deps.some((d, j) => slots[i][j] !== d)) { slots[i] = deps; effects.push(fn) }
    },
  }
  const component = load('src/components/CurrencyProvider.tsx', {
    react: hooks, '@/lib/currencies': currency,
  }, {
    localStorage: { getItem() { throw new Error('Visitor preferences must not be read') } },
    document: { visibilityState: 'visible', addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) },
    window: {
      setInterval(fn, ms) { assert.equal(ms, 3000); events.set('poll', fn) }, clearInterval() {},
      addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key),
    },
    fetch: async (url, options) => {
      if (url === '/api/storefront-currency') {
        assert.equal(options.cache, 'no-store')
        return { ok: !failSettings, json: async () => ({ currency: configuredCurrency }) }
      }
      rateRequests++
      return { ok: !failRates, json: async () => snapshot }
    },
  }).default
  return {
    render() { cursor = 0; return component({ children: null }).props.value },
    async mount() { effects.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)) },
    async poll() { events.get('poll')(); await new Promise(resolve => setImmediate(resolve)) },
    configure(value) { configuredCurrency = value },
    failRates() { failRates = true }, recover() { failRates = false },
    failSettings() { failSettings = true },
    rateRequests: () => rateRequests,
  }
}

test('all visitors follow admin changes via polling without reloading or reading local preferences', async () => {
  const app = providerHarness()
  assert.equal(app.render().currency, 'USD')
  await app.mount()
  assert.equal(app.render().currency, 'USD')
  assert.equal(app.rateRequests(), 0)
  app.configure('AUD'); await app.poll()
  assert.equal(app.render().formatPrice(10).replace(/\s/g, ''), 'AUD15.00')
  app.configure('JPY'); await app.poll()
  assert.equal(app.render().formatPrice(10).replace(/\s/g, ''), 'JPY1,500')
  assert.equal(app.rateRequests(), 1)
  app.configure('USD'); await app.poll()
  assert.equal(app.render().formatPrice(10).replace(/\s/g, ''), 'USD10.00')
  const anotherVisitor = providerHarness('JPY'); anotherVisitor.render(); await anotherVisitor.mount()
  assert.equal(anotherVisitor.render().currency, 'JPY')
  assert.equal(app.render().setCurrency, undefined)
})

test('unavailable rates fall back to USD and auto-retry; config outages keep confirmed currency', async () => {
  const app = providerHarness('AUD'); app.failRates(); app.render(); await app.mount()
  assert.equal(app.render().currency, 'USD'); assert.equal(app.render().error, true)
  app.recover(); await app.poll()
  assert.equal(app.render().currency, 'AUD')
  app.failSettings(); await app.poll()
  assert.equal(app.render().currency, 'AUD')
  assert.equal(app.render().formatPrice(10).replace(/\s/g, ''), 'AUD15.00')
})

test('admin settings persist globally, reject invalid currencies and require authentication', async () => {
  const values = new Map()
  let authenticated = true
  const mocks = {
    '@/lib/currencies': currency,
    '@/lib/db': { db: {
      siteSettings: {
        findUnique: async ({ where }) => values.has(where.key) ? { value: values.get(where.key) } : null,
        upsert: async ({ where, update }) => { values.set(where.key, update.value) },
      },
      $transaction: async ops => Promise.all(ops),
    } },
    '@/lib/auth': { isSameOrigin: () => true, requireAdminSession: async () => authenticated ? {} : { response: { status: 401 } } },
    'next/server': { NextResponse: { json: (data, options) => ({ data, status: 200, ...options }) } },
  }
  const admin = load('src/app/api/settings/route.ts', mocks)
  const storefront = load('src/app/api/storefront-currency/route.ts', mocks)
  assert.equal((await storefront.GET()).data.currency, 'USD')
  const put = code => admin.PUT({ json: async () => ({ displayCurrency: code }) })
  assert.equal((await put('AUD')).status, 200)
  const result = await storefront.GET()
  assert.equal(result.data.currency, 'AUD')
  assert.ok(result.headers['Cache-Control'].includes('no-store'))
  assert.equal((await put('INVALID')).status, 400)
  assert.equal((await storefront.GET()).data.currency, 'AUD')
  authenticated = false
  assert.equal((await put('JPY')).status, 401)
  assert.equal((await storefront.GET()).data.currency, 'AUD')
})
