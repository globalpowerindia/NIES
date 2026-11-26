// Run against the isolated sample storefront. Each worker represents one browsing shopper.
import { setTimeout as sleep } from 'node:timers/promises'

const origin = 'http://127.0.0.1:3194'
const product = '/products/electric-drill-gpg-6d'
const routes = [
  { path: '/products', valid: (html) => html.includes('All Products') && html.includes('href="/products/') },
  { path: '/search?q=electric', valid: (html) => html.includes(product) && html.includes('electric') },
  { path: product, valid: (html) => html.includes('GPG-6D') && html.includes('Specifications') },
  { path: '/api/cart', valid: (body) => { const data = JSON.parse(body); return data.ok && data.cart?.lines?.length === 0 } },
]

async function sample(route) {
  const start = performance.now()
  try {
    const response = await fetch(origin + route.path, { redirect: 'error', signal: AbortSignal.timeout(5000) })
    const body = await response.text()
    return { ms: performance.now() - start, ok: response.status === 200 && route.valid(body), status: response.status }
  } catch (error) {
    return { ms: performance.now() - start, ok: false, status: error.name }
  }
}

function summarize(samples) {
  const times = samples.map((s) => s.ms).sort((a,b) => a-b)
  const p95 = times[Math.ceil(times.length * 0.95) - 1]
  return { requests: samples.length, failures: samples.filter((s) => !s.ok).length, p95ms: p95 === undefined ? null : Math.round(p95) }
}

async function stage(users, durationMs) {
  const until = performance.now() + durationMs
  const samples = routes.map(() => [])
  async function shopper(id) {
    await sleep((id + 0.5) / users * 4000)
    let step = id % routes.length
    while (performance.now() < until) {
      samples[step].push(await sample(routes[step]))
      step = (step + 1) % routes.length
      await sleep(4000)
    }
  }
  await Promise.all(Array.from({length:users}, (_,i) => shopper(i)))
  const perRoute = Object.fromEntries(routes.map((r,i) => [r.path,summarize(samples[i])]))
  const pass = Object.values(perRoute).every((r) => r.requests > 0 && r.p95ms < 2000 && r.failures / r.requests < 0.005)
  console.log(JSON.stringify({users,durationSeconds:durationMs/1000,perRoute,pass}))
  return pass
}

for (const route of routes) {
  const result = await sample(route)
  if (!result.ok) throw Error('Local fixture check failed for ' + route.path + ' (status ' + result.status + ')')
}
for (const users of [5,25,100,250,500,1000,2500,5000,10000]) {
  if (!await stage(users,30000)) {
    await sleep(10000)
    await stage(5,30000)
    break
  }
}
