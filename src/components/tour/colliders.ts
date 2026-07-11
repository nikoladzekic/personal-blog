/**
 * Static collision AABBs for the tour room, in world space (XZ plane).
 * Footprints measured from the GLTF bounding boxes / component dimensions:
 * desk GLTF spans x ±1.002, z ±0.304 at 1.5× scale around [0, 0, -3.42].
 */

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const PLAYER_RADIUS = 0.35;

const ROOM = { minX: -5, maxX: 5, minZ: -4, maxZ: 4 };

export const COLLIDERS: ColliderBox[] = [
  // Desk (extends back to the wall)
  { minX: -1.55, maxX: 1.55, minZ: -4, maxZ: -2.92 },
  // Workbench
  { minX: -4.6, maxX: -2.2, minZ: -1.88, maxZ: -0.52 },
  // Bookshelf (against the right wall)
  { minX: 4.5, maxX: 5, minZ: -2.95, maxZ: -0.65 },
  // Chair
  { minX: 0.3, maxX: 1.0, minZ: -2.22, maxZ: -1.52 },
  // Arcade cabinet (right wall, faces -X; GLB footprint ×0.72 around [4.45, 0, 1.4])
  { minX: 3.8, maxX: 5, minZ: 1.0, maxZ: 1.8 },
];

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function overlaps(x: number, z: number, c: ColliderBox, r: number): boolean {
  return x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r;
}

/**
 * Move from (prevX, prevZ) by (dx, dz), sliding along walls and furniture.
 * Resolves each axis independently so grazing contact slides instead of sticking.
 */
export function resolveMovement(
  prevX: number,
  prevZ: number,
  dx: number,
  dz: number,
  r: number = PLAYER_RADIUS
): { x: number; z: number } {
  let x = clamp(prevX + dx, ROOM.minX + r, ROOM.maxX - r);
  if (dx !== 0) {
    for (const c of COLLIDERS) {
      if (overlaps(x, prevZ, c, r)) {
        x = dx > 0 ? c.minX - r : c.maxX + r;
      }
    }
  }

  let z = clamp(prevZ + dz, ROOM.minZ + r, ROOM.maxZ - r);
  if (dz !== 0) {
    for (const c of COLLIDERS) {
      if (overlaps(x, z, c, r)) {
        z = dz > 0 ? c.minZ - r : c.maxZ + r;
      }
    }
  }

  return { x, z };
}
