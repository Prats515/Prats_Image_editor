"use client";

import { useCallback, useEffect, useRef } from "react";
import styles from "../editor.module.css";

interface MaskCanvasProps {
  imageUrl: string;
  brushSize: number;
  onMaskChange: (maskDataUrl: string, coverage: number) => void;
  clearToken: number;
}

export function MaskCanvas({
  imageUrl,
  brushSize,
  onMaskChange,
  clearToken,
}: MaskCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  const exportMask = useCallback(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, mask.width, mask.height);
    let painted = 0;
    const total = mask.width * mask.height;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] > 0) painted++;
    }
    const coverage = total > 0 ? painted / total : 0;
    onMaskChange(mask.toDataURL("image/png"), coverage);
  }, [onMaskChange]);

  const resizeCanvas = useCallback(() => {
    const img = imageRef.current;
    const mask = maskRef.current;
    if (!img || !mask || !img.complete) return;

    const w = img.clientWidth;
    const h = img.clientHeight;
    mask.width = w;
    mask.height = h;
    mask.style.width = `${w}px`;
    mask.style.height = `${h}px`;
    exportMask();
  }, [exportMask]);

  useEffect(() => {
    const img = imageRef.current;
    if (!img) return;
    const onLoad = () => resizeCanvas();
    img.addEventListener("load", onLoad);
    window.addEventListener("resize", resizeCanvas);
    return () => {
      img.removeEventListener("load", onLoad);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [imageUrl, resizeCanvas]);

  useEffect(() => {
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, mask.width, mask.height);
    exportMask();
  }, [clearToken, exportMask]);

  const paint = (clientX: number, clientY: number) => {
    const mask = maskRef.current;
    if (!mask) return;
    const rect = mask.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "rgba(255, 0, 0, 0.55)";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    exportMask();
  };

  return (
    <div ref={containerRef} className={styles.inpaintCanvasWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Source for inpainting"
        className={styles.inpaintSourceImage}
        draggable={false}
      />
      <canvas
        ref={maskRef}
        className={styles.inpaintMaskCanvas}
        onPointerDown={(e) => {
          drawingRef.current = true;
          maskRef.current?.setPointerCapture(e.pointerId);
          paint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (!drawingRef.current) return;
          paint(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          drawingRef.current = false;
        }}
        onPointerLeave={() => {
          drawingRef.current = false;
        }}
      />
    </div>
  );
}
