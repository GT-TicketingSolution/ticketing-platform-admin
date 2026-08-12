"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Trash2,
  RefreshCw,
  Star,
  Maximize2
} from "lucide-react";
import { META_CONSTANTS } from "@/lib/metaConstant";
import AddRecorderModal, { RecorderData } from "@/components/modals/AddRecorderModal";
import CameraFeedModal from "@/components/modals/CameraFeedModal";
import DeleteRecorderModal from "@/components/modals/DeleteRecorderModal";
import { useToast } from "@/components/ui/Toast";
import UnderConstruction from "@/components/ui/UnderConstruction";


// Camera data structure
interface CameraItem {
  id: string;
  name: string;
  isFavorite: boolean;
  videoUrl?: string;
  isLive: boolean;
}


const INITIAL_CAMERAS: CameraItem[] = [
  {
    id: "cam-1",
    name: "Ticket Counter",
    isFavorite: true,
    videoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-2",
    name: "Entrance Gate",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-3",
    name: "Wax Mueseum",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-4",
    name: "Parking Area",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-5",
    name: "Restaurant",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-6",
    name: "Souvenir Shop",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-7",
    name: "Fort Pathway",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
  {
    id: "cam-8",
    name: "Exit",
    isFavorite: false,
    videoUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=800&auto=format&fit=crop",
    isLive: true,
  },
];

// Initial Connected Recorder matching Figma
const DEFAULT_CONNECTED_RECORDER: RecorderData = {
  id: "nahargarh-main-rec",
  name: "Nahargarh Main Recorder",
  location: "Nahargarh Fort, Jaipur",
  recorderType: "NVR (8 Channel)",
  channelCount: 8,
  ipAddress: "192.168.1.100",
  username: "admin",
  port: "8000",
};

// export default function CCTVMonitoringPage() {
//   const { showToast } = useToast();
//   // State: whether recorder is connected or empty
//   const [recorder, setRecorder] = useState<RecorderData | null>(DEFAULT_CONNECTED_RECORDER);
//   const [isAddModalOpen, setIsAddModalOpen] = useState(false);
//   const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
//   const [editingRecorder, setEditingRecorder] = useState<RecorderData | null>(null);

//   // Camera state
//   const [cameras, setCameras] = useState<CameraItem[]>(INITIAL_CAMERAS);
//   const [activeCameraFeed, setActiveCameraFeed] = useState<CameraItem | null>(null);
//   const [currentTime, setCurrentTime] = useState("");

//   useEffect(() => {
//     document.title = META_CONSTANTS.cctvMonitoring.fullTitle;
//   }, []);

//   // Update live clock every second
//   useEffect(() => {
//     const updateTime = () => {
//       const now = new Date();
//       setCurrentTime(now.toLocaleTimeString("en-US", { hour12: true }));
//     };
//     updateTime();
//     const interval = setInterval(updateTime, 1000);
//     return () => clearInterval(interval);
//   }, []);

//   // Handle Add / Edit Recorder
//   const handleSaveRecorder = (data: RecorderData) => {
//     setRecorder(data);
//   };

//   // Handle Delete Recorder Confirmation
//   const handleConfirmDelete = () => {
//     setRecorder(null);
//     showToast("CCTV Recorder disconnected successfully", "info");
//   };


//   // Toggle favorite star for camera
//   const handleToggleFavorite = (camId: string) => {
//     setCameras((prev) =>
//       prev.map((c) => (c.id === camId ? { ...c, isFavorite: !c.isFavorite } : c))
//     );
//   };

//   // Handle refresh feeds
//   const handleRefresh = () => {
//     showToast("Refreshing live CCTV camera feeds...", "info");
//   };

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         gap: "24px",
//         width: "100%",
//         maxWidth: "1440px",
//         margin: "0 auto",
//         boxSizing: "border-box",
//       }}
//     >
//       {/* ── STATE 1: NO RECORDER CONNECTED (EMPTY STATE) ── */}
//       {!recorder ? (
//         <div
//           style={{
//             boxSizing: "border-box",
//             width: "100%",
//             maxWidth: "1124px",
//             height: "calc(100vh - 148px)",
//             margin: "0 auto",
//             background: "#FFFFFF",
//             border: "1px solid rgba(0, 0, 0, 0.43)",
//             boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
//             borderRadius: "38px",
//             padding: "24px 36px",
//             display: "flex",
//             flexDirection: "column",
//             overflow: "hidden",
//           }}
//         >
//           {/* Header Title inside Card */}
//           <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
//             <h2
//               style={{
//                 fontFamily: "'Plus Jakarta Sans', sans-serif",
//                 fontWeight: 700,
//                 fontSize: "20px",
//                 lineHeight: "25px",
//                 color: "#0C2A42",
//                 margin: 0,
//               }}
//             >
//               Recorder Status
//             </h2>
//             <div style={{ width: "100%", height: "1px", background: "#B3AFAF" }} />
//           </div>

//           {/* Center Graphic + Empty Message + Action Button */}
//           <div
//             style={{
//               flex: 1,
//               display: "flex",
//               flexDirection: "column",
//               alignItems: "center",
//               justifyContent: "center",
//               padding: "16px 20px",
//               textAlign: "center",
//             }}
//           >
//             {/* Custom SVG NVR Illustration matching Image 1 */}
//             <div style={{ marginBottom: "16px", flexShrink: 0 }}>
//               <svg width="180" height="150" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
//                 {/* Dotted Circle Camera Icon Above */}
//                 <circle cx="110" cy="55" r="36" stroke="#0C2A42" strokeWidth="1.8" strokeDasharray="4 4" fill="#F8FAFC" />
//                 <path d="M100 48L116 38V66L100 56V48Z" fill="#0C2A42" stroke="#0C2A42" strokeWidth="1.5" strokeLinejoin="round" />
//                 <rect x="90" y="46" width="12" height="14" rx="2" fill="#0C2A42" />
//                 <circle cx="94" cy="53" r="2" fill="#FFFFFF" />

//                 {/* NVR Hardware Device Frame */}
//                 <rect x="30" y="100" width="160" height="42" rx="10" fill="#FFFFFF" stroke="#0C2A42" strokeWidth="2.5" />
//                 {/* Front Panel Indicators */}
//                 <rect x="44" y="118" width="16" height="4" rx="2" fill="#0C2A42" />
//                 <circle cx="70" cy="120" r="3.5" fill="#0C2A42" />
//                 <circle cx="82" cy="120" r="3.5" fill="#0C2A42" />
//                 <circle cx="162" cy="120" r="7" stroke="#0C2A42" strokeWidth="2" fill="none" />
//                 {/* Shadow */}
//                 <ellipse cx="110" cy="148" rx="80" ry="6" fill="#0C2A42" fillOpacity="0.08" />
//               </svg>
//             </div>

//             {/* Heading */}
//             <h3
//               style={{
//                 fontFamily: "'Plus Jakarta Sans', sans-serif",
//                 fontWeight: 700,
//                 fontSize: "26px",
//                 lineHeight: "32px",
//                 color: "#0C2A42",
//                 margin: "0 0 8px 0",
//               }}
//             >
//               No Recorder Connected
//             </h3>

//             {/* Paragraph */}
//             <p
//               style={{
//                 fontFamily: "'Plus Jakarta Sans', sans-serif",
//                 fontWeight: 500,
//                 fontSize: "14px",
//                 lineHeight: "20px",
//                 letterSpacing: "0.07em",
//                 color: "#6B7280",
//                 maxWidth: "405px",
//                 margin: "0 0 24px 0",
//               }}
//             >
//               No CCTV Recorder (NVR/DVR) has been added yet. Connect a recorder to start monitoring your cameras.
//             </p>

//             {/* Button */}
//             <button
//               type="button"
//               onClick={() => {
//                 setEditingRecorder(null);
//                 setIsAddModalOpen(true);
//               }}
//               style={{
//                 boxSizing: "border-box",
//                 width: "186px",
//                 height: "51px",
//                 background: "#0C2A42",
//                 borderRadius: "10px",
//                 border: "none",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 gap: "10px",
//                 cursor: "pointer",
//                 boxShadow: "0 4px 14px rgba(12, 42, 66, 0.3)",
//                 transition: "transform 0.15s ease, background 0.15s ease",
//               }}
//               className="cctv-add-rec-btn"
//             >
//               <span
//                 style={{
//                   fontFamily: "'Plus Jakarta Sans', sans-serif",
//                   fontWeight: 700,
//                   fontSize: "28px",
//                   lineHeight: "28px",
//                   color: "#FFFFFF",
//                   marginTop: "-2px",
//                 }}
//               >
//                 +
//               </span>
//               <span
//                 style={{
//                   fontFamily: "'Plus Jakarta Sans', sans-serif",
//                   fontWeight: 500,
//                   fontSize: "16px",
//                   lineHeight: "20px",
//                   color: "#FFFFFF",
//                 }}
//               >
//                 Add Recorder
//               </span>
//             </button>
//           </div>
//         </div>
//       ) : (
//         /* ── STATE 2 & 3: RECORDER CONNECTED & LIVE CAMERAS GRID ── */
//         <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>

//           {/* Top Hardware Info Card (Rectangle 171) */}
//           <div
//             style={{
//               boxSizing: "border-box",
//               width: "100%",
//               minHeight: "137px",
//               background: "#FFFFFF",
//               border: "1px solid rgba(0, 0, 0, 0.43)",
//               boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
//               borderRadius: "8px",
//               padding: "20px 28px",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "space-between",
//               gap: "20px",
//               flexWrap: "wrap",
//             }}
//           >
//             {/* Left Image + Title + Details */}
//             <div style={{ display: "flex", alignItems: "center", gap: "24px", flex: 1, minWidth: "300px" }}>
//               {/* Hardware Device Graphic */}
//               <div
//                 style={{
//                   width: "140px",
//                   height: "56px",
//                   background: "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
//                   borderRadius: "8px",
//                   border: "1px solid #334155",
//                   boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "space-between",
//                   padding: "0 14px",
//                   flexShrink: 0,
//                 }}
//               >
//                 <div style={{ display: "flex", gap: "6px" }}>
//                   <div style={{ width: "12px", height: "3px", background: "#10B981", borderRadius: "1px" }} />
//                   <div style={{ width: "12px", height: "3px", background: "#10B981", borderRadius: "1px" }} />
//                   <div style={{ width: "12px", height: "3px", background: "#F59E0B", borderRadius: "1px" }} />
//                 </div>
//                 <div
//                   style={{
//                     width: "14px",
//                     height: "14px",
//                     borderRadius: "50%",
//                     border: "1px solid #64748B",
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "center",
//                   }}
//                 >
//                   <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10B981" }} />
//                 </div>
//               </div>

//               {/* Title & Metadata Grid */}
//               <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//                 <h3
//                   style={{
//                     fontFamily: "'Plus Jakarta Sans', sans-serif",
//                     fontWeight: 700,
//                     fontSize: "20px",
//                     lineHeight: "25px",
//                     color: "#0C2A42",
//                     margin: 0,
//                   }}
//                 >
//                   {recorder.name}
//                 </h3>

//                 {/* Details Columns */}
//                 <div
//                   style={{
//                     display: "grid",
//                     gridTemplateColumns: "repeat(auto-fit, minmax(130px, auto))",
//                     gap: "24px",
//                     alignItems: "center",
//                   }}
//                 >
//                   <div>
//                     <span
//                       style={{
//                         display: "block",
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 600,
//                         fontSize: "12px",
//                         lineHeight: "17px",
//                         letterSpacing: "0.02em",
//                         color: "rgba(107, 114, 128, 0.84)",
//                       }}
//                     >
//                       Recorder Type
//                     </span>
//                     <strong
//                       style={{
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 700,
//                         fontSize: "16px",
//                         lineHeight: "20px",
//                         color: "#0C2A42",
//                       }}
//                     >
//                       {recorder.recorderType}
//                     </strong>
//                   </div>

//                   <div>
//                     <span
//                       style={{
//                         display: "block",
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 600,
//                         fontSize: "12px",
//                         lineHeight: "17px",
//                         letterSpacing: "0.02em",
//                         color: "rgba(107, 114, 128, 0.84)",
//                       }}
//                     >
//                       IP Address
//                     </span>
//                     <strong
//                       style={{
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 700,
//                         fontSize: "16px",
//                         lineHeight: "20px",
//                         color: "#0C2A42",
//                       }}
//                     >
//                       {recorder.ipAddress}
//                     </strong>
//                   </div>

//                   <div>
//                     <span
//                       style={{
//                         display: "block",
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 600,
//                         fontSize: "12px",
//                         lineHeight: "17px",
//                         letterSpacing: "0.02em",
//                         color: "rgba(107, 114, 128, 0.84)",
//                       }}
//                     >
//                       Location
//                     </span>
//                     <strong
//                       style={{
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 700,
//                         fontSize: "16px",
//                         lineHeight: "20px",
//                         color: "#0C2A42",
//                       }}
//                     >
//                       {recorder.location}
//                     </strong>
//                   </div>

//                   <div>
//                     <span
//                       style={{
//                         display: "block",
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 600,
//                         fontSize: "12px",
//                         lineHeight: "17px",
//                         letterSpacing: "0.02em",
//                         color: "rgba(107, 114, 128, 0.84)",
//                       }}
//                     >
//                       Cameras
//                     </span>
//                     <strong
//                       style={{
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 700,
//                         fontSize: "16px",
//                         lineHeight: "20px",
//                         color: "#0C2A42",
//                       }}
//                     >
//                       {recorder.channelCount}
//                     </strong>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Right Action Buttons */}
//             <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
//               <button
//                 type="button"
//                 onClick={() => {
//                   setEditingRecorder(recorder);
//                   setIsAddModalOpen(true);
//                 }}
//                 style={{
//                   width: "177px",
//                   height: "38px",
//                   background: "#FFFFFF",
//                   border: "1.5px solid #173F63",
//                   borderRadius: "8px",
//                   fontFamily: "'Plus Jakarta Sans', sans-serif",
//                   fontWeight: 700,
//                   fontSize: "12px",
//                   lineHeight: "15px",
//                   color: "#0C2A42",
//                   cursor: "pointer",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "8px",
//                   transition: "all 0.15s ease",
//                 }}
//                 className="rec-action-btn"
//               >
//                 <Settings size={16} color="#173F63" />
//                 Recorder Settings
//               </button>

//               <button
//                 type="button"
//                 onClick={() => setIsDeleteModalOpen(true)}
//                 style={{
//                   width: "177px",
//                   height: "38px",
//                   background: "#FFFFFF",
//                   border: "1.5px solid #F4BC43",
//                   borderRadius: "8px",
//                   fontFamily: "'Plus Jakarta Sans', sans-serif",
//                   fontWeight: 700,
//                   fontSize: "12px",
//                   lineHeight: "15px",
//                   color: "#F4BC43",
//                   cursor: "pointer",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "8px",
//                   transition: "all 0.15s ease",
//                 }}
//                 className="rec-delete-btn"
//               >
//                 <Trash2 size={16} color="#F4BC43" />
//                 Delete Recorder
//               </button>
//             </div>
//           </div>

//           {/* Bottom Live Camera Grid Container (Rectangle 180) */}
//           <div
//             style={{
//               boxSizing: "border-box",
//               width: "100%",
//               minHeight: "715px",
//               background: "#FFFFFF",
//               border: "1px solid rgba(0, 0, 0, 0.43)",
//               boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
//               borderRadius: "8px",
//               padding: "24px",
//               display: "flex",
//               flexDirection: "column",
//               gap: "20px",
//             }}
//           >
//             {/* Top Toolbar inside Grid */}
//             <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//               <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                 <span
//                   style={{
//                     width: "8px",
//                     height: "8px",
//                     borderRadius: "50%",
//                     background: "#10B981",
//                     boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
//                   }}
//                 />
//                 <span
//                   style={{
//                     fontFamily: "'Plus Jakarta Sans', sans-serif",
//                     fontWeight: 700,
//                     fontSize: "14px",
//                     color: "#0C2A42",
//                   }}
//                 >
//                   Live Feeds — 8 Active Streams
//                 </span>
//               </div>

//               {/* Refresh Button */}
//               <button
//                 type="button"
//                 onClick={handleRefresh}
//                 style={{
//                   width: "127px",
//                   height: "33px",
//                   background: "#FFFFFF",
//                   border: "1.5px solid rgba(179, 175, 175, 0.72)",
//                   borderRadius: "8px",
//                   fontFamily: "'Plus Jakarta Sans', sans-serif",
//                   fontWeight: 700,
//                   fontSize: "12px",
//                   lineHeight: "15px",
//                   color: "#0C2A42",
//                   cursor: "pointer",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                   gap: "6px",
//                   transition: "all 0.15s ease",
//                 }}
//                 className="refresh-btn"
//               >
//                 <RefreshCw size={14} color="#0C2A42" />
//                 Refresh
//               </button>
//             </div>

//             {/* 8 Cameras Responsive Grid (4x2 on Desktop, 2x4 on Tablet, 1-col on Mobile) */}
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
//                 gap: "20px",
//                 width: "100%",
//               }}
//             >
//               {cameras.map((camera) => (
//                 <div
//                   key={camera.id}
//                   style={{
//                     boxSizing: "border-box",
//                     width: "100%",
//                     height: "290px",
//                     background: "#FFFFFF",
//                     border: "1px solid rgba(0, 0, 0, 0.43)",
//                     boxShadow: "0px 4px 14.5px -2px rgba(0, 0, 0, 0.25)",
//                     borderRadius: "8px",
//                     overflow: "hidden",
//                     display: "flex",
//                     flexDirection: "column",
//                   }}
//                 >
//                   {/* Top Live Video Screen Box (Height: 233px) */}
//                   <div
//                     style={{
//                       position: "relative",
//                       width: "100%",
//                       height: "233px",
//                       background: camera.videoUrl
//                         ? `url(${camera.videoUrl}) center/cover no-repeat`
//                         : "linear-gradient(135deg, #1E293B 0%, #0F172A 100%)",
//                       cursor: "pointer",
//                     }}
//                     onClick={() => setActiveCameraFeed(camera)}
//                   >
//                     {/* LIVE Badge Top Right */}
//                     <div
//                       style={{
//                         position: "absolute",
//                         top: "8px",
//                         right: "8px",
//                         width: "27px",
//                         height: "13px",
//                         background: "#DC2626",
//                         borderRadius: "2px",
//                         display: "flex",
//                         alignItems: "center",
//                         justifyContent: "center",
//                       }}
//                     >
//                       <span
//                         style={{
//                           fontFamily: "'Plus Jakarta Sans', sans-serif",
//                           fontWeight: 700,
//                           fontSize: "8px",
//                           lineHeight: "10px",
//                           color: "#FFFFFF",
//                         }}
//                       >
//                         LIVE
//                       </span>
//                     </div>

//                     {/* Timestamp Bottom Left */}
//                     <div
//                       style={{
//                         position: "absolute",
//                         bottom: "8px",
//                         left: "8px",
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 700,
//                         fontSize: "8px",
//                         lineHeight: "10px",
//                         color: "#FFFFFF",
//                         background: "rgba(0,0,0,0.5)",
//                         padding: "2px 6px",
//                         borderRadius: "3px",
//                       }}
//                     >
//                       {currentTime || "11:30:42 AM"}
//                     </div>
//                   </div>

//                   {/* Bottom Footer Row (Height: 57px) */}
//                   <div
//                     style={{
//                       height: "57px",
//                       padding: "0 14px",
//                       display: "flex",
//                       alignItems: "center",
//                       justifyContent: "space-between",
//                       background: "#FFFFFF",
//                     }}
//                   >
//                     {/* Camera Name */}
//                     <span
//                       style={{
//                         fontFamily: "'Plus Jakarta Sans', sans-serif",
//                         fontWeight: 700,
//                         fontSize: "14px",
//                         lineHeight: "18px",
//                         color: "#0C2A42",
//                         whiteSpace: "nowrap",
//                         overflow: "hidden",
//                         textOverflow: "ellipsis",
//                       }}
//                     >
//                       {camera.name}
//                     </span>

//                     {/* Right Icons: Star & Fullscreen */}
//                     <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
//                       {/* Star Favorite Button */}
//                       <button
//                         type="button"
//                         onClick={() => handleToggleFavorite(camera.id)}
//                         style={{
//                           background: "transparent",
//                           border: "none",
//                           cursor: "pointer",
//                           padding: "4px",
//                           display: "flex",
//                           alignItems: "center",
//                         }}
//                       >
//                         <Star
//                           size={18}
//                           color={camera.isFavorite ? "#F4BC43" : "#94A3B8"}
//                           fill={camera.isFavorite ? "#F4BC43" : "none"}
//                         />
//                       </button>

//                       {/* Fullscreen Maximize Button */}
//                       <button
//                         type="button"
//                         onClick={() => setActiveCameraFeed(camera)}
//                         style={{
//                           width: "31px",
//                           height: "28px",
//                           background: "#FFFFFF",
//                           border: "0.5px solid rgba(179, 175, 175, 0.51)",
//                           borderRadius: "4px",
//                           display: "flex",
//                           alignItems: "center",
//                           justifyContent: "center",
//                           cursor: "pointer",
//                         }}
//                       >
//                         <Maximize2 size={16} color="#000000" />
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ── ADD / EDIT RECORDER MODAL ── */}
//       <AddRecorderModal
//         isOpen={isAddModalOpen}
//         onClose={() => {
//           setIsAddModalOpen(false);
//           setEditingRecorder(null);
//         }}
//         onAddRecorder={handleSaveRecorder}
//         initialData={editingRecorder}
//       />

