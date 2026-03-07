import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

/**
 * Google Maps-style smooth animated bus marker.
 *
 * Instead of jumping between socket coordinates, this lerps the marker
 * position over DURATION ms using requestAnimationFrame (60 fps glide).
 *
 * Props:
 *  - position  : [lat, lng]
 *  - icon      : L.Icon instance (optional, defaults to a bus icon)
 *  - duration  : animation duration in ms (default 2000)
 *  - popup     : ReactNode or string for popup content (optional)
 *  - children  : ignored
 */

const DEFAULT_BUS_ICON = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

export default function AnimatedBusMarker({
  position,
  icon = DEFAULT_BUS_ICON,
  duration = 2000,
  popupContent,
}) {
  const map = useMap();
  const markerRef = useRef(null);
  const animFrameRef = useRef(null);
  const startPosRef = useRef(null);
  const targetPosRef = useRef(null);
  const startTimeRef = useRef(null);

  /* ── Create marker once ── */
  useEffect(() => {
    const marker = L.marker(position || [0, 0], { icon }).addTo(map);
    markerRef.current = marker;
    startPosRef.current = position || [0, 0];
    targetPosRef.current = position || [0, 0];

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      map.removeLayer(marker);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  /* ── Update icon if it changes ── */
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(icon);
    }
  }, [icon]);

  /* ── Update popup ── */
  useEffect(() => {
    if (markerRef.current && popupContent) {
      markerRef.current.unbindPopup();
      markerRef.current.bindPopup(popupContent);
    }
  }, [popupContent]);

  /* ── Animate to new position on every position change ── */
  useEffect(() => {
    if (!position || !markerRef.current) return;

    const [newLat, newLng] = position;

    /* Current rendered position = animation start */
    const cur = markerRef.current.getLatLng();
    startPosRef.current = [cur.lat, cur.lng];
    targetPosRef.current = [newLat, newLng];
    startTimeRef.current = performance.now();

    /* cancel any running animation */
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;
      /* easeOutCubic for deceleration feel (like Google Maps) */
      let t = Math.min(elapsed / duration, 1);
      t = 1 - Math.pow(1 - t, 3); // easeOutCubic

      const [sLat, sLng] = startPosRef.current;
      const [tLat, tLng] = targetPosRef.current;

      const lat = sLat + (tLat - sLat) * t;
      const lng = sLng + (tLng - sLng) * t;

      markerRef.current.setLatLng([lat, lng]);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [position, duration]);

  return null; /* marker is managed imperatively via Leaflet API */
}
