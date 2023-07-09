import { Vector2 } from "./Vector2"

function randomAngleDiff(divisions: number) {
  return (Math.random() - 0.5) * Math.PI * 2 / divisions * 0.5
}

/**
 * Generate points on hexagons. According to the depth paramete, it will recursively generate more points.
 * The child hexagon are outside of the parent hexagon.
 */
function genPointsRecursive(
  center: Vector2,
  radius: number,
  divisions: number,
  startAngle: number,
  depth: number
): Vector2[] {
  if (divisions % 2 !== 0) {
    throw new Error("Divisions must be even")
  }
  if (depth === 0) {
    return []
  }
  const dAngle = Math.PI * 2 / divisions
  const points: Vector2[] = []
  for (let i = 0; i < divisions / 2; i++) {
    const angle = i * dAngle * 2 + startAngle
    const aMinus = angle - dAngle / 2
    const aPlus = angle + dAngle / 2
    const vAngle = new Vector2(Math.cos(angle), Math.sin(angle)).multiply(radius)
    const vM = new Vector2(Math.cos(aMinus) + randomAngleDiff(divisions), Math.sin(aMinus) + randomAngleDiff(divisions)).multiply(radius).add(center)
    const childPoints = genPointsRecursive(center.add(vAngle.multiply(2)), radius / 2, divisions, angle - Math.PI + dAngle, depth - 1)
    const vP = new Vector2(Math.cos(aPlus) + randomAngleDiff(divisions), Math.sin(aPlus) + randomAngleDiff(divisions)).multiply(radius).add(center)
    points.push(vM)
    points.push(...childPoints)
    points.push(vP)
  }
  return points
}

/**
 * Calculate the angle between two vectors.
 */
function calcDiffAngle(v1: Vector2, v2: Vector2) {
  const sin = v1.normalize().cross(v2.normalize())
  const cos = v1.normalize().dot(v2.normalize())
  if (sin >= 0) {
    return Math.acos(cos)
  } else {
    return 2 * Math.PI - Math.acos(cos)
  }
}

function isSameSide(a: Vector2, b: Vector2, p1: Vector2, p2: Vector2) {
  const v1 = b.sub(a)
  const v2 = p1.sub(a)
  const v3 = p2.sub(a)
  const c1 = v1.cross(v2)
  const c2 = v1.cross(v3)
  return c1 * c2 >= 0
}

function isPointInTriangle(a: Vector2, b: Vector2, c: Vector2, p: Vector2) {
  return isSameSide(a, b, c, p) && isSameSide(b, c, a, p) && isSameSide(c, a, b, p)
}

export function genPolygon(
  divisions: number,
  depth: number,
) {
  const center = new Vector2(0, 0)
  const radius = 1 / 7
  // Generate points of the base polygon.
  const points = genPointsRecursive(center, radius, divisions, 0, depth)
  // Generate triangles from the points of the base polygon.
  const pointIndices = points.map((_, i) => i)
  const triangles: number[][] = []
  while (pointIndices.length > 2) {
    // Find a triangle that the corner angle is closest to 60 degrees.
    const { index: i, triangle } = pointIndices.reduce((prev, _, i) => {
      const iP = pointIndices[i - 1] ?? pointIndices[pointIndices.length - 1]
      const iC = pointIndices[i]
      const iN = pointIndices[i + 1] ?? pointIndices[0]
      const pP = points[iP]
      const pC = points[iC]
      const pN = points[iN]
      const vCP = pP.sub(pC)
      const vCN = pN.sub(pC)
      const angle = calcDiffAngle(vCN, vCP)
      const diff = Math.abs(angle - Math.PI / 3)
      if (angle < Math.PI && diff < prev.diff) {
        const inTriangle = pointIndices.some((index) => {
          if (index === iP || index === iC || index === iN) return false
          return isPointInTriangle(pP, pC, pN, points[index])
        })
        if (inTriangle) return prev
        return { diff, index: i, triangle: [iN, iC, iP] }
      } else {
        return prev
      }
    }, { diff: Infinity, index: null as number | null, triangle: null as null | number[] })
    if (i === null || !triangle) throw new Error("Failed to find the best index")
    pointIndices.splice(i, 1)
    triangles.push(triangle)
  }
  return {
    outline: points,
    triangles,
  }
}
