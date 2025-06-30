import type { GPSPoint } from "../../types";
import { getCurrentTheme } from "@humansignal/ui";

// Helper function to get theme-aware tooltip styles
const getThemeAwareTooltipStyles = () => {
  const currentTheme = getCurrentTheme();
  const isDarkMode = currentTheme?.toLowerCase() === "dark";

  if (isDarkMode) {
    return {
      background: "rgba(0, 0, 0, 0.8)",
      color: "white",
      borderColor: "rgba(255, 255, 255, 0.08)",
      shadowColor: "rgba(0, 0, 0, 0.2)",
      headerColor: "#FFD700",
      separatorColor: "rgba(255, 255, 255, 0.2)",
      labelColor: "#AAA",
      valueColor: "#FFF",
    };
  } else {
    return {
      background: "rgba(255, 255, 255, 0.95)",
      color: "black",
      borderColor: "rgba(0, 0, 0, 0.12)",
      shadowColor: "rgba(0, 0, 0, 0.15)",
      headerColor: "#B8860B", // Dark goldenrod for light theme
      separatorColor: "rgba(0, 0, 0, 0.15)",
      labelColor: "#666",
      valueColor: "#000",
    };
  }
};

export const createGPSPointTooltip = (
  point: GPSPoint,
  pointIndex: number,
  formatTime: (seconds: number) => string,
  getCardinalDirection: (bearing: number) => string,
): string => {
  const styles = getThemeAwareTooltipStyles();
  const speedKmh = (point.speed * 3.6).toFixed(1);
  const timeFormatted = formatTime(point.timestamp);
  const courseDirection = point.course !== undefined ? getCardinalDirection(point.course) : "Unknown";

  return `
    <div style="background: ${styles.background}; color: ${styles.color}; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.4; box-shadow: 0 4px 12px ${styles.shadowColor}; border: 1px solid ${styles.borderColor};">
      <div style="font-weight: bold; color: ${styles.headerColor}; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${styles.separatorColor};">📍 GPS Point ${pointIndex + 1}</div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">🕐 Time:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${timeFormatted}</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">🌐 Position:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${point.latitude?.toFixed(5)}°, ${point.longitude?.toFixed(5)}°</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">⛰️ Altitude:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${point.altitude?.toFixed(1)}m</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">🚗 Speed:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${point.speed?.toFixed(1)}m/s (${speedKmh}km/h)</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">🧭 Course:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${point.course?.toFixed(1)}° (${courseDirection})</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">🎯 Accuracy:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">H:${point.haccuracy?.toFixed(1)}m V:${point.vaccuracy?.toFixed(1)}m</span></div>
      <div style="font-size: 10px; color: ${styles.labelColor}; margin-top: 6px;">Click to seek to this point</div>
    </div>
  `;
};

export const createClusterTooltip = (cluster: {
  latitude: number;
  longitude: number;
  altitude: number;
  count: number;
  radius: number;
}): string => {
  const styles = getThemeAwareTooltipStyles();

  return `
    <div style="background: ${styles.background}; color: ${styles.color}; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.4; box-shadow: 0 4px 12px ${styles.shadowColor}; border: 1px solid ${styles.borderColor};">
      <div style="font-weight: bold; color: ${styles.headerColor}; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${styles.separatorColor};">🏠 Stationary Points Cluster</div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">📍 Position:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${cluster.latitude?.toFixed(5)}°, ${cluster.longitude?.toFixed(5)}°</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">⛰️ Altitude:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${cluster.altitude?.toFixed(1)}m</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">📊 Points:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${cluster.count}</span></div>
      <div style="margin-bottom: 3px;"><span style="color: ${styles.labelColor};">📏 Radius:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${cluster.radius.toFixed(1)}m</span></div>
    </div>
  `;
};

export const createDistanceTooltip = (distance: number): string => {
  const styles = getThemeAwareTooltipStyles();

  return `
    <div style="background: ${styles.background}; color: ${styles.color}; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; line-height: 1.4; box-shadow: 0 4px 12px ${styles.shadowColor}; border: 1px solid ${styles.borderColor};">
      <div style="font-weight: bold; color: ${styles.headerColor}; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${styles.separatorColor};">📏 Distance</div>
      <div><span style="color: ${styles.labelColor};">Distance:</span> <span style="color: ${styles.valueColor}; font-weight: bold;">${distance.toFixed(1)} m</span></div>
    </div>
  `;
};

// Common tooltip style for deck.gl
export const getTooltipStyle = () => ({
  fontSize: "12px",
  maxWidth: "320px",
  border: "none",
  background: "transparent",
  pointerEvents: "none" as const,
  zIndex: 999999,
});
