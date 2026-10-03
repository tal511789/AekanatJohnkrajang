// Startup gate. Import this module from the page and from studio.js.
// The overlay stays visible until every required startup task reports ready.
const overlay = document.getElementById('loading')
const portrait = overlay.querySelector('.loader-portrait')
const percent = document.getElementById('loader-percent')
const track = document.getElementById('loader-track-fill')
const message = document.getElementById('loader-message')
const retry = document.getElementById('loader-retry')

const tasks = new Map([
  ['page', { weight: 5, value: 0 }],
  ['fonts', { weight: 5, value: 0 }],
  ['media', { weight: 15, value: 0 }],
  ['room', { weight: 65, value: 0 }],
  ['monitor', { weight: 5, value: 0 }],
  ['frame', { weight: 5, value: 0 }],
])
let finished = false
let failed = false
let lastPercent = 0

function paint() {
  if (failed || finished) return
  const actual = [...tasks.values()].reduce((sum, task) => sum + task.weight * task.value, 0)
  // Reserve 100% for the point where the actual scene is ready to enter.
  const next = Math.max(lastPercent, Math.min(99, Math.floor(actual)))
  lastPercent = next
  percent.value = `${next}%`
  percent.textContent = `${next}%`
  track.style.width = `${next}%`
  portrait.style.setProperty('--fill', `${next}%`)
  if ([...tasks.values()].every(task => task.value === 1)) {
    finished = true
    percent.value = '100%'
    percent.textContent = '100%'
    track.style.width = '100%'
    portrait.style.setProperty('--fill', '100%')
    // Give the fully rendered first frame one paint before revealing the page.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      overlay.classList.add('is-gone')
      window.setTimeout(() => overlay.remove(), 750)
    }))
  }
}

export const loadingGate = {
  get isFinished() { return finished },
  isReady(name) { return tasks.get(name)?.value === 1 },
  progress(name, fraction) {
    const task = tasks.get(name)
    if (!task || failed || finished) return
    task.value = Math.max(task.value, Math.min(.99, Math.max(0, fraction)))
    paint()
  },
  ready(name) {
    const task = tasks.get(name)
    if (!task || failed || finished) return
    task.value = 1
    paint()
  },
  fail(name, error) {
    if (failed || finished) return
    failed = true
    console.error(`Cannot prepare ${name}.`, error)
    message.textContent = 'โหลดทรัพยากรไม่สำเร็จ กรุณาลองอีกครั้ง'
    retry.hidden = false
  },
}

retry.addEventListener('click', () => window.location.reload())
const avatar = overlay.querySelector('.loader-portrait-base')
if (avatar.complete && !avatar.naturalWidth) loadingGate.fail('page', new Error('Loader avatar failed to load.'))
else avatar.addEventListener('error', () => loadingGate.fail('page', new Error('Loader avatar failed to load.')), { once: true })
window.setTimeout(() => {
  if (finished || failed) return
  message.textContent = 'ยังโหลดอยู่ หากรอนานเกินไปสามารถลองใหม่ได้'
  retry.hidden = false
}, 20000)

if (document.readyState === 'complete') loadingGate.ready('page')
else window.addEventListener('load', () => loadingGate.ready('page'), { once: true })
document.fonts.ready.then(() => loadingGate.ready('fonts'), error => loadingGate.fail('fonts', error))
