import * as THREE from './vendor/three.module.js'
import { loadingGate, watchStartupMedia } from './logo-loading.js'

// The supplied Spline room is exported without materials; colors are applied below.
// Leave this empty to view the sample room built in code instead.
const ROOM_MODEL_URL = '/models/3_d_room.glb'
const MONITOR_MESH_NAME = 'Monitor'
// Use 'object' for one piece of furniture, or 'room' for a complete room.
const MODEL_MODE = 'room'
const MODEL_ROTATION_Y = -Math.PI / 2 // Face the open sides of this room toward the camera.
const MODEL_ROOM_OFFSET_X = 2.8 // Keep the computer to the right of the headline.
const MODEL_OBJECT_MAX_SIZE = 2.8 // Largest dimension in room units.
const MODEL_OBJECT_POSITION = new THREE.Vector3(3.25, 0, -1.55)
const MODEL_REPLACES_DESK = true // Set false when importing a chair or other furniture.

const host = document.getElementById('scene')
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7))
renderer.setSize(host.clientWidth, host.clientHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.35
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
host.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#071b2c')
scene.fog = new THREE.Fog('#071b2c', 18, 38)
const camera = new THREE.PerspectiveCamera(42, host.clientWidth / host.clientHeight, 0.1, 80)
const roomPosition = new THREE.Vector3(3.3, 1.6, 2.35)
const roomTarget = new THREE.Vector3(-1.35, 1.05, -1.65)
const focusPosition = new THREE.Vector3(1.249, 1.338, -0.459)
const focusTarget = new THREE.Vector3(1.249, 1.168, -1.909)
// Set false after copying custom camera values from the editor.
const AUTO_FIT_OBJECT_VIEWS = true
const boardPosition = new THREE.Vector3(1.7, 1.627, -0.082)
const boardTarget = new THREE.Vector3(-0.473, 1.627, -0.082)
const plantPosition = new THREE.Vector3(1.45, 0.365, 1.55)
const plantTarget = new THREE.Vector3(-0.131, 0.365, 1.55)
const booksPosition = new THREE.Vector3(1.45, 2.27, -0.9)
const booksTarget = new THREE.Vector3(1.45, 2.27, -2.29)
// 1.05 = 5% larger. Set 1 to disable enlargement.
const HOVER_SCALE = 1.05
const HOVER_SPEED = 12
const BOOKS_MESH_NAME = 'books-1'
// Hover hologram text. Rename these titles without changing navigation.
const HOVER_LABELS = {
  work: { title: 'Work', number: '01', hint: '' },
  board: { title: 'About', number: '02', hint: '' },
  plant: { title: 'Contact', number: '03', hint: '' },
  books: { title: '----', number: '04', hint: '' },
}
const objectViews = {
  books: { position: booksPosition, target: booksTarget, object: null, frameObject: null, normal: new THREE.Vector3(0, 0, 1), edited: !AUTO_FIT_OBJECT_VIEWS },
  board: { position: boardPosition, target: boardTarget, object: null, normal: new THREE.Vector3(0, 0, 1), edited: !AUTO_FIT_OBJECT_VIEWS },
  plant: { position: plantPosition, target: plantTarget, object: null, normal: new THREE.Vector3(0, 0, 1), edited: !AUTO_FIT_OBJECT_VIEWS },
}
camera.position.copy(roomPosition)
camera.lookAt(roomTarget)
let currentTarget = roomTarget.clone()
let cameraEditor = null

const mat = (color, roughness = .83, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness })
const navy = mat('#12344d'), dark = mat('#092437'), blue = mat('#2e6389')
const pale = mat('#d7f1fa'), white = mat('#f1f7f4'), wood = mat('#637e95')
const glow = (color, intensity = .7) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: .65 })
function box(w, h, d, x, y, z, material, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
  m.position.set(x, y, z)
  m.castShadow = opts.cast !== false
  m.receiveShadow = opts.receive !== false
  scene.add(m)
  return m
}
function cyl(rt, rb, h, x, y, z, material, seg = 18) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material)
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; scene.add(m); return m
}
function planeTexture(width, height, paint) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  paint(canvas.getContext('2d'), width, height)
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
  return texture
}

// The entire room is geometry built here: there are no external 3D models.
box(11, .25, 9, -.15, -.14, 0, mat('#192f3f'))
box(11, 5.8, .28, -.15, 2.75, -4.28, navy)
box(.28, 5.8, 9, -5.63, 2.75, .02, mat('#103750'))
box(11, .16, .18, -.15, .06, -4.06, mat('#194360'))
box(.15, .16, 9, -5.42, .06, 0, mat('#194360'))
box(11, .09, 9, -.15, 5.72, 0, mat('#091b2a'))

// Soft woven rug: dark enough to keep attention on the wall and the monitor.
const rugTexture = planeTexture(512, 512, (ctx, w, h) => {
  ctx.fillStyle = '#7d91a8'; ctx.fillRect(0, 0, w, h)
  for (let y = 0; y < h; y += 4) { ctx.strokeStyle = y % 12 === 0 ? '#b6c8d037' : '#52697b55'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke() }
  for (let x = 0; x < w; x += 3) { ctx.strokeStyle = '#dce6e026'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke() }
})
box(6.65, .045, 4.75, -1.18, -.01, 1.18, mat('#869caf'), { cast: false })
const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.6), new THREE.MeshStandardMaterial({ map: rugTexture, roughness: 1 }))
rug.rotation.x = -Math.PI / 2; rug.position.set(-1.18, .019, 1.18); rug.receiveShadow = true; scene.add(rug)

// Framed project gallery with three sample cards, matching the reference layout.
const sampleBoard = box(4.12, 2.7, .16, -3.20, 3.13, -4.02, mat('#f2ece2', .48))
box(3.93, 2.51, .038, -3.20, 3.13, -3.913, mat('#17354e'))
const artTexture = planeTexture(1536, 960, (ctx, w, h) => {
  ctx.fillStyle = '#17324c'; ctx.fillRect(0, 0, w, h)
  const names = [['Lume', 'Brand & Web'], ['Nora', 'E-commerce'], ['Drift', 'Portfolio']]
  for (let i = 0; i < 3; i++) {
    const x = 64 + i * 482, y = 80, cw = 448, ch = 796
    const sky = ctx.createLinearGradient(x, y, x, y + 540)
    sky.addColorStop(0, i === 2 ? '#abc8dd' : '#8ab7df'); sky.addColorStop(1, i === 1 ? '#d5c2b3' : '#e4d5c3')
    ctx.fillStyle = sky; ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 24); ctx.fill()
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 24); ctx.clip()
    ctx.fillStyle = i === 2 ? '#778fa2' : '#eee2d5'; ctx.fillRect(x, y + 510, cw, 118)
    if (i === 0) {
      ctx.fillStyle = '#f9f1e7'; ctx.fillRect(x + 190, y + 177, 252, 373)
      ctx.beginPath(); ctx.arc(x + 310, y + 347, 91, Math.PI, 0); ctx.lineTo(x + 401, y + 550); ctx.lineTo(x + 219, y + 550); ctx.fill()
      ctx.fillStyle = '#35546a'; ctx.beginPath(); ctx.arc(x + 310, y + 352, 57, Math.PI, 0); ctx.lineTo(x + 367, y + 550); ctx.lineTo(x + 253, y + 550); ctx.fill()
      ctx.fillStyle = '#4a7554'; ctx.beginPath(); ctx.arc(x + 92, y + 420, 66, 0, 7); ctx.fill(); ctx.fillStyle = '#765c45'; ctx.fillRect(x + 85, y + 430, 14, 120)
    } else if (i === 1) {
      ctx.fillStyle = '#f1e8dd'; ctx.fillRect(x + 249, y + 210, 148, 310)
      ctx.beginPath(); ctx.arc(x + 324, y + 340, 73, Math.PI, 0); ctx.lineTo(x + 397, y + 540); ctx.lineTo(x + 251, y + 540); ctx.fill()
      ctx.fillStyle = '#3c5c78'; ctx.beginPath(); ctx.ellipse(x + 126, y + 445, 49, 83, 0, 0, 7); ctx.fill(); ctx.fillRect(x + 78, y + 294, 95, 150)
      ctx.fillStyle = '#e6dfd2'; ctx.beginPath(); ctx.arc(x + 190, y + 506, 37, 0, 7); ctx.fill()
    } else {
      ctx.fillStyle = '#f8e8d5'; ctx.beginPath(); ctx.arc(x + 346, y + 122, 34, 0, 7); ctx.fill()
      for (let j = 0; j < 5; j++) { ctx.fillStyle = ['#8eaac2', '#6787a4', '#4f6e8a', '#395771', '#2d485f'][j]; ctx.beginPath(); ctx.moveTo(x, y + 322 + j * 44); ctx.quadraticCurveTo(x + 160, y + 150 + j * 61, x + 448, y + 326 + j * 41); ctx.lineTo(x + 448, y + 630); ctx.lineTo(x, y + 630); ctx.fill() }
    }
    const foot = ctx.createLinearGradient(0, y + 590, 0, y + ch); foot.addColorStop(0, '#163651'); foot.addColorStop(1, '#112a43')
    ctx.fillStyle = foot; ctx.fillRect(x, y + 624, cw, 172)
    ctx.fillStyle = '#f2f7f5'; ctx.font = '600 48px Arial'; ctx.fillText(names[i][0], x + 28, y + 703)
    ctx.fillStyle = '#c9d8e4'; ctx.font = '27px Arial'; ctx.fillText(names[i][1], x + 28, y + 751)
    ctx.strokeStyle = '#d7f0ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 394, y + 715, 26, 0, 7); ctx.stroke()
    ctx.fillStyle = '#f5fbff'; ctx.font = '32px Arial'; ctx.fillText('↗', x + 380, y + 726)
    ctx.restore()
  }
})
box(3.83, 2.42, .014, -3.20, 3.13, -3.878, new THREE.MeshBasicMaterial({ map: artTexture }), { cast: false })

