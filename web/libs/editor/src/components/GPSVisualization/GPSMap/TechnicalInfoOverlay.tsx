import type React from "react";
import type { GPSPoint } from "../types";
import { getCurrentTheme } from "@humansignal/ui";

interface TechnicalInfoOverlayProps {
  currentPoint: GPSPoint | null;
  currentTime: number;
  settings: any;
  formatTime: (seconds: number) => string;
}

// Helper function to get theme-aware overlay styles
const getThemeAwareOverlayStyles = () => {
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

const TechnicalInfoOverlay: React.FC<TechnicalInfoOverlayProps> = ({
  currentPoint,
  currentTime,
  settings,
  formatTime,
}) => {
  if (!currentPoint) return null;

  const styles = getThemeAwareOverlayStyles();
  const speedUnit = settings?.speedUnit || "m/s";
  const speedMs = currentPoint.speed || 0;
  const speedConverted = speedUnit === "km/h" ? speedMs * 3.6 : speedMs;

  const getCardinalDirection = (bearing: number): string => {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  };

  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    top: "15px",
    left: "15px",
    backgroundColor: styles.background,
    color: styles.color,
    padding: "12px",
    borderRadius: "8px",
    fontFamily: "monospace",
    fontSize: "12px",
    lineHeight: "1.4",
    zIndex: 1000,
    minWidth: "280px",
    boxShadow: `0 4px 12px ${styles.shadowColor}`,
    border: `1px solid ${styles.borderColor}`,
  };

  const headerStyle: React.CSSProperties = {
    color: styles.headerColor,
    fontWeight: "bold",
    marginBottom: "8px",
    borderBottom: `1px solid ${styles.separatorColor}`,
    paddingBottom: "4px",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "3px",
  };

  const labelStyle: React.CSSProperties = {
    color: styles.labelColor,
    minWidth: "120px",
  };

  const valueStyle: React.CSSProperties = {
    color: styles.valueColor,
    fontWeight: "bold",
    textAlign: "right" as const,
  };

  return (
    <div style={overlayStyle}>
      <div style={headerStyle}>📊 Technical Info</div>

      <div style={rowStyle}>
        <span style={labelStyle}>Time:</span>
        <span style={valueStyle}>{formatTime(currentTime)}</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Timestamp:</span>
        <span style={valueStyle}>{currentPoint.timestamp.toFixed(3)}s</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Latitude:</span>
        <span style={valueStyle}>{currentPoint.latitude.toFixed(6)}°</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Longitude:</span>
        <span style={valueStyle}>{currentPoint.longitude.toFixed(6)}°</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Altitude:</span>
        <span style={valueStyle}>{(currentPoint.altitude || 0).toFixed(1)}m</span>
      </div>

      <div style={rowStyle}>
        <span style={labelStyle}>Speed:</span>
        <span style={valueStyle}>
          {speedConverted.toFixed(2)}
          {speedUnit} ({speedMs.toFixed(2)}m/s)
        </span>
      </div>

      {currentPoint.course !== undefined && (
        <div style={rowStyle}>
          <span style={labelStyle}>Course:</span>
          <span style={valueStyle}>
            {currentPoint.course.toFixed(1)}° ({getCardinalDirection(currentPoint.course)})
          </span>
        </div>
      )}

      {currentPoint.haccuracy !== undefined && (
        <div style={rowStyle}>
          <span style={labelStyle}>H Accuracy:</span>
          <span style={valueStyle}>{currentPoint.haccuracy.toFixed(1)}m</span>
        </div>
      )}

      {currentPoint.vaccuracy !== undefined && (
        <div style={rowStyle}>
          <span style={labelStyle}>V Accuracy:</span>
          <span style={valueStyle}>{currentPoint.vaccuracy.toFixed(1)}m</span>
        </div>
      )}
    </div>
  );
};

export default TechnicalInfoOverlay;
