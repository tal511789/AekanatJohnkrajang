// Progress follows actual startup tasks. The visual only eases toward confirmed progress.
const MIN_DISPLAY_MS = 1700
const COLOR_HOLD_MS = 350
const FILL_SPEED = 65 // Maximum percentage points per second.
const overlay = document.getElementById('loading')
const logo = document.getElementById('loader-logo')
const percent = document.getElementById('loader-percent')
const track = document.getElementById('loader-track-fill')
const message = document.getElementById('loader-message')
const retry = document.getElementById('loader-retry')
const appParts = [...document.getElementById('app').children].filter(node => node !== overlay)
for (const node of appParts) node.inert = true
const tasks = new Map([
  ['page', { weight: 5, value: 0 }],
  ['fonts', { weight: 5, value: 0 }],
  ['logo', { weight: 5, value: 0 }],
  ['room', { weight: 70, value: 0 }],
  ['media', { weight: 10, value: 0 }],
  ['frame', { weight: 5, value: 0 }],
])
const startedAt = performance.now()
let failed = false, finished = false, closing = false
let shown = 0, lastTime = startedAt
let slowTimer
export const loadingGate = {
  get isFinished() { return finished },
  isReady(name) { return tasks.get(name)?.value === 1 },
  progress(name, fraction) {
    if (failed || finished || !Number.isFinite(fraction)) return
    const task = tasks.get(name)
    if (task) task.value = Math.max(task.value, Math.min(.99, Math.max(0, fraction)))
  },
  ready(name) {
    if (failed || finished) return
    const task = tasks.get(name)
    if (task) task.value = 1
  },
  fail(name, error) {
    if (failed || finished) return
    failed = true
    console.error(`Startup task ${name} failed.`, error)
    message.textContent = 'โหลดไม่สำเร็จ กรุณาลองอีกครั้ง'
    retry.hidden = false
    overlay.classList.add('has-error')
  },
}
function draw(value) {
  const text = `${Math.floor(value)}%`
  percent.value = text;percent.textContent = text
  logo.style.setProperty('--fill', `${value}%`)
  track.style.width = `${value}%`
}
function animate(time) {
  if (finished || failed) return
  const dt = Math.min(Math.max((time - lastTime) / 1000, 0), .1);lastTime = time
  const ready = [...tasks.values()].every(task => task.value === 1)
  const actual = [...tasks.values()].reduce((sum, task) => sum + task.weight * task.value, 0)
  const target = ready ? 100 : Math.min(actual, 99)
  shown = Math.max(shown, Math.min(target, shown + FILL_SPEED * dt))
  draw(shown)
  if (ready && shown >= 100 && time - startedAt >= MIN_DISPLAY_MS && !closing) {
    closing = true
    message.textContent = 'ยินดีต้อนรับเข้าสู่ห้องของฉัน'
    window.setTimeout(() => {
      // Keep the blocker until resources and a rendered frame have all completed.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (failed) return
        finished = true
        window.clearTimeout(slowTimer)
        for (const node of appParts) node.inert = false
        overlay.classList.add('is-gone')
        window.dispatchEvent(new Event('portfolio-ready'))
        window.setTimeout(() => overlay.remove(), 650)
      }))
    }, COLOR_HOLD_MS)
  }
  requestAnimationFrame(animate)
}
export function watchStartupMedia(media) {
  if (loadingGate.isReady('media') || finished || failed) return
  const isVideo = media.tagName === 'VIDEO'
  const ready = () => loadingGate.ready('media')
  const fail = () => loadingGate.fail('media', new Error('First project preview could not load.'))
  media.addEventListener(isVideo ? 'loadeddata' : 'load', ready, { once: true })
  media.addEventListener('error', fail, { once: true })
  if (isVideo) {
    media.preload = 'auto';media.pause()
    if (media.error) fail()
    else if (media.readyState >= 2) ready()
  } else if (media.complete) {
    if (media.naturalWidth) ready();else fail()
  }
}
retry.addEventListener('click', () => window.location.reload())
const avatar = document.getElementById('loader-logo-base')
const logoReady = () => loadingGate.ready('logo')
const logoFailed = () => loadingGate.fail('logo', new Error('Loader logo could not load.'))
avatar.addEventListener('load', logoReady, { once: true })
avatar.addEventListener('error', logoFailed, { once: true })
if (avatar.complete) { if (avatar.naturalWidth) logoReady();else logoFailed() }
if (document.readyState === 'complete') loadingGate.ready('page')
else window.addEventListener('load', () => loadingGate.ready('page'), { once: true })
Promise.resolve(document.fonts?.ready).then(() => loadingGate.ready('fonts'), error => loadingGate.fail('fonts', error))
slowTimer = window.setTimeout(() => {
  if (!finished && !failed && !closing) {
    message.textContent = 'กำลังโหลดอยู่ หากรอนานสามารถลองใหม่ได้'
    retry.hidden = false
  }
}, 20000)
draw(0)
requestAnimationFrame(animate)