// Work desk: powder-blue top, warm edge, white cylindrical legs.
const deskStart = scene.children.length
box(4.45, .22, 1.88, 2.62, 1.47, -1.66, mat('#8fb6d1', .48))
box(4.46, .047, 1.89, 2.62, 1.605, -1.66, mat('#bfd9e9', .44))
for (const x of [.91, 4.32]) for (const z of [-2.3, -.98]) cyl(.095, .1, 1.36, x, .71, z, white, 12)
box(.85, .025, .30, 2.65, 1.651, -.84, mat('#dce9ea'))
for (let i = 0; i < 8; i++)box(.077, .004, .2, 2.34 + i * .082, 1.667, -.84, mat('#7e9aab'), { cast: false })
box(.26, .025, .38, 3.48, 1.65, -.82, mat('#d5e2e4'))
// Notebook, pen cup and pencils on the desk.
box(.60, .05, .48, 4.09, 1.659, -.83, mat('#293d4e'))
cyl(.10, .10, .36, 1.15, 1.82, -1.77, mat('#ede8df'), 16)
for (let i = 0; i < 4; i++) { const pen = cyl(.015, .015, .40, 1.10 + i * .035, 2.17, -1.79, mat(i % 2 ? '#b99a73' : '#294b67'), 8); pen.rotation.z = (i - 1.5) * .13 }

// Stand sits behind the display plane, allowing a proper camera move toward it.
box(.16, .66, .13, 2.63, 1.95, -1.78, pale)
box(.9, .045, .55, 2.63, 1.64, -1.69, pale)
box(2.75, 1.69, .13, 2.63, 2.69, -1.78, mat('#1e2a32', .38))
box(2.66, 1.59, .03, 2.63, 2.69, -1.69, mat('#e8ede9', .55))
const screenGrad = planeTexture(1024, 640, (ctx, w, h) => {
  const gradient = ctx.createLinearGradient(0, 0, w, h); gradient.addColorStop(0, '#f4eee5'); gradient.addColorStop(.53, '#bad5ed'); gradient.addColorStop(1, '#92bfe1')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1f435c'; ctx.font = '26px Georgia'; ctx.fillText('Lume', 45, 57)
  ctx.font = '17px Arial'; ctx.fillText('Home      Work      About       ☰', 685, 54)
  ctx.fillStyle = '#1d3e56'; ctx.font = '72px Georgia'; ctx.fillText('Lume', 48, 220)
  ctx.font = '21px Arial'; ctx.fillText('Spaces for a calmer tomorrow.', 53, 262)
  ctx.fillStyle = '#264a62'; ctx.beginPath(); ctx.roundRect(53, 292, 108, 38, 19); ctx.fill()
  ctx.fillStyle = '#fffaf1'; ctx.font = '16px Arial'; ctx.fillText('Explore', 79, 318)
  ctx.fillStyle = '#e6d9c9'; ctx.fillRect(620, 224, 390, 338)
  ctx.fillStyle = '#f3e8d9'; ctx.fillRect(690, 169, 327, 400)
  ctx.beginPath(); ctx.arc(735, 369, 82, Math.PI, 0); ctx.lineTo(817, 568); ctx.lineTo(653, 568); ctx.fill()
  ctx.fillStyle = '#557891'; ctx.beginPath(); ctx.arc(735, 372, 51, Math.PI, 0); ctx.lineTo(786, 568); ctx.lineTo(684, 568); ctx.fill()
  ctx.fillStyle = '#ddc9ac'; ctx.fillRect(0, 560, w, 80)
  ctx.fillStyle = '#587957'; ctx.beginPath(); ctx.arc(552, 483, 53, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#6d5845'; ctx.fillRect(546, 490, 10, 77)
})
const monitor = box(2.57, 1.50, .008, 2.63, 2.69, -1.660, new THREE.MeshBasicMaterial({ map: screenGrad }), { cast: false })
monitor.name = 'monitor-interaction'
monitor.userData.interactive = true
const focusTexture = planeTexture(1024, 640, (ctx, w, h) => {
  const fill = ctx.createLinearGradient(0, 0, w, h)
  fill.addColorStop(0, '#c9edfa'); fill.addColorStop(1, '#8fc3e1')
  ctx.fillStyle = fill; ctx.fillRect(0, 0, w, h)
})

// The lamp is intentionally a small warm accent against the cool room.
cyl(.14, .18, .59, 4.24, 1.93, -1.84, mat('#ebce94'), 16)
const dome = new THREE.Mesh(new THREE.SphereGeometry(.39, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glow('#fff5bd', .5))
dome.position.set(4.24, 2.24, -1.84); dome.castShadow = true; scene.add(dome)
const lampLight = new THREE.PointLight('#ffe9b0', 18, 5.5, 2)
lampLight.position.set(4.24, 2.18, -1.84); scene.add(lampLight)
for (const item of scene.children.slice(deskStart)) item.position.x += .65
const sampleDeskMeshes = scene.children.slice(deskStart).filter(object => object.isMesh)

// Floating shelf with plant, stacked books, framed print and ceramic accent.
const sampleShelf = box(3.65, .12, .56, 3.07, 4.35, -3.84, mat('#25435c', .8))
const sampleBooksStart = scene.children.length
for (let i = 0; i < 3; i++)box(.52, .07, .33, 2.87, 4.49 + i * .085, -3.79, mat(['#d5d9db', '#e2d5ca', '#9eaeb9'][i]))
const sampleBooks = new THREE.Group()
for (const mesh of scene.children.slice(sampleBooksStart)) sampleBooks.attach(mesh)
scene.add(sampleBooks)
const sampleBookcase = new THREE.Group()
scene.add(sampleBookcase); sampleBookcase.attach(sampleShelf); sampleBookcase.attach(sampleBooks)
objectViews.books.object = sampleBookcase
objectViews.books.frameObject = sampleBooks
box(.90, 1.09, .11, 4.05, 4.96, -3.94, mat('#c8ad8b'))
const smallFrame = planeTexture(512, 640, (ctx, w, h) => { ctx.fillStyle = '#e5dfd4'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#3d627a'; ctx.fillRect(44, 44, 424, 552); ctx.fillStyle = '#d3d5ce'; ctx.beginPath(); ctx.arc(327, 192, 56, 0, 7); ctx.fill(); ctx.fillStyle = '#1d405a'; ctx.beginPath(); ctx.arc(181, 478, 151, Math.PI, 0); ctx.lineTo(332, 586); ctx.lineTo(30, 586); ctx.fill() })
box(.79, .99, .012, 4.05, 4.96, -3.875, new THREE.MeshBasicMaterial({ map: smallFrame }), { cast: false })
cyl(.17, .16, .26, 4.63, 4.55, -3.68, mat('#ebe1d3'), 20)
cyl(.22, .18, .49, 1.57, 4.65, -3.79, mat('#c9bdab'), 16)
for (let i = 0; i < 13; i++) {
  const t = i / 13 * Math.PI * 2
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), mat(i % 2 ? '#406d31' : '#59873c'))
  leaf.scale.set(1.15, .36, .43)
  leaf.position.set(1.57 + Math.cos(t) * .29, 4.94 + (i % 3) * .14, -3.79 + Math.sin(t) * .18)
  leaf.rotation.z = t; leaf.castShadow = true; scene.add(leaf)
}
for (let j = 0; j < 3; j++)for (let i = 0; i < 4; i++) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.11, 8, 7), mat('#547d3a'))
  leaf.scale.set(1.0, .44, .4); leaf.position.set(1.47 + j * .18, 4.55 - i * .23, -3.78); leaf.rotation.z = (j % 2 ? 1 : -1) * .6; scene.add(leaf)
}

