import { Vector2 } from "../Vector2"

function randomAngleDiff(divisions: number) {
  return (Math.random() - 0.5) * Math.PI * 2 / divisions * 0.5
}

/**
 * Generate points on hexagon and draw them. According to the depth paramete, it will recursively generate more points.
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
    const aPlus = angle + dAngle / 2
    const aMinus = angle - dAngle / 2
    const vAngle = new Vector2(Math.cos(angle), Math.sin(angle)).multiply(radius)
    const vN = new Vector2(Math.cos(aMinus) + randomAngleDiff(divisions), Math.sin(aMinus) + randomAngleDiff(divisions)).multiply(radius).add(center)
    const childPoints = genPointsRecursive(center.add(vAngle.multiply(2)), radius / 2, divisions, angle - Math.PI + dAngle, depth - 1)
    const vP = new Vector2(Math.cos(aPlus) + randomAngleDiff(divisions), Math.sin(aPlus) + randomAngleDiff(divisions)).multiply(radius).add(center)
    points.push(vN)
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

/**
 * Check if the two points (p1, p2) are on the same side of the line (a, b).
 * @param a 
 * @param b 
 * @param p1 
 * @param p2 
 * @returns 
 */
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

export function genPolygon(divisions: number, depth: number) {
  const center = new Vector2(0, 0)
  const radius = 1 / 7
  const points = genPointsRecursive(center, radius, divisions, 0, depth).reverse()
  // Generate triangles from the points of the base polygon.
  const pointIndices = points.map((_, i) => i)
  const triangles: number[][] = []
  while (pointIndices.length > 2) {
    // Find a triangle that the corner angle is closest to 90 degrees.
    const { index: i, triangle } = pointIndices.reduce((prev, _, i) => {
      const iP = pointIndices[i - 1] ?? pointIndices[pointIndices.length - 1]
      const iC = pointIndices[i]
      const iN = pointIndices[i + 1] ?? pointIndices[0]
      const p = points[iP]
      const c = points[iC]
      const n = points[iN]
      const vCP = p.sub(c)
      const vCN = n.sub(c)
      const angle = calcDiffAngle(vCP, vCN)
      console.log(angle)
      const diff = Math.abs(angle - Math.PI / 1.5)
      if (angle < Math.PI && diff < prev.diff) {
        const inTriangle = pointIndices.find((index) => {
          if (index === iP || index === iC || index === iN) return false
          return isPointInTriangle(p, c, n, points[index])
        }) !== undefined
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
    outline: points.reverse(),
    triangles,
  }
}