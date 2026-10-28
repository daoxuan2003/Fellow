import test from 'node:test'
import assert from 'node:assert/strict'
import { wheelRotation, wheelLabel, wheelSlice } from '../src/utils/decision-wheel.js'
test('pointer lands at exactly the selected sector for 1 through 30 choices over repeated spins', () => {
  let rotation = 0
  for (let count = 1; count <= 30; count++) for (let index = 0; index < count; index++) {
    const next = wheelRotation(rotation, index, count)
    assert.ok(next - rotation >= 1800)
    const position = ((next + index * 360 / count) % 360 + 360) % 360
    assert.ok(position < 0.00001 || position > 359.99999)
    rotation = next
  }
})
test('dense wheel uses list numbers; long and emoji labels truncate safely', () => {
  assert.equal(wheelLabel('很长的选项名称不会挤出转盘', 30, 4), '5')
  assert.equal(wheelLabel('🍜🍜🍜🍜🍜🍜🍜', 4, 0), '🍜🍜🍜🍜🍜🍜…')
  assert.ok(!wheelSlice(0, 2).includes('NaN'))
})