// Broad green leaves by the wall.
const plantStart = scene.children.length
cyl(.24, .19, .45, -3.65, .3, -2.7, mat('#8b502f'), 18)
cyl(.26, .26, .045, -3.65, .53, -2.7, mat('#aa6841'), 18)
for (let i = 0; i < 7; i++) {
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(.18, 1.05, 6), mat(i % 2 ? '#269841' : '#2eaf51', .9))
  const angle = i * Math.PI * 2 / 7
  leaf.position.set(-3.65 + Math.cos(angle) * .17, 1.02 + Math.sin(i * 7) * .08, -2.7 + Math.sin(angle) * .15)
  leaf.rotation.z = Math.cos(angle) * .4; leaf.rotation.x = Math.sin(angle) * .4; leaf.castShadow = true; scene.add(leaf)
}

const samplePlant = new THREE.Group()
for (const mesh of scene.children.slice(plantStart)) samplePlant.attach(mesh)
scene.add(samplePlant)
objectViews.board.object = sampleBoard
objectViews.plant.object = samplePlant

// Curved chair in front of the desk; the seat and back remain separate pieces.
const chairMat = mat('#657c8e', .66)
const seat = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), chairMat)
seat.scale.set(.79, .15, .57); seat.position.set(2.85, 1.01, .26); seat.castShadow = true; scene.add(seat)
const chairBack = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), chairMat)
chairBack.scale.set(.78, .76, .17); chairBack.position.set(2.71, 1.67, .72); chairBack.rotation.z = .16; chairBack.rotation.x = -.19; chairBack.castShadow = true; scene.add(chairBack)
for (const x of [2.35, 3.35]) for (const z of [-.10, .58]) {
  const leg = cyl(.06, .08, .9, x, .48, z, mat('#dfdfd7'), 12); leg.rotation.z = (x < 2.85 ? -.18 : .16)
}

scene.add(new THREE.HemisphereLight('#add5ff', '#1b2b33', 2.15))
const mainLight = new THREE.DirectionalLight('#b0dbff', 4.2)
mainLight.position.set(3, 8, 6); mainLight.castShadow = true
mainLight.shadow.mapSize.set(1024, 1024); mainLight.shadow.camera.left = -9; mainLight.shadow.camera.right = 9
mainLight.shadow.camera.top = 9; mainLight.shadow.camera.bottom = -9
mainLight.shadow.normalBias = .035; scene.add(mainLight)
const wallLight = new THREE.PointLight('#3785e0', 8, 13)
wallLight.position.set(-2, 4, -1); scene.add(wallLight)

