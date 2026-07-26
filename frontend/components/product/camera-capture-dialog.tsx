"use client"

import { useRef, useState, useCallback, useEffect } from "react"
import { Camera, X, RotateCcw, Check, CameraOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useTranslation } from "@/src/context/I18nContext"

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}

type CameraFacing = "environment" | "user"

export function CameraCaptureDialog({ open, onOpenChange, onCapture }: CameraCaptureDialogProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [facingMode, setFacingMode] = useState<CameraFacing>("environment")

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const startCamera = useCallback(
    async (facing: CameraFacing = facingMode) => {
      setIsStarting(true)
      setCameraError(null)
      setCapturedImage(null)
      stopStream()

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch (err: any) {
        const msg =
          err?.name === "NotAllowedError"
            ? t("cameraCapture.errorPermission")
            : err?.name === "NotFoundError"
              ? t("cameraCapture.errorNotFound")
              : t("cameraCapture.errorGeneric")
        setCameraError(msg)
      } finally {
        setIsStarting(false)
      }
    },
    [facingMode, stopStream, t]
  )

  // Start/stop camera when dialog opens/closes
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopStream()
      setCapturedImage(null)
      setCameraError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedImage(dataUrl)
    stopStream()
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleFlipCamera = () => {
    const next: CameraFacing = facingMode === "environment" ? "user" : "environment"
    setFacingMode(next)
    startCamera(next)
  }

  const handleConfirm = () => {
    if (!capturedImage) return

    // Convert data URL to File
    const byteString = atob(capturedImage.split(",")[1])
    const mimeString = capturedImage.split(",")[0].split(":")[1].split(";")[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([ab], { type: mimeString })
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" })

    onCapture(file)
    onOpenChange(false)
  }

  const handleClose = () => {
    stopStream()
    setCapturedImage(null)
    setCameraError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t("cameraCapture.title")}
          </DialogTitle>
          <DialogDescription>{t("cameraCapture.description")}</DialogDescription>
        </DialogHeader>

        <div className="relative bg-black w-full" style={{ aspectRatio: "16/9" }}>
          {/* Camera error state */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3 px-6">
              <CameraOff className="h-12 w-12 opacity-60" />
              <p className="text-sm text-center opacity-80">{cameraError}</p>
              <Button variant="secondary" size="sm" onClick={() => startCamera()}>
                {t("cameraCapture.tryAgain")}
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isStarting && !cameraError && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-sm opacity-70">{t("cameraCapture.starting")}</p>
              </div>
            </div>
          )}

          {/* Captured image preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="absolute inset-0 w-full h-full object-contain"
            />
          )}

          {/* Live video feed */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${capturedImage ? "hidden" : ""}`}
            playsInline
            muted
            autoPlay
          />

          {/* Hidden canvas for snapshot */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Flip camera button — only show when live */}
          {!capturedImage && !cameraError && !isStarting && (
            <button
              type="button"
              onClick={handleFlipCamera}
              className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
              title={t("cameraCapture.flip")}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
          <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4 mr-1" />
            {t("cameraCapture.cancel")}
          </Button>

          {capturedImage ? (
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRetake}>
                <RotateCcw className="h-4 w-4 mr-1" />
                {t("cameraCapture.retake")}
              </Button>
              <Button type="button" size="sm" onClick={handleConfirm}>
                <Check className="h-4 w-4 mr-1" />
                {t("cameraCapture.usePhoto")}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleCapture}
              disabled={!!cameraError || isStarting}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              {t("cameraCapture.capture")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