//       {/* ── DELETE RECORDER CONFIRMATION MODAL ── */}
//       <DeleteRecorderModal
//         isOpen={isDeleteModalOpen}
//         onClose={() => setIsDeleteModalOpen(false)}
//         recorderName={recorder?.name || ""}
//         onConfirmDelete={handleConfirmDelete}
//       />

//       {/* ── FULL SCREEN CAMERA FEED INSPECTION MODAL ── */}
//       {activeCameraFeed && (
//         <CameraFeedModal
//           isOpen={!!activeCameraFeed}
//           onClose={() => setActiveCameraFeed(null)}
//           cameraName={activeCameraFeed.name}
//           locationName={recorder?.location || "Nahargarh Fort, Jaipur"}
//           isFavorite={activeCameraFeed.isFavorite}
//           onToggleFavorite={() => handleToggleFavorite(activeCameraFeed.id)}
//           videoBgUrl={activeCameraFeed.videoUrl}
//         />
//       )}

//       {/* ── STYLES ── */}
//       <style>{`
//         .cctv-add-rec-btn:hover {
//           background: #173F63 !important;
//           transform: translateY(-1px);
//         }
//         .rec-action-btn:hover {
//           background: #F0F4F8 !important;
//         }
//         .rec-delete-btn:hover {
//           background: #FEF2F2 !important;
//           border-color: #EF4444 !important;
//           color: #EF4444 !important;
//         }
//         .refresh-btn:hover {
//           background: #F8FAFC !important;
//           border-color: #0C2A42 !important;
//         }
//       `}</style>
//     </div>
//   );
// }


export default function CCTVMonitoringPage() {
  return <UnderConstruction title={META_CONSTANTS.cctvMonitoring.fullTitle} />;
}
