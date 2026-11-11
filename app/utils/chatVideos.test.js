import assert from 'node:assert/strict'
import test from 'node:test'
import { CHAT_PHOTOS_BUCKET, messagePreviewText, replyPreviewLabel } from './chatPhotos.js'
import {
  CHAT_VIDEOS_BUCKET,
  CHAT_VIDEO_POSTER_BUCKET,
  MAX_CHAT_VIDEO_BYTES,
  CHAT_VIDEO_TOO_BIG_ERROR,
  CHAT_VIDEO_TYPE_ERROR,
  buildChatVideoPath,
  chatVideoFileInfo,
  chatVideoRejection,
  classifyChatFiles,
  toStoredVideoAttachment,
  videoAttachments
} from './chatVideos.js'

const file = (name, type, size) => ({ name, type, size })

test('accepts mp4, quicktime, and iPhone camera-roll mov files', () => {
  assert.deepEqual(chatVideoFileInfo(file('clip.mp4', 'video/mp4', 1000)), {
    kind: 'mp4',
    mime: 'video/mp4',
    ext: 'mp4'
  })
  assert.deepEqual(chatVideoFileInfo(file('clip.mov', 'video/quicktime', 1000)), {
    kind: 'mov',
    mime: 'video/quicktime',
    ext: 'mov'
  })
  assert.equal(chatVideoFileInfo(file('IMG_1234.MOV', '', 1000))?.mime, 'video/quicktime')
  assert.equal(chatVideoFileInfo(file('IMG_1234.mov', 'application/octet-stream', 1000))?.mime, 'video/quicktime')
  assert.equal(chatVideoFileInfo(file('video', 'video/quicktime', 1000))?.ext, 'mov')
  assert.equal(chatVideoRejection(file('clip.mp4', 'video/mp4', MAX_CHAT_VIDEO_BYTES)), null)
})

test('rejects a 60 MB video with a size error and does not treat it as the wrong type', () => {
  const big = file('long.mp4', 'video/mp4', 60 * 1024 * 1024)
  const error = chatVideoRejection(big)
  assert.equal(error, CHAT_VIDEO_TOO_BIG_ERROR)
  assert.match(error, /50 MB/)
  assert.equal(chatVideoRejection(file('long.mp4', 'video/mp4', MAX_CHAT_VIDEO_BYTES + 1)), CHAT_VIDEO_TOO_BIG_ERROR)
})

test('rejects a non-video file', () => {
  assert.equal(chatVideoRejection(file('notes.pdf', 'application/pdf', 2000)), CHAT_VIDEO_TYPE_ERROR)
  assert.equal(chatVideoRejection(file('clip.webm', 'video/webm', 2000)), CHAT_VIDEO_TYPE_ERROR)
  assert.equal(chatVideoFileInfo(file('photo.jpg', 'image/jpeg', 2000)), null)
})

test('classifyChatFiles keeps photos, accepts one mov, and reports every rejection', () => {
  const photo = file('tank.jpg', 'image/jpeg', 2000)
  const mov = file('IMG_9.MOV', '', 4000)
  const pdf = file('notes.pdf', 'application/pdf', 2000)
  const big = file('long.mp4', 'video/mp4', 60 * 1024 * 1024)
  const result = classifyChatFiles([photo, mov, pdf, big])
  assert.deepEqual(result.images, [photo])
  assert.deepEqual(result.videos, [mov])
  assert.deepEqual(result.errors, [CHAT_VIDEO_TYPE_ERROR, CHAT_VIDEO_TOO_BIG_ERROR])
})

test('stores video attachment metadata with type video and the real content type', () => {
  const stored = toStoredVideoAttachment({
    path: 'ops/2026/11/abc.mov',
    mime: 'video/quicktime',
    width: 1920,
    height: 1080,
    size: 1234,
    posterPath: 'ops/2026/11/abc.jpg'
  })
  assert.equal(stored.type, 'video')
  assert.equal(stored.bucket, CHAT_VIDEOS_BUCKET)
  assert.equal(stored.mime, 'video/quicktime')
  assert.equal(stored.posterBucket, CHAT_VIDEO_POSTER_BUCKET)
  assert.equal(stored.posterBucket, CHAT_PHOTOS_BUCKET)
  assert.equal(buildChatVideoPath('ops', new Date('2026-11-02T00:00:00Z'), 'abc', 'mov'), 'ops/2026/11/abc.mov')
  assert.equal(videoAttachments({ attachments: [stored] }).length, 1)
})

test('preview text stays photo-first and adds a video label', () => {
  const image = { type: 'image', path: 'ops/2026/11/a.jpg' }
  const video = { type: 'video', path: 'ops/2026/11/a.mov', mime: 'video/quicktime' }
  assert.equal(messagePreviewText({ body: '', attachments: [image] }), '📷 Photo')
  assert.equal(messagePreviewText({ body: '', attachments: [video] }), '🎥 Video')
  assert.equal(messagePreviewText({ body: '', attachments: [image, video] }), '📷 Photo and video')
  assert.equal(messagePreviewText({ body: 'Tide check', attachments: [video] }), 'Tide check')
  assert.equal(replyPreviewLabel({ body: '', attachments: [video] }), 'Video')
  assert.equal(replyPreviewLabel({ body: '', attachments: [image] }), 'Photo')
})
