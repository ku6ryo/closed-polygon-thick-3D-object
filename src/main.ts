import "sanitize.css"
import styles from "./style.module.scss"
import { Vector2 } from "./Vector2"
import { genPolygon } from "./genPolygon"
import {
  Scene,
  Mesh,
  PerspectiveCamera,
  MeshPhysicalMaterial,
  WebGLRenderer,
  DirectionalLight,
  BufferAttribute,
  BufferGeometry,
  Texture
} from "three"

function drawCircle(ctx: CanvasRenderingContext2D, center: Vector2, radius: number, color: string = "red") {
  ctx.beginPath()
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}

async function drawClosedPath(ctx: CanvasRenderingContext2D, points: Vector2[], width: number = 1, color: string = "red", fillColor?: string) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.globalAlpha = 0.3
  if (fillColor) {
    ctx.fillStyle = fillColor
    ctx.fill()
  }
  ctx.stroke()
}

function genMeshesBtwTwoPathes(path1: number[], path2: number[]) {
  if (path1.length !== path2.length) {
    throw new Error("Pathes must have the same length")
  }
  const triangles: number[][] = []
  for (let i = 0; i < path1.length; i++) {
    const p11 = path1[i]
    const p12 = path1[(i + 1) % path1.length]
    const p21 = path2[i]
    const p22 = path2[(i + 1) % path1.length]
    triangles.push([p11, p12, p22])
    triangles.push([p11, p22, p21])
  }
  return triangles
}

;(async () => {
  // Main logic starts here.
  const appContainer = document.querySelector<HTMLButtonElement>("#app")
  if (!appContainer) throw new Error("No app container found")
  appContainer.classList.add(styles.app)

  const canvasSize = 600
  const threeCanvas = document.createElement("canvas")
  threeCanvas.width = canvasSize
  threeCanvas.height = canvasSize
  appContainer.appendChild(threeCanvas)

  const canvas = document.createElement("canvas")
  canvas.className = styles.canvas
  canvas.width = canvasSize
  canvas.height = canvasSize
  appContainer.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Failed to get canvas context")

  function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
  const divisions = 6
  const depth = 3
  const { triangles, outline, } = genPolygon(divisions, depth)
  const pointsForDraw = outline.map((v) => new Vector2(v.x * canvasSize + canvasSize / 2, - v.y * canvasSize + canvasSize / 2))
  await drawClosedPath(ctx, pointsForDraw, 3, "white")
  for (const p of pointsForDraw) {
    drawCircle(ctx, p, 5, "white")
    await delay(200)
  }
  for (let i = 0; i < triangles.length; i++) {
    const triangle = triangles[i]
    const p1 = pointsForDraw[triangle[0]]
    const p2 = pointsForDraw[triangle[1]]
    const p3 = pointsForDraw[triangle[2]]
    await drawClosedPath(ctx, [p1, p2, p3], 1, "red", "blue")
    await delay(200)
  }

  const scene = new Scene()
  const camera = new PerspectiveCamera(45, threeCanvas.width / threeCanvas.height, 0.1, 1000)
  camera.position.set(0, 1, 1)
  camera.lookAt(scene.position)

  const renderer = new WebGLRenderer({ antialias: true, canvas: threeCanvas })
  renderer.setClearColor(0xffffff, 1.0)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(threeCanvas.width, threeCanvas.height)

  const numLights = 3
  for (let i = 0; i < numLights; i++) {
    const light = new DirectionalLight(0xffffff)
    const phase = Math.PI * 2 / numLights * i
    light.position.set(Math.cos(phase) * 10, Math.sin(phase) * 10, 10)
    light.intensity = 0.5
    light.lookAt(scene.position)
    scene.add(light)
  }

  const texture = new Texture(canvas)
  texture.needsUpdate = true
  const mat = new MeshPhysicalMaterial({ metalness: 0.1, roughness: 0.5, map: texture })
  const numPoints = outline.length
  const thickness = 0.05

  const frontPoints = outline.map((v) => [v.x, v.y, -thickness / 2])
  const frontIndices = Array.from({ length: numPoints }).map((_, i) => i)
  const frontTris = triangles.map(t => [t[0], t[1], t[2]])
  const backPoints = outline.map((v) => [v.x, v.y, thickness / 2])
  const backIndices = Array.from({ length: numPoints }).map((_, i) => i + numPoints)
  const backTris = triangles.map(t => [t[0] + numPoints, t[2] + numPoints, t[1] + numPoints])

  function calcOval(a: number, b: number, phase: number) {
    return {
      x: a * Math.cos(phase),
      y: b * Math.sin(phase),
    }
  }
  const edgeDivisions = 6
  const edgePoints = [] as number[][][]
  const edgeIndices = [frontIndices] as number[][]
  for (let i = 0; i < edgeDivisions - 1; i++) {
    const points = outline.map((c, j) => {
      const p = j === 0 ? outline[outline.length - 1] : outline[j - 1]
      const n = outline[(j + 1) % outline.length]
      const vCP = p.sub(c)
      const vCN = n.sub(c)
      const sin = vCP.cross(vCN)
      const o = vCP.add(vCN).normalize().multiply(sin / Math.abs(sin))
      const phase = Math.PI / edgeDivisions * (i + 1)
      const { x, y } = calcOval(thickness / 2, thickness / 2, phase)
      const ot = o.multiply(y)
      return [c.x + ot.x, c.y + ot.y, -x]
    })
    const indices = Array.from({ length: numPoints }).map((_, j) => j + numPoints * 2 + i * numPoints)
    edgePoints.push(points)
    edgeIndices.push(indices)
  }
  edgeIndices.push(backIndices)
  const edgeTris = [] as number[][]
  for (let i = 0; i < edgeDivisions; i++) {
    const triangles = genMeshesBtwTwoPathes(edgeIndices[i], edgeIndices[i + 1])
    edgeTris.push(...triangles)
  }

  const allPoints = frontPoints.concat(backPoints).concat(edgePoints.flat())
  const allIndices = frontTris.concat(backTris).concat(edgeTris)
  const allUvs = [] as number[][]
  for (let i = 0; i < edgeDivisions + 1; i++) {
    allUvs.push(...outline.map((v) => [v.x + 0.5, v.y + 0.5]))
  }

  const geometry = new BufferGeometry()
  const vertices = new Float32Array(allPoints.flat())
  const indices = new Uint32Array(allIndices.flat())
  const uvs = new Float32Array(allUvs.flat())
  geometry.setAttribute("position", new BufferAttribute(vertices, 3))
  geometry.setIndex(new BufferAttribute(indices, 1))
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2))
  geometry.computeVertexNormals()

  const mesh = new Mesh(geometry, mat)
  scene.add(mesh)

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera)
    mesh.rotation.y += 0.01
  })
})()