// Keep the current room visible until an optional imported model is ready.
let monitorHitObject = monitor, screenPlane = null
if (ROOM_MODEL_URL) {
  const sampleMeshes = scene.children.filter(object => object.isMesh)
  import('./vendor/addons/loaders/GLTFLoader.js').then(({ GLTFLoader }) => {
    new GLTFLoader().load(ROOM_MODEL_URL, gltf => {
      const model = gltf.scene
      // Some Spline exports contain zero-scale nodes with invalid decomposed rotations.
      model.traverse(object => { if (!object.quaternion.toArray().every(Number.isFinite)) object.quaternion.identity() })
      model.rotation.y = MODEL_ROTATION_Y
      model.updateMatrixWorld(true)
      const initialBounds = new THREE.Box3().setFromObject(model)
      const initialSize = initialBounds.getSize(new THREE.Vector3())
      if (!initialSize.toArray().every(Number.isFinite) || initialSize.lengthSq() === 0) { loadingGate.fail('room', new Error('The 3D file has no valid visible mesh.')); return }
      const wholeRoom = MODEL_MODE === 'room'
      // The exported walls extend below the floor. Fit by visible wall height instead.
      const visibleHeight = wholeRoom ? 4.43 : initialSize.y
      const fit = wholeRoom
        ? Math.min(10.5 / Math.max(initialSize.x, .001), 5.7 / Math.max(visibleHeight, .001), 8.8 / Math.max(initialSize.z, .001))
        : MODEL_OBJECT_MAX_SIZE / Math.max(initialSize.x, initialSize.y, initialSize.z)
      model.scale.multiplyScalar(fit)
      model.updateMatrixWorld(true)
      const bounds = new THREE.Box3().setFromObject(model)
      const floor = model.getObjectByName('floor')
      const groundY = wholeRoom && floor ? new THREE.Box3().setFromObject(floor).getCenter(new THREE.Vector3()).y : bounds.min.y
      model.position.add(new THREE.Vector3(-(bounds.min.x + bounds.max.x) / 2, -groundY, -(bounds.min.z + bounds.max.z) / 2))
      if (wholeRoom) model.position.x += MODEL_ROOM_OFFSET_X
      if (!wholeRoom) model.position.add(MODEL_OBJECT_POSITION)
      model.traverse(object => {
        if (!object.isMesh) return
        object.castShadow = true; object.receiveShadow = true
        if (!wholeRoom) return
        // This particular GLB contains zero materials and image textures.
        // Restore a simple palette by using the original Spline object hierarchy.
        const ancestors = []
        for (let parent = object; parent && parent !== model; parent = parent.parent)ancestors.push(parent.name || '')
        const group = ancestors.join(' / ')
        let color = '#a8bed0', metalness = 0, emissive = '#000000', emissiveIntensity = 0
        if (/wall2|Wall3/i.test(group)) color = '#173852'
        else if (/floor/i.test(group)) color = '#718ba0'
        else if (/BlackBoard screen/i.test(group)) { color = '#315777'; emissive = '#102f46'; emissiveIntensity = .35 }
        else if (/Board|BlackBoard/i.test(group)) color = '#e8ebdf'
        else if (/Monitor/i.test(group)) {
          color = /Boolean|Cube$/i.test(object.name) ? '#b2d9e8' : '#d6e7ec'
          if (/Cube$/i.test(object.name)) { emissive = '#2b647e'; emissiveIntensity = .28 }
        }
        else if (/Table/i.test(group)) color = '#b5d7e7'
        else if (/Plant/i.test(group)) color = /Boolean/i.test(object.name) ? '#8c644b' : '#468758'
        else if (/book/i.test(group)) color = '#b0bdd1'
        else if (/My Project|My Hobby|About Me/i.test(group)) color = '#9fcce8'
        else if (/Text/i.test(group)) color = '#e8f1ef'
        object.material = new THREE.MeshStandardMaterial({ color, roughness: .72, metalness, emissive, emissiveIntensity, side: THREE.DoubleSide })
      })
      // Replace legacy exported speech bubbles with the hover-only hologram.
      for (const name of ['My_Project', 'My_Hobby', 'About_Me', 'My Project', 'My Hobby', 'About Me']) {
        const bubble = model.getObjectByName(name); if (bubble) bubble.visible = false
      }
      scene.add(model)
      model.updateMatrixWorld(true)
      if (wholeRoom) { sampleMeshes.forEach(object => { object.visible = false }); samplePlant.visible = false; sampleBookcase.visible = false }
      else if (MODEL_REPLACES_DESK) sampleDeskMeshes.forEach(object => { object.visible = false })
      if (wholeRoom) {
        objectViews.board.object = model.getObjectByName('Board') || model.getObjectByName('BlackBoard screen')
        objectViews.plant.object = model.getObjectByName('Plant')
        const books = model.getObjectByName(BOOKS_MESH_NAME)
        const bookcase = new THREE.Group(); bookcase.name = 'InteractiveBookshelf'; scene.add(bookcase)
        if (books) {
          // The shelf is the direct Cube sibling of books-1 in this exported room.
          const shelf = books.parent?.children.find(object => object.name === 'Cube' && object.isMesh)
          if (shelf) bookcase.attach(shelf)
          bookcase.attach(books)
          objectViews.books.object = bookcase; objectViews.books.frameObject = books
        } else {
          bookcase.removeFromParent(); objectViews.books.object = null; objectViews.books.frameObject = null
          console.warn('Books not found. Set BOOKS_MESH_NAME to the book group in your GLB.')
        }
        document.getElementById('nav-books').disabled = !books
        const board = objectViews.board.object
        if (board) {
          const size = new THREE.Box3().setFromObject(board).getSize(new THREE.Vector3())
          // Use the thin axis of the transformed board as its face direction.
          const axis = size.x < size.y && size.x < size.z ? 'x' : size.z < size.y ? 'z' : 'y'
          const normal = new THREE.Vector3(); normal[axis] = 1
          const center = new THREE.Box3().setFromObject(board).getCenter(new THREE.Vector3())
          if (normal.dot(roomPosition.clone().sub(center)) < 0) normal.negate()
          objectViews.board.normal.copy(normal)
          objectViews.plant.normal.copy(normal)
        }
        fitObjectViews()
        if (objectViews[activeView]?.object) moveCamera(objectViews[activeView].position, objectViews[activeView].target)
        cameraEditor?.refresh()
      }
      const screen = model.getObjectByName(MONITOR_MESH_NAME) || model.getObjectByName('Monitor')
      if (screen) {
        monitorHitObject = screen
        const displayMesh = screen.getObjectByName('Cube')
        const center = new THREE.Box3().setFromObject(screen).getCenter(new THREE.Vector3())
        // This exported monitor is a YZ plane; its face points along local +X.
        const normal = new THREE.Vector3(1, 0, 0).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()))
        if (normal.dot(new THREE.Vector3().subVectors(roomPosition, center)) < 0) normal.negate()
        focusTarget.copy(center)
        focusPosition.copy(center).addScaledVector(normal, 1.45).add(new THREE.Vector3(0, .17, 0))
        cameraEditor?.refresh()
        if (displayMesh?.isMesh) {
          // Place a real image/video surface just in front of the GLB's screen.
          const displayBounds = new THREE.Box3().setFromObject(displayMesh)
          const displaySize = displayBounds.getSize(new THREE.Vector3())
          const displayCenter = displayBounds.getCenter(new THREE.Vector3())
          screenPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(Math.max(displaySize.x, displaySize.z) * .96, displaySize.y * .92),
            new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, toneMapped: false })
          )
          screenPlane.position.copy(displayCenter).addScaledVector(normal, Math.max(.03, normal.z !== 0 ? displaySize.z / 2 + .012 : displaySize.x / 2 + .012))
          screenPlane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
          screenPlane.renderOrder = 2
          scene.add(screenPlane)
          detail.classList.add('has-3d-screen')
          showProjectOnMonitor(projects[projectIndex], mediaHost.querySelector('video'))
        }
      } else {
        monitorHitObject = null
        document.getElementById('monitor-hint').hidden = true
      }
      rebuildHoverObjects()
      loadingGate.ready('room')
    }, event => { if (event.total > 0) loadingGate.progress('room', event.loaded / event.total) }, error => loadingGate.fail('room', error))
  }).catch(error => loadingGate.fail('room', error))
}

// Replace these demo previews with your own image or video paths in dist/media/.
// For video: media: {type:'video',src:'./media/my-work.mp4',poster:'./media/my-work.jpg'}.
const projects = [
  { category: '3D Model', title: 'Soft Drink', subtitle: '3D', tags: ['3D Model', 'Video'], description: 'งานแอนิเมชันโฆษณาที่เกี่ยวกับผลิตภัณฑ์เครื่องดื่มผลไม้', media: { type: 'video', src: './media/Khem Soft Drink.mp4' }, thumbnail: './media/Khem Soft Drink.png' },
  { category: '3D Model', title: 'BMW Model', subtitle: 'Interface Design', tags: ['3D'], description: 'งานปั้นโมเดลรถ', media: { type: 'image', src: './media/KhemBMW.jpg' }, thumbnail: './media/KhemBMW.jpg' },
  { category: 'Artwork', title: 'Banner Facebook Group', subtitle: '2D', tags: ['Banner', 'Artwork'], description: 'งานออกแบบ Banner เกม MLBB สำหรับ Facebook Group', media: { type: 'Artwork', src: './media/ปกกลุ่มเฟส.png' }, thumbnail: './media/ปกกลุ่มเฟส.png' },
  { category: 'Artwork', title: 'Banner Page', subtitle: '2D', tags: ['Banner', 'Artwork'], description: 'งานออกแบบ Banner เกม MLBB สำหรับ Facebook Page', media: { type: 'Artwork', src: './media/รับซื้อไอดี2.png' }, thumbnail: './media/รับซื้อไอดี2.png' },
  { category: 'Artwork', title: 'Cover Page Facebook', subtitle: '2D', tags: ['Banner', 'Artwork'], description: 'งานออกแบบหน้าปกเกม MLBB สำหรับ Facebook Page', media: { type: 'Artwork', src: './media/ปกเฟสแบบ3.png' }, thumbnail: './media/ปกเฟสแบบ3.png' },
  { category: 'Other', title: 'Typography', subtitle: '2D', tags: ['Design System'], description: 'Design System ที่ใช้กับเว็บไซต์นี้', media: { type: 'Design System', src: './media/Typography.png' }, thumbnail: './media/Typography.png' },
  { category: 'Other', title: 'Colors', subtitle: '2D', tags: ['Design System'], description: 'Design System ที่ใช้กับเว็บไซต์นี้', media: { type: 'Design System', src: './media/Colors.png' }, thumbnail: './media/Colors.png' },
  { category: 'Other', title: 'Grid and Indention', subtitle: '2D', tags: ['Design System'], description: 'Design System ที่ใช้กับเว็บไซต์นี้', media: { type: 'Design System', src: './media/Grid and Indention.png' }, thumbnail: './media/Grid and Indention.png' },

]
let projectIndex = 0
let activeView = 'room', viewRevealTimer = null, pendingViewReveal = null
let focused = false, moving = false, moveStart = 0, fromPosition = new THREE.Vector3(), fromTarget = new THREE.Vector3()
let toPosition = new THREE.Vector3(), toTarget = new THREE.Vector3()
let visualAngle = 0, visualPitch = 0, pointerDown = null
const detail = document.getElementById('detail')
const mediaHost = document.getElementById('project-media')
let activeMonitorTexture = null
function showProjectOnMonitor(project, video) {
  if (!screenPlane) return
  if (activeMonitorTexture) activeMonitorTexture.dispose()
  activeMonitorTexture = project.media.type === 'video' && video
    ? new THREE.VideoTexture(video)
    : new THREE.TextureLoader().load(project.media.type === 'video' ? project.media.poster || project.thumbnail : project.media.src)
  activeMonitorTexture.colorSpace = THREE.SRGBColorSpace
  screenPlane.material.map = activeMonitorTexture
  screenPlane.material.needsUpdate = true
}
// Full image viewer; native dialog handles focus trapping and Escape.
const imageViewer = document.getElementById('image-viewer')
const viewerImage = document.getElementById('viewer-image')
const viewerViewport = document.getElementById('viewer-viewport')
let viewerScale = 1, viewerX = 0, viewerY = 0, viewerDrag = null
function paintViewer() {
  viewerImage.style.transform = `translate(${viewerX}px, ${viewerY}px) scale(${viewerScale})`
  document.getElementById('viewer-zoom').textContent = `${Math.round(viewerScale * 100)}%`
}
function resetViewer() { viewerScale = 1; viewerX = viewerY = 0; viewerDrag = null; paintViewer() }
function zoomViewer(next) {
  const old = viewerScale
  viewerScale = Math.max(1, Math.min(5, next))
  viewerX *= viewerScale / old; viewerY *= viewerScale / old
  if (viewerScale === 1) viewerX = viewerY = 0
  paintViewer()
}
function openImageViewer(project) {
  viewerImage.src = project.media.src; viewerImage.alt = `ผลงาน ${project.title}`
  document.getElementById('viewer-title').textContent = project.title
  resetViewer(); imageViewer.showModal()
}
imageViewer.addEventListener('close', () => { viewerDrag = null; viewerImage.removeAttribute('src') })
document.getElementById('viewer-close').addEventListener('click', () => imageViewer.close())
document.getElementById('viewer-plus').addEventListener('click', () => zoomViewer(viewerScale + .25))
document.getElementById('viewer-minus').addEventListener('click', () => zoomViewer(viewerScale - .25))
document.getElementById('viewer-reset').addEventListener('click', resetViewer)
viewerViewport.addEventListener('wheel', e => {
  e.preventDefault(); zoomViewer(viewerScale * Math.exp(-e.deltaY * .0015))
}, { passive: false })
viewerViewport.addEventListener('dblclick', () => viewerScale > 1 ? resetViewer() : zoomViewer(2))
viewerViewport.addEventListener('pointerdown', e => {
  if (e.button !== 0 || viewerScale <= 1) return
  viewerDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: viewerX, startY: viewerY }
  viewerViewport.setPointerCapture(e.pointerId)
})
viewerViewport.addEventListener('pointermove', e => {
  if (!viewerDrag || viewerDrag.id !== e.pointerId) return
  viewerX = viewerDrag.startX + e.clientX - viewerDrag.x
  viewerY = viewerDrag.startY + e.clientY - viewerDrag.y
  paintViewer()
})
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  viewerViewport.addEventListener(event, () => { viewerDrag = null })
}
window.addEventListener('resize', () => { if (imageViewer.open) resetViewer() })

