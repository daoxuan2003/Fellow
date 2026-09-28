import test from 'node:test'
import assert from 'node:assert/strict'
import { profileForm, previewTotal, walkRemaining, trendPoints } from '../src/utils/nutrition.js'
test('profile honors known health data and keeps unknown age/waist unconfirmed', () => {
  const male = profileForm(null, { sex: 'male', height: 180, baselineWeight: 76 })
  assert.equal(male.height, 180); assert.equal(male.goal, 'recomp'); assert.equal(male.age, ''); assert.equal(male.waist, ''); assert.equal(male.protein, 140)
  assert.equal(male.privacy.weight, false); assert.equal(male.allowSharedMeals, false)
  const existing = profileForm({ ...male, protein: 130, privacy: { weight: true }, revision: 7 })
  assert.equal(existing.protein, 130); assert.equal(existing.privacy.weight, true); assert.equal(existing.revision, 7)
})
test('shared portions preview independently and walk timer accounts for background elapsed time', () => {
  const items = [{ food: { per100: { calories: 130 } }, amount: 150, partnerAmount: 250 }]
  assert.equal(previewTotal(items), 195); assert.equal(previewTotal(items, true), 325)
  const start = '2026-09-28T00:00:00Z'
  assert.equal(walkRemaining(start, Date.parse(start) + 599000), 1)
  assert.equal(walkRemaining(start, Date.parse(start) + 800000), 0)
})
test('trend gaps are not connected and zero intake remains a recorded value', () => {
  const rows = [{ date: 'a', calories: 0 }, { date: 'b', calories: null }, { date: 'c', calories: 2000 }]
  const points = trendPoints(rows, 'calories')
  assert.equal(points.min, 0); assert.equal(points.segments.length, 2)
  assert.deepEqual(trendPoints([{ calories: null }], 'calories').segments, [])
})
