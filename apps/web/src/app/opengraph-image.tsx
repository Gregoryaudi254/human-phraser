import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = {
  width: 1200,
  height: 630
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F8FAF9",
          color: "#14211F",
          padding: 72,
          fontFamily: "Arial"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#0F766E",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700
            }}
          >
            H
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Humaniser</div>
        </div>
        <div>
          <div style={{ fontSize: 72, lineHeight: 1.05, fontWeight: 800, letterSpacing: 0, maxWidth: 900 }}>
            Write like a human. Every time.
          </div>
          <div style={{ marginTop: 28, fontSize: 30, lineHeight: 1.35, color: "#52635F", maxWidth: 860 }}>
            Turn stiff drafts into clear, natural prose with diff view and naturalness scoring.
          </div>
        </div>
      </div>
    ),
    size
  );
}