function makeProjectButton(project, index, filmstrip = false) {
  const button = document.createElement('button')
  button.type = 'button'
  button.dataset.projectIndex = String(index)
  button.className = filmstrip ? 'film-choice' : 'project-choice'
  button.setAttribute('aria-label', `เลือกผลงาน ${index + 1}: ${project.title}`)
  const thumb = document.createElement('img')
  thumb.src = project.thumbnail || project.media.poster || project.media.src
  thumb.alt = ''
  button.appendChild(thumb)
  if (!filmstrip) {
    const label = document.createElement('span'); label.className = 'choice-text'
    const title = document.createElement('strong'); title.textContent = project.title
    const type = document.createElement('small'); type.textContent = project.subtitle || project.category
    label.append(title, type); button.appendChild(label)
    const arrow = document.createElement('span'); arrow.className = 'choice-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true'); button.appendChild(arrow)
  }
  button.addEventListener('click', () => { projectIndex = index; updateProject() })
  return button
}
const picker = document.getElementById('project-picker'), filmstrip = document.getElementById('project-filmstrip')
const categories = ['All Project', '3D Model', 'Artwork', 'Other']
let activeCategory = 'All Project'

function visibleProjectIndices() {
  return projects
    .map((project, index) => index)
    .filter(index =>
      activeCategory === 'All Project' ||
      projects[index].category === activeCategory
    )
}

function renderCategories() {
  picker.replaceChildren()

  categories.forEach(category => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = activeCategory === category
      ? 'project-choice is-active'
      : 'project-choice'
    button.textContent = category

    button.addEventListener('click', () => {
      activeCategory = category
      const visible = visibleProjectIndices()
      if (visible.length) projectIndex = visible[0]
      renderCategories()
      renderFilmstrip()
      updateProject()
    })

    picker.appendChild(button)
  })
}

function renderFilmstrip() {
  filmstrip.replaceChildren()
  visibleProjectIndices().forEach(index => {
    filmstrip.appendChild(makeProjectButton(projects[index], index, true))
  })
  document.getElementById('project-total').textContent =
    String(visibleProjectIndices().length).padStart(2, '0')
}

renderCategories()
renderFilmstrip()

