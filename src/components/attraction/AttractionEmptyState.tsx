"use client";

import React from "react";
import { Plus, Upload } from "lucide-react";

interface AttractionEmptyStateProps {
  onAddAttraction: () => void;
  onBulkUpload: () => void;
}

export default function AttractionEmptyState({
  onAddAttraction,
  onBulkUpload,
}: AttractionEmptyStateProps) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        width: "100%",
        maxWidth: "1124px",
        /* Fill the content area exactly — header is 78px, desktop main padding-top is 78+24=102px, bottom padding 24px */
        height: "calc(100vh - 102px - 24px)",
        minHeight: "480px",
        background: "#FFFFFF",
        border: "1px solid rgba(0, 0, 0, 0.43)",
        boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
        borderRadius: "38px",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto",
        textAlign: "center",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        overflow: "hidden",
      }}
      className="attraction-empty-container"
    >
      {/* Ferris Wheel + Fort Illustration SVG matching Figma Screenshot 1 */}
      <div
        style={{
          width: "100%",
          maxWidth: "403px",
          height: "clamp(130px, 22vh, 215px)",
          marginBottom: "clamp(12px, 2vh, 28px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg
          width="360"
          height="190"
          viewBox="0 0 360 190"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle clouds */}
          <path
            d="M50 45C50 40 55 35 62 35C66 35 70 37 72 40C74 38 78 37 82 39C86 41 88 45 88 48C92 48 95 51 95 55C95 59 92 62 88 62H50C45 62 42 58 42 54C42 49 45 45 50 45Z"
            stroke="#C0C9D6"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M260 55C260 51 264 47 270 47C273 47 276 49 278 51C280 49 283 48 287 50C290 52 292 55 292 57C295 57 298 60 298 63C298 67 295 69 292 69H260C256 69 253 66 253 62C253 58 256 55 260 55Z"
            stroke="#C0C9D6"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Birds in sky */}
          <path
            d="M125 45Q130 40 135 45Q140 40 145 45"
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M210 50Q213 46 217 50Q221 46 225 50"
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M245 68Q248 65 251 68Q254 65 257 68"
            stroke="#94A3B8"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Ground line */}
          <line x1="20" y1="165" x2="340" y2="165" stroke="#94A3B8" strokeWidth="1.2" />

          {/* Ferris Wheel */}
          <circle cx="85" cy="115" r="32" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="85" cy="115" r="6" stroke="#94A3B8" strokeWidth="1.5" />
          {/* Spokes */}
          <line x1="85" y1="83" x2="85" y2="147" stroke="#94A3B8" strokeWidth="1.2" />
          <line x1="53" y1="115" x2="117" y2="115" stroke="#94A3B8" strokeWidth="1.2" />
          <line x1="62" y1="92" x2="108" y2="138" stroke="#94A3B8" strokeWidth="1.2" />
          <line x1="62" y1="138" x2="108" y2="92" stroke="#94A3B8" strokeWidth="1.2" />
          {/* Ferris Wheel Support Structure */}
          <line x1="85" y1="115" x2="68" y2="165" stroke="#94A3B8" strokeWidth="1.5" />
          <line x1="85" y1="115" x2="102" y2="165" stroke="#94A3B8" strokeWidth="1.5" />

          {/* Fort / Castle Main Structure */}
          <rect x="120" y="105" x2="260" y2="165" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />

          {/* Fort Battlement Towers */}
          {/* Left Tower */}
          <rect x="120" y="85" width="30" height="80" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />
          <path d="M120 85V78H126V82H134V78H140V82H144V78H150V85" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />
          <rect x="130" y="98" width="10" height="12" rx="5" stroke="#94A3B8" strokeWidth="1.2" />

          {/* Right Tower */}
          <rect x="230" y="85" width="30" height="80" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />
          <path d="M230 85V78H236V82H244V78H250V82H254V78H260V85" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />
          <rect x="240" y="98" width="10" height="12" rx="5" stroke="#94A3B8" strokeWidth="1.2" />

          {/* Center Gate Section */}
          <rect x="150" y="90" width="80" height="75" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />
          <path d="M150 90V84H156V87H164V84H172V87H180V84H188V87H196V84H204V87H212V84H220V87H224V84H230V90" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />

          {/* Arch Gate Door */}
          <path d="M175 165V135C175 125 205 125 205 135V165" stroke="#94A3B8" strokeWidth="1.5" fill="#FFFFFF" />

          {/* Side Tree (Left) */}
          <path d="M35 165V145" stroke="#94A3B8" strokeWidth="1.2" />
          <circle cx="35" cy="140" r="8" stroke="#94A3B8" strokeWidth="1.2" fill="#FFFFFF" />

          {/* Side Tree (Right) */}
          <path d="M285 165V142" stroke="#94A3B8" strokeWidth="1.2" />
          <ellipse cx="285" cy="132" rx="7" ry="12" stroke="#94A3B8" strokeWidth="1.2" fill="#FFFFFF" />
        </svg>
      </div>

      {/* Main Title - exact Figma text */}
      <h2
        style={{
          margin: "0 0 clamp(8px, 1.5vh, 16px) 0",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          fontSize: "clamp(20px, 2.5vw, 28px)",
          lineHeight: "1.25",
          color: "#0C2A42",
          flexShrink: 0,
        }}
      >
        No Attraction Added Yet
      </h2>

      {/* Subtitle - exact Figma text */}
      <p
        style={{
          margin: "0 0 clamp(16px, 3vh, 36px) 0",
          maxWidth: "437px",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 500,
          fontSize: "clamp(12px, 1.2vw, 14px)",
          lineHeight: "145.23%",
          textAlign: "center",
          letterSpacing: "0.07em",
          color: "#6B7280",
        }}
      >
        You haven’t added any attractions to Nahargarh Fort yet. Add a new
        attraction manually or upload in bulk.
      </p>

      {/* Action Buttons Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        {/* + Add Attraction Button - Rectangle 170 */}
        <button
          onClick={onAddAttraction}
          style={{
            boxSizing: "border-box",
            width: "186px",
            height: "51px",
            background: "#0C2A42",
            borderRadius: "10px",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            boxShadow: "0px 4px 12px rgba(12, 42, 66, 0.2)",
            transition: "all 0.18s ease",
          }}
          className="btn-empty-add"
        >
          <Plus size={22} color="#FFFFFF" strokeWidth={2.8} />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "16px",
              lineHeight: "20px",
              color: "#FFFFFF",
            }}
          >
            Add Attraction
          </span>
        </button>

        {/* Bulk Upload Button - Rectangle 172 */}
        <button
          onClick={onBulkUpload}
          style={{
            boxSizing: "border-box",
            width: "186px",
            height: "51px",
            background: "#FFFFFF",
            border: "2px solid #0C2A42",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            cursor: "pointer",
            transition: "all 0.18s ease",
          }}
          className="btn-empty-bulk"
        >
          <Upload size={18} color="#011B2F" strokeWidth={2} />
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 500,
              fontSize: "16px",
              lineHeight: "20px",
              color: "#011B2F",
            }}
          >
            Bulk Upload
          </span>
        </button>
      </div>

      <style>{`
        .btn-empty-add:hover {
          background: #173F63 !important;
          transform: translateY(-2px);
          box-shadow: 0px 6px 16px rgba(12, 42, 66, 0.3) !important;
        }
        .btn-empty-bulk:hover {
          background: #F0F4F8 !important;
          transform: translateY(-2px);
        }
        @media (max-width: 1024px) {
          .attraction-empty-container {
            /* mobile: header 78px + top padding 16+78=94px + bottom 16px */
            height: calc(100vh - 94px - 16px) !important;
            padding: 24px 16px !important;
            border-radius: 20px !important;
            min-height: 420px !important;
          }
        }
      `}</style>
    </div>
  );
}
