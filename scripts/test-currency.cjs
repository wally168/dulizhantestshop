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

function providerHarness(saved = 'AUD', storageBlocked = false) {
  const slots = [], effects = [], events = new Map()
  let cursor = 0, fail = false
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
    localStorage: {
      getItem: () => { if (storageBlocked) throw new Error('blocked'); return saved },
      setItem: (_, value) => { if (storageBlocked) throw new Error('blocked'); saved = value },
    },
    window: { setInterval() {}, clearInterval() {}, addEventListener: (key, fn) => events.set(key, fn), removeEventListener: key => events.delete(key) },
    fetch: async () => ({ ok: !fail, json: async () => snapshot }),
  }).default
  return {
    render() { cursor = 0; return component({ children: null }).props.value },
    async mount() { effects.splice(0).forEach(fn => fn()); await new Promise(resolve => setImmediate(resolve)) },
    fail() { fail = true }, recover() { fail = false },
    stored: () => saved, events,
  }
}

test('SSR starts in USD, restores choice, switches repeatedly without compounding, and survives reload', async () => {
  const app = providerHarness()
  assert.equal(app.render().currency, 'USD')
  await app.mount()
  let state = app.render()
  assert.equal(state.currency, 'AUD')
  assert.equal(state.formatPrice(10).replace(/\s/g, ''), 'AUD15.00')
  state.setCurrency('JPY'); state = app.render()
  assert.equal(state.formatPrice(10).replace(/\s/g, ''), 'JPY1,500')
  state.setCurrency('USD'); state = app.render()
  assert.equal(state.formatPrice(10).replace(/\s/g, ''), 'USD10.00')
  state.setCurrency('GBP')
  const reloaded = providerHarness(app.stored()); reloaded.render(); await reloaded.mount()
  assert.equal(reloaded.render().currency, 'GBP')
})

test('failed refresh falls back to USD, retry restores preference and blocked storage stays usable', async () => {
  const app = providerHarness(); app.render(); await app.mount()
  app.fail(); await app.render().refresh()
  let state = app.render()
  assert.equal(state.currency, 'USD'); assert.equal(state.error, true)
  assert.equal(state.formatPrice(10).replace(/\s/g, ''), 'USD10.00')
  state.setCurrency('AUD'); assert.equal(app.render().currency, 'USD')
  app.recover(); await app.render().refresh()
  assert.equal(app.render().currency, 'AUD')
  const blocked = providerHarness('AUD', true); blocked.render(); await blocked.mount()
  blocked.render().setCurrency('EUR')
  assert.equal(blocked.render().currency, 'EUR')
})