document.getElementById('project-total').textContent = String(projects.length).padStart(2, '0')
function stepProject(direction) {
  const visible = visibleProjectIndices()
  if (!visible.length) return
  const current = Math.max(0, visible.indexOf(projectIndex))
  projectIndex = visible[(current + direction + visible.length) % visible.length]
  updateProject()
}
function updateProject() {
  const visible = visibleProjectIndices()
  if (visible.length && !visible.includes(projectIndex)) projectIndex = visible[0]
  const localIndex = visible.indexOf(projectIndex)
  const count = `${String(localIndex + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`
  document.getElementById('counter').textContent = count
  document.getElementById('project-step').textContent = count
  document.getElementById('project-total').textContent = String(visible.length).padStart(2, '0')
  document.getElementById('prev-button').disabled = visible.length < 2
  document.getElementById('next-button').disabled = visible.length < 2
  if (!visible.length) {
    mediaHost.querySelector('video')?.pause()
    mediaHost.replaceChildren()
    const empty = document.createElement('p'); empty.className = 'project-empty'
    empty.textContent = 'ยังไม่มีผลงานในหมวดนี้'; mediaHost.appendChild(empty)
    document.getElementById('project-category').textContent = activeCategory
    document.getElementById('project-title').textContent = 'Coming soon'
    document.getElementById('project-description').textContent = ''
    document.getElementById('project-index').textContent = 'PROJECT 00'
    document.getElementById('media-kind').textContent = ''
    document.getElementById('project-tags').replaceChildren()
    document.getElementById('video-actions').hidden = true
    if (screenPlane) { screenPlane.material.map = null; screenPlane.material.needsUpdate = true }
    return
  }
  const p = projects[projectIndex]
  document.getElementById('project-category').textContent = p.category
  document.getElementById('project-title').textContent = p.title
  document.getElementById('project-description').textContent = p.description
  document.getElementById('project-index').textContent = `PROJECT ${String(localIndex + 1).padStart(2, '0')}`
  document.getElementById('media-kind').textContent = p.media.type === 'video' ? 'VIDEO PREVIEW' : 'IMAGE PREVIEW'
  const tags = document.getElementById('project-tags'); tags.replaceChildren()
  for (const tag of p.tags || []) { const chip = document.createElement('span'); chip.textContent = tag; tags.appendChild(chip) }
  mediaHost.querySelector('video')?.pause()
  let media
  if (p.media.type === 'video') {
    media = document.createElement('video')
    media.src = p.media.src; media.poster = p.media.poster || p.thumbnail || ''
    media.controls = true; media.muted = true; media.loop = true; media.playsInline = true; media.autoplay = loadingGate.isFinished
  } else {
    media = document.createElement('img'); media.src = p.media.src; media.alt = `ตัวอย่างผลงาน ${p.title}`
  }
  if (p.media.type !== 'video') {
    const open = document.createElement('button'); open.type = 'button'
    open.className = 'image-preview-button'; open.setAttribute('aria-label', `ดูและซูมรูป ${p.title}`)
    open.appendChild(media); open.addEventListener('click', () => openImageViewer(p, open))
    mediaHost.replaceChildren(open)
  } else mediaHost.replaceChildren(media)
  watchStartupMedia(media)
  if (p.media.type === 'video' && loadingGate.isFinished) media.play().catch(() => { })
  document.getElementById('video-actions').hidden = p.media.type !== 'video'
  document.getElementById('video-toggle').textContent = 'หยุดวิดีโอชั่วคราว'
  document.getElementById('audio-toggle').textContent = 'เปิดเสียง'
  showProjectOnMonitor(p, p.media.type === 'video' ? media : null)
  for (const button of filmstrip.children) {
    const selected = Number(button.dataset.projectIndex) === projectIndex
    button.classList.toggle('is-active', selected)
    button.setAttribute('aria-pressed', String(selected))
  }
}
updateProject()
window.addEventListener('portfolio-ready', () => {
  mediaHost.querySelector('video')?.play().catch(() => { })
}, { once: true })
function moveCamera(position, target) {
  resetHover(true)
  fromPosition.copy(camera.position); fromTarget.copy(currentTarget)
  toPosition.copy(position); toTarget.copy(target)
  moveStart = performance.now(); moving = true
}
// Frame the board straight on; leave space to the left of the plant.
function fitObjectViews() {
  resetHover(true)
  for (const [name, view] of Object.entries(objectViews)) {
    if (!view.object || view.edited) continue
    const bounds = new THREE.Box3().setFromObject(view.frameObject || view.object)
    const center = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3())
    const normal = view.normal.clone().normalize()
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize()
    const width = Math.abs(right.x) * size.x + Math.abs(right.z) * size.z
    const depth = Math.abs(normal.x) * size.x + Math.abs(normal.z) * size.z
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const coverage = name === 'board' ? .80 : name === 'books' ? .68 : .55
    const widthCoverage = camera.aspect < 1 && name !== 'board' ? .60 : .82
    const distance = Math.max(size.y / (2 * tan * coverage), width / (2 * tan * camera.aspect * widthCoverage)) + depth / 2
    view.target.copy(center)
    if (name === 'plant') view.target.addScaledVector(right, -distance * tan * camera.aspect * (camera.aspect < 1 ? .28 : .55))
    if (name === 'books') view.target.addScaledVector(right, distance * tan * camera.aspect * (camera.aspect < 1 ? .22 : .55))
    view.position.copy(view.target).addScaledVector(normal, distance)
  }
}
const objectDetail = document.getElementById('object-detail')
const aboutPanel = document.getElementById('about-panel')
function revealObjectUi(name) {
  if (activeView !== name) return
  aboutPanel.hidden = name !== 'board'
  objectDetail.hidden = false
  objectDetail.classList.add('is-visible')
  document.getElementById('object-view-label').textContent = ({ board: 'About', plant: 'Contact', books: 'Services' })[name]
  document.getElementById('object-back-button').focus({ preventScroll: true })
}
function setView(name) {
  if (activeView === name || (objectViews[name] && !objectViews[name].object)) return
  window.clearTimeout(viewRevealTimer)
  pendingViewReveal = null
  activeView = name; focused = name !== 'room'
  visualAngle = 0; visualPitch = 0
  detail.classList.remove('is-visible'); detail.setAttribute('aria-hidden', 'true'); detail.inert = true
  objectDetail.hidden = true
  objectDetail.classList.remove('is-visible')
  aboutPanel.hidden = true
  document.body.classList.toggle('focused', focused)
  document.body.dataset.view = name
  mediaHost.querySelector('video')?.pause()
  if (name === 'room') {
    moveCamera(roomPosition, roomTarget)
    document.getElementById('enter-button').focus({ preventScroll: true })
    return
  }
  if (name === 'work') {
    moveCamera(focusPosition, focusTarget)
    mediaHost.querySelector('video')?.play().catch(() => { })
  } else {
    const view = objectViews[name]
    moveCamera(view.position, view.target)
  }
  if (name === 'board') { pendingViewReveal = name; return }
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1250
  viewRevealTimer = window.setTimeout(() => {
    if (activeView !== name) return
    if (name === 'work') {
      detail.inert = false; detail.setAttribute('aria-hidden', 'false'); detail.classList.add('is-visible')
      document.getElementById('back-button').focus({ preventScroll: true })
    } else {
      revealObjectUi(name)
    }
  }, name === 'work' ? 800 : duration)
}
function enter() { setView('work') }
function exit() { setView('room') }
detail.inert = true
for (const name of ['board', 'plant', 'books']) document.getElementById('nav-' + name).addEventListener('click', () => setView(name))
document.getElementById('object-back-button').addEventListener('click', exit)
document.getElementById('enter-button').addEventListener('click', enter)
document.getElementById('nav-work').addEventListener('click', enter)
document.getElementById('about-work-button').addEventListener('click', enter)
document.getElementById('monitor-hint').addEventListener('click', enter)
document.getElementById('back-button').addEventListener('click', exit)
document.getElementById('brand').addEventListener('click', e => { e.preventDefault(); exit() })
document.getElementById('next-button').addEventListener('click', () => { stepProject(1) })
document.getElementById('prev-button').addEventListener('click', () => { stepProject(-1) })
document.getElementById('video-toggle').addEventListener('click', () => {
  const video = mediaHost.querySelector('video'); if (!video) return
  if (video.paused) { video.play().catch(() => { }); document.getElementById('video-toggle').textContent = 'หยุดวิดีโอชั่วคราว' }
  else { video.pause(); document.getElementById('video-toggle').textContent = 'เล่นวิดีโอ' }
})
document.getElementById('audio-toggle').addEventListener('click', () => {
  const video = mediaHost.querySelector('video'); if (!video) return
  video.muted = !video.muted
  document.getElementById('audio-toggle').textContent = video.muted ? 'เปิดเสียง' : 'ปิดเสียง'
})
document.addEventListener('keydown', e => {
  if (imageViewer.open) return
  if (e.shiftKey && e.key.toLowerCase() === 'c' && !e.target.closest?.('input,textarea')) { e.preventDefault(); cameraEditor.toggle(); return }
  if (e.target.closest?.('.camera-editor')) return
  if (e.key === 'Escape') exit()
  if (activeView === 'work' && e.key === 'ArrowRight') { stepProject(1) }
  if (activeView === 'work' && e.key === 'ArrowLeft') { stepProject(-1) }
})

