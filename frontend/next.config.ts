import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Taqdimot va hujjatlar (PPTX, PDF…) yuklash uchun so'rov hajmi chegarasi (standart — 1 MB).
  // Backend o'zi ham tekshiradi: rasm/video 25 MB, hujjat 100 MB.
  experimental: { serverActions: { bodySizeLimit: "110mb" } },
};

export default nextConfig;
