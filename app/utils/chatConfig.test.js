import assert from 'node:assert/strict'
import test from 'node:test'
import { canSendMessages, getSenderDisplayName, getSenderRole } from './chatConfig.js'

test('Layne can send as layne and displays as Layne', () => {
  assert.equal(getSenderRole('laynewright010@gmail.com'), 'layne')
  assert.equal(getSenderRole('LayneWright010@gmail.com'), 'layne')
  assert.equal(canSendMessages('laynewright010@gmail.com'), true)
  assert.equal(getSenderDisplayName('layne'), 'Layne')
})

test('Mike and Chris can still send', () => {
  assert.equal(getSenderRole('oceanviews@cox.net'), 'mike')
  assert.equal(getSenderRole('chrismwright@yahoo.com'), 'chris')
  assert.equal(canSendMessages('OCEANVIEWS@cox.net'), true)
  assert.equal(getSenderDisplayName('mike'), 'Mike')
  assert.equal(getSenderDisplayName('chris'), 'Chris')
})

test('other accounts stay view-only', () => {
  assert.equal(getSenderRole('someone@example.com'), null)
  assert.equal(getSenderRole(''), null)
  assert.equal(getSenderRole(null), null)
  assert.equal(canSendMessages('someone@example.com'), false)
  assert.equal(canSendMessages(''), false)
})