// Open with ?cameraDebug=1 (or Shift+C), adjust the view, then paste the code in VS Code.
function createCameraEditor() {
  const panel = document.createElement('aside')
  panel.className = 'camera-editor'; panel.hidden = true
  panel.setAttribute('aria-label', 'เครื่องมือปรับกล้อง')
  panel.innerHTML = `
    <div class="camera-editor-head"><strong>CAMERA EDITOR</strong><button type="button" data-close aria-label="ปิดเครื่องมือ">×</button></div>
    <p>ลากฉากเพื่อหมุน · Shift + ลากเพื่อเลื่อน · หมุนล้อเมาส์เพื่อซูม</p>
    <div class="camera-editor-tabs"><button type="button" data-mode="room">มุมห้อง</button><button type="button" data-mode="focus">มุมจอคอม</button><button type="button" data-mode="board">มุมกระดาน</button><button type="button" data-mode="plant">มุมต้นไม้</button><button type="button" data-mode="books">มุมชั้นหนังสือ</button></div>
    <div class="camera-editor-grid">
      <span>ตำแหน่งกล้อง</span><label>X<input type="number" step="0.05" data-vector="position" data-axis="x"></label><label>Y<input type="number" step="0.05" data-vector="position" data-axis="y"></label><label>Z<input type="number" step="0.05" data-vector="position" data-axis="z"></label>
      <span>จุดที่มอง</span><label>X<input type="number" step="0.05" data-vector="target" data-axis="x"></label><label>Y<input type="number" step="0.05" data-vector="target" data-axis="y"></label><label>Z<input type="number" step="0.05" data-vector="target" data-axis="z"></label>
    </div>
    <div class="camera-editor-distance">ระยะกล้อง <output data-distance></output></div>
    <label class="camera-editor-code-label">แทนที่บรรทัดกล้องเดิมใน studio.js<textarea data-code readonly rows="4" spellcheck="false"></textarea></label>
    <button type="button" class="camera-copy" data-copy>คัดลอกค่ากล้องทั้งห้ามุม</button>
    <small>ค่าที่ลองบนหน้านี้จะรีเซ็ตเมื่อรีเฟรช จึงควรคัดลอกก่อนปิดหน้า</small>`
  document.body.appendChild(panel)
  const api = { enabled: false, mode: 'room' }
  const fixed = value => Number(value.toFixed(3))
  const line = (name, vector) => `const ${name} = new THREE.Vector3(${fixed(vector.x)}, ${fixed(vector.y)}, ${fixed(vector.z)})`
  const selected = () => api.mode === 'room' ? { position: roomPosition, target: roomTarget } : api.mode === 'focus' ? { position: focusPosition, target: focusTarget } : objectViews[api.mode]
  function showView(preserveInput = false) {
    moving = false; visualAngle = 0; visualPitch = 0
    const view = selected()
    camera.position.copy(view.position); currentTarget.copy(view.target); camera.lookAt(currentTarget)
    api.refresh(preserveInput)
  }
  api.refresh = (preserveInput = false) => {
    const view = selected()
    for (const input of panel.querySelectorAll('input[data-vector]')) {
      if (preserveInput && input === document.activeElement) continue
      input.value = fixed(view[input.dataset.vector][input.dataset.axis])
    }
    panel.querySelector('[data-distance]').textContent = fixed(view.position.distanceTo(view.target))
    panel.querySelector('[data-code]').value = [line('roomPosition', roomPosition), line('roomTarget', roomTarget), line('focusPosition', focusPosition), line('focusTarget', focusTarget), line('boardPosition', boardPosition), line('boardTarget', boardTarget), line('plantPosition', plantPosition), line('plantTarget', plantTarget), line('booksPosition', booksPosition), line('booksTarget', booksTarget), 'const AUTO_FIT_OBJECT_VIEWS = false'].join('\n')
    for (const button of panel.querySelectorAll('[data-mode]')) button.classList.toggle('is-active', button.dataset.mode === api.mode)
  }
  api.toggle = (state = !api.enabled) => { resetHover(true); api.enabled = state; panel.hidden = !state; if (state) { api.mode = activeView === 'work' ? 'focus' : activeView; showView() } else { const view = activeView === 'room' ? { position: roomPosition, target: roomTarget } : activeView === 'work' ? { position: focusPosition, target: focusTarget } : objectViews[activeView]; moveCamera(view.position, view.target) } }
  api.drag = (event, start) => {
    const dx = event.clientX - start.x, dy = event.clientY - start.y
    const view = selected()
    if (objectViews[api.mode]) view.edited = true
    if (event.shiftKey || start.pan) {
      const distance = start.position.distanceTo(start.target)
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(start.rotation)
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(start.rotation)
      const delta = right.multiplyScalar(-dx * distance * .0015).add(up.multiplyScalar(dy * distance * .0015))
      view.position.copy(start.position).add(delta); view.target.copy(start.target).add(delta)
    } else {
      const orbit = new THREE.Spherical().setFromVector3(start.position.clone().sub(start.target))
      orbit.theta -= dx * .006
      orbit.phi = THREE.MathUtils.clamp(orbit.phi + dy * .006, .07, Math.PI - .07)
      view.position.copy(start.target).add(new THREE.Vector3().setFromSpherical(orbit))
    }
    showView()
  }
  api.zoom = deltaY => {
    if (objectViews[api.mode]) objectViews[api.mode].edited = true
    const view = selected(), offset = view.position.clone().sub(view.target)
    offset.setLength(THREE.MathUtils.clamp(offset.length() * Math.exp(deltaY * .001), .35, 40))
    view.position.copy(view.target).add(offset); showView()
  }
  for (const button of panel.querySelectorAll('[data-mode]')) button.addEventListener('click', () => {
    api.mode = button.dataset.mode
    setView(api.mode === 'focus' ? 'work' : api.mode)
    showView()
  })
  for (const input of panel.querySelectorAll('input[data-vector]')) input.addEventListener('input', () => {
    const value = Number(input.value)
    if (input.value === '' || !Number.isFinite(value)) return
    if (objectViews[api.mode]) objectViews[api.mode].edited = true
    selected()[input.dataset.vector][input.dataset.axis] = value
    showView(true)
  })
  panel.querySelector('[data-close]').addEventListener('click', () => api.toggle(false))
  panel.querySelector('[data-copy]').addEventListener('click', async () => {
    const code = panel.querySelector('[data-code]')
    try { await navigator.clipboard.writeText(code.value) }
    catch { code.focus(); code.select(); document.execCommand('copy') }
    panel.querySelector('[data-copy]').textContent = 'คัดลอกแล้ว — วางค่ากล้อง 10 บรรทัดและ AUTO_FIT_OBJECT_VIEWS'
    window.setTimeout(() => { panel.querySelector('[data-copy]').textContent = 'คัดลอกค่ากล้องทั้งห้ามุม' }, 2500)
  })
  return api
}
cameraEditor = createCameraEditor()
if (new URLSearchParams(location.search).get('cameraDebug') === '1') cameraEditor.toggle(true)

