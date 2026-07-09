import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card, generated at build time — matches the "Lamplit Desk"
// warm-paper look of the site without shipping a binary asset.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#faf5ec",
          backgroundImage:
            "radial-gradient(circle at 85% 10%, #f3e3c8 0%, rgba(243,227,200,0) 55%)",
          color: "#2c2418",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "26px",
            letterSpacing: "6px",
            color: "#8a7a5f",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              backgroundColor: "#4caf50",
            }}
          />
          GRIND · TRACK · GET HIRED
        </div>
        <div
          style={{
            marginTop: "28px",
            fontSize: "76px",
            fontWeight: 700,
            lineHeight: 1.1,
            maxWidth: "950px",
          }}
        >
          Did The Boys Grind LeetCode Today?
        </div>
        <div
          style={{
            marginTop: "30px",
            fontSize: "32px",
            color: "#5d5240",
            maxWidth: "900px",
            lineHeight: 1.4,
          }}
        >
          LeetCode accountability heatmaps + a free new-grad job board tracking
          20 top companies, refreshed hourly.
        </div>
      </div>
    ),
    size
  );
}
