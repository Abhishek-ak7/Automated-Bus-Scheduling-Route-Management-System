import { useEffect, useState, useCallback, useRef } from "react";

/**
 * Hook to collect delay alerts from socket and manage their lifecycle.
 *
 * @param {object|null} socket   - socket.io client instance
 * @returns {{ alerts: Array, clearAlerts: () => void }}
 */
let alertCounter = 0;

export function useDelayAlerts(socket) {
  const [alerts, setAlerts] = useState([]);
  const soundRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleDelayAlert = (data) => {
      alertCounter += 1;
      const alert = { ...data, _key: `${data.busId}-${alertCounter}`, _ts: Date.now() };
      setAlerts((prev) => [...prev, alert]);

      /* play a subtle notification sound (optional — fails silently if blocked) */
      try {
        if (!soundRef.current) {
          soundRef.current = new Audio(
            "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW2MkZFzZGFpbo6Xl4x7bmtxe4uTi3lqZ2x2h5GNgXRvcXuIj4t/"
          );
          soundRef.current.volume = 0.3;
        }
        soundRef.current.currentTime = 0;
        soundRef.current.play().catch(() => {});
      } catch {
        /* audio not supported — no-op */
      }
    };

    /* Also derive delay alerts from bus:location:update for TrackBus page */
    const handleLocationUpdate = (data) => {
      if (data.delay && data.delay >= 3 && data.progress) {
        alertCounter += 1;
        const eta = data.eta;
        const arrivalTime = new Date(Date.now() + (eta || 0) * 60000);
        const alert = {
          busId: data.busId,
          busNumber: data.progress?.busNumber || "—",
          routeCode: data.progress?.routeCode || "—",
          routeName: data.progress?.routeName || "—",
          delayMinutes: data.delay,
          eta: eta,
          estimatedArrivalFormatted: arrivalTime.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          severity: data.delay >= 15 ? "critical" : data.delay >= 8 ? "high" : "moderate",
          message: `Bus ${data.progress?.busNumber} delayed by ${data.delay} min`,
          _key: `loc-${data.busId}-${alertCounter}`,
          _ts: Date.now(),
          _fromLocation: true,
        };

        setAlerts((prev) => {
          /* Only add if no recent alert for this bus in the last 60s */
          const recentForBus = prev.find(
            (a) => a.busId === data.busId && Date.now() - a._ts < 60000
          );
          if (recentForBus) return prev;
          return [...prev, alert];
        });
      }
    };

    socket.on("bus:delay:alert", handleDelayAlert);
    socket.on("bus:location:update", handleLocationUpdate);

    return () => {
      socket.off("bus:delay:alert", handleDelayAlert);
      socket.off("bus:location:update", handleLocationUpdate);
    };
  }, [socket]);

  const clearAlerts = useCallback(() => setAlerts([]), []);

  return { alerts, clearAlerts };
}
