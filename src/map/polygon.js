export function pointInPolygon(latitude, longitude, ring) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    const currentLat = currentPoint[0];
    const currentLon = currentPoint[1];
    const previousLat = previousPoint[0];
    const previousLon = previousPoint[1];
    const intersects = (
      (currentLon > longitude) !== (previousLon > longitude) &&
      latitude < ((previousLat - currentLat) * (longitude - currentLon)) / (previousLon - currentLon) + currentLat
    );

    if (intersects) inside = !inside;
  }

  return inside;
}

export function pointInAnyPolygon(latitude, longitude, polygons = []) {
  if (polygons.length === 0) return true;
  return polygons.some((ring) => pointInPolygon(latitude, longitude, ring));
}

