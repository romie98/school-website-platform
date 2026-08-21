import assert from 'node:assert/strict'
import test from 'node:test'
import { isAdminOrPlatformHref, isExternalHref, withTenant } from './tenantLink.ts'

const tenant = 'belair-high'

test('preserves tenant on public navigation', () => {
  assert.equal(withTenant('/news', tenant), '/news?tenant=belair-high')
  assert.equal(withTenant('/about', tenant), '/about?tenant=belair-high')
  assert.equal(withTenant('/news/article-slug', tenant), '/news/article-slug?tenant=belair-high')
})

test('keeps existing query params', () => {
  assert.equal(withTenant('/news?category=sports', tenant), '/news?category=sports&tenant=belair-high')
})

test('keeps hashes', () => {
  assert.equal(withTenant('/about#history', tenant), '/about?tenant=belair-high#history')
  assert.equal(
    withTenant('/news?category=sports#latest', tenant),
    '/news?category=sports&tenant=belair-high#latest',
  )
})

test('leaves external links unchanged', () => {
  assert.equal(withTenant('https://example.com', tenant), 'https://example.com')
  assert.equal(withTenant('mailto:office@school.edu.jm', tenant), 'mailto:office@school.edu.jm')
  assert.equal(isExternalHref('https://example.com'), true)
})

test('leaves admin and platform routes unchanged', () => {
  assert.equal(withTenant('/admin/news', tenant), '/admin/news')
  assert.equal(withTenant('/admin', tenant), '/admin')
  assert.equal(withTenant('/platform/schools', tenant), '/platform/schools')
  assert.equal(isAdminOrPlatformHref('/administration'), false)
  assert.equal(withTenant('/about/administration', tenant), '/about/administration?tenant=belair-high')
})

test('without tenant param, routes stay unchanged', () => {
  assert.equal(withTenant('/news', null), '/news')
  assert.equal(withTenant('/about', ''), '/about')
  assert.equal(withTenant('/events', undefined), '/events')
})
