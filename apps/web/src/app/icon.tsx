import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 64,
  height: 64
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#1f1a17",
          borderRadius: 14,
          color: "#fbf8f2",
          display: "flex",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: 34,
          fontWeight: 800,
          height: "64px",
          justifyContent: "center",
          width: "64px"
        }}
      >
        H
      </div>
    ),
    size
  );
}
