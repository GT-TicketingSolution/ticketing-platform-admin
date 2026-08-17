export interface CameraItem {
  id: string;
  name: string;
  isFavorite: boolean;
  videoUrl?: string;
  isLive: boolean;
}

export interface RecorderData {
  id: string;
  recorderName: string;
  ipAddress: string;
  port: string;
  channelCount: number;
  status: "Online" | "Offline";
}
