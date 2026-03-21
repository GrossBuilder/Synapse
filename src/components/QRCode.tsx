"use client";

import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
}

export default function QRCode({ data, size = 200, className = "" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !data) return;
    QRCodeLib.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 2,
      color: { dark: "#000000", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });
  }, [data, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
    />
  );
}
