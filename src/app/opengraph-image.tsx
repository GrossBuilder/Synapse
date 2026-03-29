import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Synapse — Next-gen Video Chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #030712 0%, #1e1b4b 50%, #030712 100%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 100,
            height: 100,
            borderRadius: 24,
            background: "linear-gradient(135deg, #6366f1, #9333ea)",
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 56, fontWeight: 800, color: "white" }}>S</span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "white",
            margin: 0,
            letterSpacing: "-2px",
          }}
        >
          Synapse
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 28,
            color: "#a5b4fc",
            margin: "16px 0 0 0",
            textAlign: "center",
          }}
        >
          Next-generation Video Chat
        </p>

        {/* Tags */}
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          {["🧠 Smart Matching", "🔒 Encrypted", "🌍 Global"].map((tag) => (
            <div
              key={tag}
              style={{
                padding: "10px 24px",
                borderRadius: 20,
                background: "rgba(99, 102, 241, 0.2)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                color: "#c7d2fe",
                fontSize: 20,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
