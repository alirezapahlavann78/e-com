import { ImageResponse } from "next/og";

export const alt = "آگاهی — پوشاک مینیمال ایرانی";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Brand share card. Latin wordmark keeps it renderable without shipping a Persian font to the edge runtime. */
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #16120d 0%, #241a12 55%, #3a2716 100%)",
          padding: "72px 80px",
          color: "#f6f1e8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: 999, border: "3px solid #d8bd97", display: "flex" }} />
          <div style={{ fontSize: 22, letterSpacing: 10, color: "#d8bd97" }}>AGHACI</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>Minimal apparel,</div>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1, color: "#d8bd97" }}>made to last.</div>
          <div style={{ fontSize: 24, color: "#b8aa96", marginTop: 12 }}>
            Natural fabrics · Limited production · Tehran
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 20, color: "#8d8069" }}>
          <span>aghaci</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 60, height: 2, background: "#a9713f", display: "flex" }} />
            storefront
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
