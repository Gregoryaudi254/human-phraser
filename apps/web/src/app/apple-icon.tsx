import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 180,
  height: 180
};
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#fbf8f2",
          display: "flex",
          height: "180px",
          justifyContent: "center",
          width: "180px"
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#1f1a17",
            borderRadius: 40,
            color: "#fbf8f2",
            display: "flex",
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: 92,
            fontWeight: 800,
            height: "144px",
            justifyContent: "center",
            width: "144px"
          }}
        >
          H
        </div>
      </div>
    ),
    size
  );
}