// Scale a dedicated world-space pivot, so imported off-center origins never drift.
const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2()
const hoverObjects = []
const hoverLabel = document.createElement('div')
hoverLabel.className = 'hover-hologram'
hoverLabel.setAttribute('aria-hidden', 'true')
hoverLabel.innerHTML = `<div class="hover-hologram-card"><div class="hover-hologram-kicker"><span><i></i> EXPLORE</span><span data-holo-number></span></div><div class="hover-hologram-heading"><strong data-holo-title></strong><span class="hover-hologram-arrow">↗</span></div><span class="hover-hologram-hint" data-holo-hint></span><div class="hover-hologram-foot"><span>CLICK TO OPEN</span><span>+</span></div></div><span class="hover-hologram-beam"></span><span class="hover-hologram-point"></span>`
document.getElementById('app').appendChild(hoverLabel)
let hoverLabelName = null
const labelBounds = new THREE.Box3(), labelAnchor = new THREE.Vector3()
function hideHoverLabel() { hoverLabel.classList.remove('is-visible'); hoverLabelName = null }
function updateHoverLabel(item) {
  if (!item) { hideHoverLabel(); return }
  const root = item.name === 'work' ? monitorHitObject : objectViews[item.name].frameObject || objectViews[item.name].object
  labelBounds.setFromObject(root)
  labelBounds.getCenter(labelAnchor); labelAnchor.y = labelBounds.max.y
  labelAnchor.project(camera)
  if (labelAnchor.z < -1 || labelAnchor.z > 1 || Math.abs(labelAnchor.x) > 1 || Math.abs(labelAnchor.y) > 1) { hideHoverLabel(); return }
  if (hoverLabelName !== item.name) {
    const label = HOVER_LABELS[item.name]
    hoverLabel.querySelector('[data-holo-title]').textContent = label.title
    hoverLabel.querySelector('[data-holo-number]').textContent = label.number
    hoverLabel.querySelector('[data-holo-hint]').textContent = label.hint
    hoverLabelName = item.name
  }
  const canvasBounds = renderer.domElement.getBoundingClientRect()
  const appBounds = document.getElementById('app').getBoundingClientRect()
  const halfWidth = (hoverLabel.offsetWidth || 186) / 2
  const height = hoverLabel.offsetHeight || 132
  const x = (labelAnchor.x + 1) / 2 * canvasBounds.width + canvasBounds.left - appBounds.left
  const anchorY = (1 - labelAnchor.y) / 2 * canvasBounds.height + canvasBounds.top - appBounds.top
  // เว้นพื้นที่ให้เมนูด้านบน
  const header = document.querySelector('.topbar')
  const safeTop = Math.max(
    16,
    (header?.getBoundingClientRect().bottom ?? appBounds.top)
    - appBounds.top + 12
  )

  // ถ้าด้านบนวางป้ายไม่พอ ให้ป้ายย้ายมาอยู่ใต้วัตถุ
  const below = anchorY - 44 - height < safeTop

  hoverLabel.classList.toggle('is-below', below)
  const y = below ? anchorY + 44 + height : anchorY - 44
  hoverLabel.style.left = THREE.MathUtils.clamp(x, halfWidth + 14, appBounds.width - halfWidth - 14) + 'px'
  hoverLabel.style.top = THREE.MathUtils.clamp(
    y,
    height + safeTop,
    appBounds.height - 54
  ) + 'px'

  // Let the connecting beam point toward the object even near a viewport edge.
  const left = parseFloat(hoverLabel.style.left)
  hoverLabel.style.setProperty('--holo-point-x', THREE.MathUtils.clamp(x - left, -halfWidth + 12, halfWidth - 12) + 'px')
  hoverLabel.classList.add('is-visible')
}
let hoveredObject = null, hoverPointer = null, hoverTime = 0
function isObjectVisible(object) {
  for (let node = object; node; node = node.parent) if (!node.visible) return false
  return true
}
function containsObject(root, object) {
  for (let node = object; node; node = node.parent) if (node === root) return true
  return false
}
function resetHover(immediate = false) {
  hideHoverLabel(); hoveredObject = null; renderer.domElement.style.cursor = ''
  if (immediate) for (const item of hoverObjects) item.pivot.scale.setScalar(1)
  scene.updateMatrixWorld(true)
}
function rebuildHoverObjects() {
  resetHover(true)
  for (const item of hoverObjects) {
    for (const child of [...item.pivot.children]) scene.attach(child)
    item.pivot.removeFromParent()
  }
  hoverObjects.length = 0
  const objects = [['work', monitorHitObject], ...Object.entries(objectViews).map(([name, view]) => [name, view.object])]
  for (const [name, object] of objects) {
    if (!object || !isObjectVisible(object)) continue
    const pivot = new THREE.Group(); pivot.name = 'Hover_' + name
    pivot.position.copy(new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()))
    scene.add(pivot); pivot.attach(object)
    if (name === 'work' && screenPlane) pivot.attach(screenPlane)
    hoverObjects.push({ name, pivot })
  }
  scene.updateMatrixWorld(true)
}
function pickRoomObject(clientX, clientY) {
  const bounds = renderer.domElement.getBoundingClientRect()
  mouse.set((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1)
  scene.updateMatrixWorld(true); raycaster.setFromCamera(mouse, camera)
  // Respect scene occlusion and hidden fallback objects.
  const hit = raycaster.intersectObjects(scene.children, true).find(hit => isObjectVisible(hit.object))
  return hit ? hoverObjects.find(item => containsObject(item.pivot, hit.object)) || null : null
}
function updateHover(time) {
  const dt = hoverTime ? Math.min((time - hoverTime) / 1000, .1) : 1 / 60; hoverTime = time
  const enabled = hoverPointer && !focused && !moving && !pointerDown && !cameraEditor.enabled
  hoveredObject = enabled ? pickRoomObject(hoverPointer.x, hoverPointer.y) : null
  renderer.domElement.style.cursor = hoveredObject ? 'pointer' : ''
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const blend = reduced ? 1 : 1 - Math.exp(-HOVER_SPEED * dt)
  for (const item of hoverObjects) {
    const target = item === hoveredObject ? HOVER_SCALE : 1
    const scale = THREE.MathUtils.lerp(item.pivot.scale.x, target, blend)
    item.pivot.scale.setScalar(Math.abs(scale - target) < .0001 ? target : scale)
  }
  scene.updateMatrixWorld(true)
  updateHoverLabel(hoveredObject)
}
rebuildHoverObjects()
renderer.domElement.addEventListener('pointerdown', e => {
  if (cameraEditor.enabled) {
    pointerDown = { x: e.clientX, y: e.clientY, position: camera.position.clone(), target: currentTarget.clone(), rotation: camera.quaternion.clone(), pan: e.shiftKey }
    renderer.domElement.setPointerCapture(e.pointerId)
    return
  }
  pointerDown = { x: e.clientX, y: e.clientY, angle: visualAngle, pitch: visualPitch }
})
renderer.domElement.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') hoverPointer = { x: e.clientX, y: e.clientY }
  if (cameraEditor.enabled) { if (pointerDown) cameraEditor.drag(e, pointerDown); return }
  if (!pointerDown || focused || moving) return
  visualAngle = THREE.MathUtils.clamp(pointerDown.angle + (e.clientX - pointerDown.x) * .00045, -.18, .18)
  visualPitch = THREE.MathUtils.clamp(pointerDown.pitch + (e.clientY - pointerDown.y) * .0003, -.1, .1)
})
renderer.domElement.addEventListener('pointerup', e => {
  if (!pointerDown) return
  if (cameraEditor.enabled) { pointerDown = null; return }
  const dragged = Math.hypot(e.clientX - pointerDown.x, e.clientY - pointerDown.y) > 9
  pointerDown = null
  if (dragged || focused || moving) return
  const hit = pickRoomObject(e.clientX, e.clientY)
  if (hit) setView(hit.name)
})
renderer.domElement.addEventListener('pointercancel', () => { pointerDown = null; hoverPointer = null; resetHover() })
renderer.domElement.addEventListener('pointerleave', () => { pointerDown = null; hoverPointer = null; resetHover() })
renderer.domElement.addEventListener('wheel', e => { if (!cameraEditor.enabled) return; e.preventDefault(); cameraEditor.zoom(e.deltaY) }, { passive: false })
function resize() { resetHover(true); const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.fov = w < 600 ? 56 : w < 900 ? 48 : 42; camera.updateProjectionMatrix(); fitObjectViews(); if (!cameraEditor?.enabled && objectViews[activeView]?.object) moveCamera(objectViews[activeView].position, objectViews[activeView].target) }
window.addEventListener('resize', resize); resize()

const tmpPosition = new THREE.Vector3(), tmpTarget = new THREE.Vector3()
function tick(time) {
  requestAnimationFrame(tick)
  if (cameraEditor.enabled) {
    renderer.render(scene, camera); reportStartupFrame(); return
  }
  if (moving) {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 1250
    const t = Math.min((time - moveStart) / duration, 1)
    const ease = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    camera.position.lerpVectors(fromPosition, toPosition, ease)
    currentTarget.lerpVectors(fromTarget, toTarget, ease)
    camera.lookAt(currentTarget)
    if (t >= 1) {
      moving = false; camera.position.copy(toPosition); currentTarget.copy(toTarget)
      if (pendingViewReveal) {
        const name = pendingViewReveal; pendingViewReveal = null
        revealObjectUi(name)
      }
    }
  } else if (!focused) {
    tmpPosition.copy(roomPosition).add(new THREE.Vector3(visualAngle * 8, -visualPitch * 5, visualAngle * 2))
    tmpTarget.copy(roomTarget).add(new THREE.Vector3(visualAngle * 3, -visualPitch * 2, 0))
    camera.position.lerp(tmpPosition, .04); currentTarget.lerp(tmpTarget, .04); camera.lookAt(currentTarget)
  }
  updateHover(time)
  renderer.render(scene, camera)
  reportStartupFrame()
}
requestAnimationFrame(tick)
if (!ROOM_MODEL_URL) loadingGate.ready('room')
function reportStartupFrame() {
  if (loadingGate.isReady('room') && loadingGate.isReady('media')) loadingGate.ready('frame')
}
