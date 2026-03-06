/* ─── Haversine distance (km) ──────────────────────────────── */
function getDistance(lat1, lng1, lat2, lng2) {

  const R = 6371; // Earth radius km

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/* ─── Dot-product helper (flat approx.) ────────────────────── */
function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

/**
 * Project point P onto segment A→B and return the fraction t ∈ [0,1].
 * t = 0 → P is at A, t = 1 → P is at B.
 */
function projectOntoSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  const abLat = bLat - aLat;
  const abLng = bLng - aLng;
  const apLat = pLat - aLat;
  const apLng = pLng - aLng;

  const abLen2 = dot(abLat, abLng, abLat, abLng);
  if (abLen2 === 0) return 0; // A and B are the same point

  let t = dot(apLat, apLng, abLat, abLng) / abLen2;
  t = Math.max(0, Math.min(1, t)); // clamp to [0, 1]

  return t;
}

/**
 * Perpendicular distance (km) from point P to the line segment A→B.
 */
function distToSegment(pLat, pLng, aLat, aLng, bLat, bLng) {
  const t = projectOntoSegment(pLat, pLng, aLat, aLng, bLat, bLng);
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return getDistance(pLat, pLng, projLat, projLng);
}

/* ─── Main function ────────────────────────────────────────── */

/**
 * Find the next upcoming stop on the route.
 *
 * Uses route-segment projection + travel-direction analysis so it
 * always returns the stop the bus is heading *toward*, not the one
 * it just passed.
 *
 * @param {number}      busLat
 * @param {number}      busLng
 * @param {Array}       stops           - Route stops sorted by sequence (populated stopId)
 * @param {number|null} lastVisitedIndex - Index of the last stop the bus arrived at
 * @param {{ lat: number, lng: number }|null} prevLocation - Previous bus position (for heading)
 * @returns {{ stop: object, index: number } | null}
 */
function findNextStop(busLat, busLng, stops, lastVisitedIndex = null, prevLocation = null) {

  if (!stops || stops.length === 0) return null;

  /* ── A stop was already visited ────────────────────────────── */
  if (lastVisitedIndex !== null) {

    if (lastVisitedIndex < stops.length - 1) {
      const nextIdx = lastVisitedIndex + 1;
      return { stop: stops[nextIdx].stopId, index: nextIdx };
    }

    /* visited the last stop → return last stop */
    return {
      stop: stops[stops.length - 1].stopId,
      index: stops.length - 1
    };
  }

  /* ── No stop visited yet → route-direction based detection ─── */

  /*
   * STEP 1 — Find the closest *segment* (not stop).
   * A segment is the path between stops[i] and stops[i+1].
   */
  let bestSegIdx = 0;
  let bestSegDist = Infinity;
  let bestT = 0;  // projection fraction on the best segment

  for (let i = 0; i < stops.length - 1; i++) {

    const aLat = stops[i].stopId.location.lat;
    const aLng = stops[i].stopId.location.lng;
    const bLat = stops[i + 1].stopId.location.lat;
    const bLng = stops[i + 1].stopId.location.lng;

    const d = distToSegment(busLat, busLng, aLat, aLng, bLat, bLng);

    if (d < bestSegDist) {
      bestSegDist = d;
      bestSegIdx = i;
      bestT = projectOntoSegment(busLat, busLng, aLat, aLng, bLat, bLng);
    }
  }

  /* Also check distance to every individual stop (handles edge case
     where the bus is past the last segment or before the first). */
  let closestStopIdx = 0;
  let closestStopDist = Infinity;

  for (let i = 0; i < stops.length; i++) {
    const d = getDistance(
      busLat, busLng,
      stops[i].stopId.location.lat,
      stops[i].stopId.location.lng
    );
    if (d < closestStopDist) {
      closestStopDist = d;
      closestStopIdx = i;
    }
  }

  /*
   * STEP 2 — Determine travel direction using prevLocation.
   *
   * We compute a heading vector from prev → current and see whether
   * it aligns with the route's forward direction on the best segment.
   */
  let movingForward = true; // default assumption

  if (prevLocation) {

    const headLat = busLat - prevLocation.lat;
    const headLng = busLng - prevLocation.lng;

    /* route direction on the best segment */
    const segALat = stops[bestSegIdx].stopId.location.lat;
    const segALng = stops[bestSegIdx].stopId.location.lng;
    const segBLat = stops[bestSegIdx + 1].stopId.location.lat;
    const segBLng = stops[bestSegIdx + 1].stopId.location.lng;

    const routeLat = segBLat - segALat;
    const routeLng = segBLng - segALng;

    /* dot product > 0 → same direction → moving forward on route */
    movingForward = dot(headLat, headLng, routeLat, routeLng) >= 0;
  }

  /*
   * STEP 3 — Pick the next stop ahead of the bus.
   */

  /* Very close to a stop (< 100 m) → treat as "at that stop" */
  const AT_STOP_THRESHOLD = 0.1; // km

  if (closestStopDist < AT_STOP_THRESHOLD) {
    const nextIdx = Math.min(closestStopIdx + 1, stops.length - 1);
    return { stop: stops[nextIdx].stopId, index: nextIdx };
  }

  /* Bus is between stops[bestSegIdx] and stops[bestSegIdx + 1] */
  if (movingForward) {
    /*
     * Moving forward → next stop is the END of the current segment.
     * But if the bus has already passed > 95% of the segment,
     * target the stop after that (if it exists).
     */
    let idx = bestSegIdx + 1;

    if (bestT > 0.95 && idx < stops.length - 1) {
      idx = idx + 1;
    }

    return { stop: stops[idx].stopId, index: idx };
  }

  /*
   * Unusual: bus is moving *backward* along the segment.
   * This can happen if the driver is turning around or in a loop.
   * Still target the end of the segment (the route-forward stop)
   * so ETA stays sensible — the bus will turn around eventually.
   */
  const fallbackIdx = bestSegIdx + 1;
  return { stop: stops[fallbackIdx].stopId, index: fallbackIdx };
}

module.exports = findNextStop;
