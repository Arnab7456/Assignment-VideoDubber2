"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Play, Pause, Square, ChevronLeft, ChevronRight, Settings, Volume2, VolumeX } from "lucide-react"

export default function VideoEditor() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [mediaElements, setMediaElements] = useState<MediaElement[]>([])
  const [selectedMedia, setSelectedMedia] = useState<MediaElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({})
  const videoPlayPromises = useRef<{ [key: string]: Promise<void> | null }>({})
  const tempVideoRef = useRef<HTMLVideoElement | null>(null)
  const [muted, setMuted] = useState(false)
  const [projectDuration, setProjectDuration] = useState(60)

  type MediaElement = {
    id: string
    type: "image" | "video"
    src: string
    position: { x: number; y: number }
    size: { width: number; height: number }
    timing: { start: number; end: number }
    volume: number
    duration?: number
    isPlaying?: boolean
  }

  // Get video duration
  const getVideoDuration = (videoSrc: string): Promise<number> => {
    return new Promise((resolve) => {
      if (!tempVideoRef.current) {
        tempVideoRef.current = document.createElement("video")
      }

      const video = tempVideoRef.current

      video.onloadedmetadata = () => {
        resolve(video.duration)
      }

      video.onerror = () => {
        console.error("Error loading video metadata")
        resolve(30) 
      }

      video.src = videoSrc
    })
  }

  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith("video/")
    const reader = new FileReader()

    reader.onload = async (e) => {
      const src = e.target?.result as string

      let duration = 10
      if (isVideo) {
        duration = await getVideoDuration(src)
      }
      if (duration > projectDuration) {
        setProjectDuration(Math.ceil(duration))
      }

      const newMedia: MediaElement = {
        id: `media-${Date.now()}`,
        type: isVideo ? "video" : "image",
        src,
        position: { x: 50, y: 50 },
        size: { width: 300, height: isVideo ? 200 : 300 },
        timing: { start: 0, end: duration },
        volume: 1,
        duration: isVideo ? duration : undefined,
        isPlaying: false,
      }

      setMediaElements((prev) => [...prev, newMedia])
      setSelectedMedia(newMedia)
      setShowUploadModal(false)
    }

    reader.readAsDataURL(file)
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }

  const handleDragStart = (e: React.MouseEvent, mediaId: string) => {
    e.preventDefault()
    const media = mediaElements.find((m) => m.id === mediaId)
    if (!media) return

    setSelectedMedia(media)

    const startX = e.clientX
    const startY = e.clientY
    const startLeft = media.position.x
    const startTop = media.position.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      const canvas = canvasRef.current
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()

      setMediaElements(
        mediaElements.map((m) => {
          if (m.id === mediaId) {
            const newX = Math.max(0, Math.min(canvasRect.width - m.size.width, startLeft + dx))
            const newY = Math.max(0, Math.min(canvasRect.height - m.size.height, startTop + dy))

            return {
              ...m,
              position: {
                x: newX,
                y: newY,
              },
            }
          }
          return m
        }),
      )
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const handleResizeStart = (e: React.MouseEvent, mediaId: string, direction: string) => {
    e.preventDefault()
    e.stopPropagation()

    const media = mediaElements.find((m) => m.id === mediaId)
    if (!media) return

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = media.size.width
    const startHeight = media.size.height
    const startLeft = media.position.x
    const startTop = media.position.y

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      const canvas = canvasRef.current
      if (!canvas) return

      const canvasRect = canvas.getBoundingClientRect()

      setMediaElements(
        mediaElements.map((m) => {
          if (m.id === mediaId) {
            let newWidth = startWidth
            let newHeight = startHeight
            let newX = startLeft
            let newY = startTop

            if (direction.includes("e")) {
              newWidth = Math.max(50, Math.min(canvasRect.width - startLeft, startWidth + dx))
            }
            if (direction.includes("s")) {
              newHeight = Math.max(50, Math.min(canvasRect.height - startTop, startHeight + dy))
            }
            if (direction.includes("w")) {
              const maxDx = startWidth - 50
              const actualDx = Math.max(-maxDx, Math.min(startLeft, dx))
              newWidth = startWidth - actualDx
              newX = startLeft + actualDx
            }
            if (direction.includes("n")) {
              const maxDy = startHeight - 50
              const actualDy = Math.max(-maxDy, Math.min(startTop, dy))
              newHeight = startHeight - actualDy
              newY = startTop + actualDy
            }

            return {
              ...m,
              position: { x: newX, y: newY },
              size: { width: newWidth, height: newHeight },
            }
          }
          return m
        }),
      )
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  const updateMediaDimensions = (width: number, height: number) => {
    if (!selectedMedia) return

    const canvas = canvasRef.current
    if (!canvas) return

    const canvasRect = canvas.getBoundingClientRect()

    const constrainedWidth = Math.min(width, canvasRect.width - selectedMedia.position.x)
    const constrainedHeight = Math.min(height, canvasRect.height - selectedMedia.position.y)

    setMediaElements(
      mediaElements.map((m) => {
        if (m.id === selectedMedia.id) {
          return {
            ...m,
            size: {
              width: Math.max(50, constrainedWidth),
              height: Math.max(50, constrainedHeight),
            },
          }
        }
        return m
      }),
    )
  }

  const updateMediaTiming = (start: number, end: number) => {
    if (!selectedMedia) return

    let maxEnd = projectDuration
    if (selectedMedia.type === "video" && selectedMedia.duration) {
      maxEnd = Math.min(projectDuration, start + selectedMedia.duration)
    }

    setMediaElements(
      mediaElements.map((m) => {
        if (m.id === selectedMedia.id) {
          return {
            ...m,
            timing: {
              start: Math.max(0, start),
              end: Math.min(maxEnd, Math.max(start + 0.1, end)),
            },
          }
        }
        return m
      }),
    )
  }

  
  const updateProjectDuration = (duration: number) => {
    setProjectDuration(Math.max(1, duration))
  }

  const updateMediaVolume = (volume: number) => {
    if (!selectedMedia) return

    setMediaElements(
      mediaElements.map((m) => {
        if (m.id === selectedMedia.id) {
          return {
            ...m,
            volume: volume,
          }
        }
        return m
      }),
    )

    if (selectedMedia.type === "video") {
      const videoEl = videoRefs.current[selectedMedia.id]
      if (videoEl) {
        videoEl.volume = muted ? 0 : volume
      }
    }
  }

  const safePlayVideo = (videoEl: HTMLVideoElement, mediaId: string) => {
    if (videoPlayPromises.current[mediaId]) {
      return
    }

    try {
      const playPromise = videoEl.play()

      if (playPromise !== undefined) {
        videoPlayPromises.current[mediaId] = playPromise

        playPromise
          .then(() => {
            videoPlayPromises.current[mediaId] = null

            setMediaElements((prev) => prev.map((m) => (m.id === mediaId ? { ...m, isPlaying: true } : m)))
            setMediaElements((prev) => prev.map((m) => (m.id === mediaId ? { ...m, isPlaying: true } : m)))
          })
          .catch((error) => {
            videoPlayPromises.current[mediaId] = null
            console.log("Play promise rejected:", error)
          })
      }
    } catch (error) {
      console.error("Error playing video:", error)
    }
  }

  const safePauseVideo = (videoEl: HTMLVideoElement, mediaId: string) => {
    const playPromise = videoPlayPromises.current[mediaId]

    if (playPromise) {
      playPromise
        .then(() => {
          videoEl.pause()
          videoPlayPromises.current[mediaId] = null

          setMediaElements((prev) => prev.map((m) => (m.id === mediaId ? { ...m, isPlaying: false } : m)))
        })
        .catch((error) => {
          videoPlayPromises.current[mediaId] = null
          console.log("Play promise rejected:", error)
        })
    } else {
      videoEl.pause()

      setMediaElements((prev) => prev.map((m) => (m.id === mediaId ? { ...m, isPlaying: false } : m)))
    }
  }
  const togglePlay = () => {
    if (isPlaying) {
      pauseAllVideos()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      setIsPlaying(false)
    } else {
      startTimeRef.current = Date.now() - currentTime * 1000
      playVideosInRange()
      startPlayback()
      setIsPlaying(true)
    }
  }

  const startPlayback = () => {
    const animate = () => {
      const elapsedTime = (Date.now() - startTimeRef.current) / 1000
      setCurrentTime(elapsedTime)

      updateVideoPlayback(elapsedTime)

      if (elapsedTime >= projectDuration) {
        resetPlayback()
        return
      }

      animationRef.current = requestAnimationFrame(animate)
    }
    animationRef.current = requestAnimationFrame(animate)
  }

  const resetPlayback = () => {
    pauseAllVideos()
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    setIsPlaying(false)
    setCurrentTime(0)

    
    Object.entries(videoRefs.current).forEach(([id, videoEl]) => {
      if (videoEl) {
        videoEl.currentTime = 0
      }
    })
  }

  const updateVideoPlayback = (currentTime: number) => {
    mediaElements.forEach((media) => {
      if (media.type === "video") {
        const videoEl = videoRefs.current[media.id]
        if (!videoEl) return

        const isInRange = currentTime >= media.timing.start && currentTime <= media.timing.end

        if (isInRange) {
          const videoTime = currentTime - media.timing.start

          if (Math.abs(videoTime - videoEl.currentTime) > 0.2) {
            videoEl.currentTime = videoTime
          }

          videoEl.volume = muted ? 0 : media.volume

          if (videoEl.paused && !media.isPlaying) {
            safePlayVideo(videoEl, media.id)
          }
        } else if (!videoEl.paused || media.isPlaying) {
          safePauseVideo(videoEl, media.id)
        }
      }
    })
  }

  const pauseAllVideos = () => {
    mediaElements.forEach((media) => {
      if (media.type === "video") {
        const videoEl = videoRefs.current[media.id]
        if (videoEl && (!videoEl.paused || media.isPlaying)) {
          safePauseVideo(videoEl, media.id)
        }
      }
    })
  }

  const playVideosInRange = () => {
    mediaElements.forEach((media) => {
      if (media.type === "video") {
        const videoEl = videoRefs.current[media.id]
        if (!videoEl) return

        const isInRange = currentTime >= media.timing.start && currentTime <= media.timing.end

        if (isInRange) {
          const videoTime = currentTime - media.timing.start

          if (Math.abs(videoTime - videoEl.currentTime) > 0.2) {
            videoEl.currentTime = videoTime
          }

          videoEl.volume = muted ? 0 : media.volume

          if (videoEl.paused && !media.isPlaying) {
            safePlayVideo(videoEl, media.id)
          }
        }
      }
    })
  }

  const toggleMute = () => {
    const newMutedState = !muted
    setMuted(newMutedState)

    mediaElements.forEach((media) => {
      if (media.type === "video") {
        const videoEl = videoRefs.current[media.id]
        if (videoEl) {
          videoEl.muted = newMutedState
        }
      }
    })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const secs = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0")
    const tenths = Math.floor((seconds % 1) * 10)
    return `${mins}:${secs}.${tenths}`
  }

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      if (tempVideoRef.current) {
        tempVideoRef.current.src = ""
        tempVideoRef.current = null
      }

      pauseAllVideos()
    }
  }, [])
  useEffect(() => {
    mediaElements.forEach((media) => {
      if (media.type === "video" && !videoRefs.current[media.id]) {
        videoRefs.current[media.id] = null
        videoPlayPromises.current[media.id] = null
      }
    })

    Object.keys(videoRefs.current).forEach((id) => {
      if (!mediaElements.some((m) => m.id === id)) {
        delete videoRefs.current[id]
        delete videoPlayPromises.current[id]
      }
    })
  }, [mediaElements])

  const getTimeMarkers = () => {
    const count = 6
    const interval = Math.ceil(projectDuration / count)
    return Array.from({ length: count + 1 }, (_, i) => i * interval)
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center border-b p-2 bg-background">
        <button className="p-2 rounded-md hover:bg-muted">
          <Settings className="h-5 w-5" />
        </button>
        <div className="flex items-center mx-4">
          <span className="font-medium">Facebook Story</span>
        </div>
        <div className="flex items-center ml-auto">
          <div className="flex items-center space-x-2 mr-4">
            <span className="text-sm text-muted-foreground">Save your project for later —</span>
            <Button variant="link" className="text-sm px-1 text-blue-500">
              sign up
            </Button>
            <span className="text-sm text-muted-foreground">or</span>
            <Button variant="link" className="text-sm px-1 text-blue-500">
              log in
            </Button>
          </div>
          <Button variant="default" className="ml-2 bg-amber-500 hover:bg-amber-600">
            Upgrade
          </Button>
          <Button variant="secondary" className="ml-2 bg-gray-900 text-white hover:bg-gray-800">
            Done
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={30}>
            <div className="h-full bg-background border-r p-4 overflow-y-auto">
              <h2 className="font-semibold text-lg mb-4">Media Properties</h2>

              {selectedMedia ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Dimensions</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="width" className="text-xs">
                          Width (px)
                        </Label>
                        <Input
                          id="width"
                          type="number"
                          value={selectedMedia.size.width}
                          onChange={(e) =>
                            updateMediaDimensions(Number(e.target.value) || 0, selectedMedia.size.height)
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="height" className="text-xs">
                          Height (px)
                        </Label>
                        <Input
                          id="height"
                          type="number"
                          value={selectedMedia.size.height}
                          onChange={(e) => updateMediaDimensions(selectedMedia.size.width, Number(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-medium">Timing</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="startTime" className="text-xs">
                          Start Time (s)
                        </Label>
                        <Input
                          id="startTime"
                          type="number"
                          value={selectedMedia.timing.start}
                          onChange={(e) => updateMediaTiming(Number(e.target.value) || 0, selectedMedia.timing.end)}
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime" className="text-xs">
                          End Time (s)
                        </Label>
                        <Input
                          id="endTime"
                          type="number"
                          value={selectedMedia.timing.end}
                          onChange={(e) => updateMediaTiming(selectedMedia.timing.start, Number(e.target.value) || 0)}
                          className="h-8"
                        />
                      </div>
                    </div>
                    {selectedMedia.type === "video" && selectedMedia.duration && (
                      <div className="text-xs text-muted-foreground">
                        Video duration: {formatTime(selectedMedia.duration)}
                      </div>
                    )}
                  </div>
                  {selectedMedia.type === "video" && (
                    <div className="space-y-2">
                      <h3 className="font-medium">Volume</h3>
                      <div className="flex items-center space-x-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={selectedMedia.volume}
                          onChange={(e) => updateMediaVolume(Number(e.target.value))}
                          className="flex-1"
                        />
                        <span className="text-xs w-8 text-right">{Math.round(selectedMedia.volume * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No media selected</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <h2 className="font-semibold text-lg mb-4">Project Settings</h2>

                <div className="space-y-2">
                  <h3 className="font-medium">Project Duration</h3>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="projectDuration"
                      type="number"
                      value={projectDuration}
                      onChange={(e) => updateProjectDuration(Number(e.target.value) || 60)}
                      className="h-8"
                    />
                    <span className="text-sm">seconds</span>
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full mt-4" onClick={() => setShowUploadModal(true)}>
                <Upload className="w-4 h-4 mr-2" /> Add Media
              </Button>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          <ResizablePanel defaultSize={75}>
            <div className="h-full flex flex-col bg-black">
              <div className="flex-1 flex items-center justify-center p-4">
                <div
                  ref={canvasRef}
                  className="bg-black relative overflow-hidden"
                  style={{ width: "100%", height: "90%", maxWidth: "1280px", maxHeight: "720px" }}
                >
                  {mediaElements.map((media) => {
                    const isVisible = currentTime >= media.timing.start && currentTime <= media.timing.end

                    if (!isVisible && isPlaying) return null

                    return (
                      <div
                        key={media.id}
                        style={{
                          position: "absolute",
                          left: `${media.position.x}px`,
                          top: `${media.position.y}px`,
                          width: `${media.size.width}px`,
                          height: `${media.size.height}px`,
                          border: selectedMedia?.id === media.id ? "2px solid #3b82f6" : "none",
                          cursor: "move",
                          overflow: "hidden",
                        }}
                        onMouseDown={(e) => handleDragStart(e, media.id)}
                      >
                        {media.type === "image" ? (
                          <img
                            src={media.src || "/placeholder.svg"}
                            alt="Media"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                          />
                        ) : (
                          <video
                            ref={(el) => {
                              videoRefs.current[media.id] = el
                            }}
                            src={media.src}
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            controls={false}
                            muted={muted}
                            loop={false}
                            playsInline
                            onLoadedMetadata={(e) => {
                              const video = e.currentTarget
                              if (
                                video.duration &&
                                (!media.duration || Math.abs(video.duration - media.duration) > 0.5)
                              ) {
                                setMediaElements((prev) =>
                                  prev.map((m) =>
                                    m.id === media.id
                                      ? {
                                          ...m,
                                          duration: video.duration,
                                          timing: {
                                            ...m.timing,
                                            end: Math.min(projectDuration, m.timing.start + video.duration),
                                          },
                                        }
                                      : m,
                                  ),
                                )
                                if (video.duration + media.timing.start > projectDuration) {
                                  setProjectDuration(Math.ceil(video.duration + media.timing.start))
                                }
                              }
                            }}
                          />
                        )}
                        {selectedMedia?.id === media.id && (
                          <>
                            <div
                              className="absolute w-6 h-6 bg-white border border-blue-500 rounded-full right-0 bottom-0 transform translate-x-1/2 translate-y-1/2 cursor-se-resize"
                              onMouseDown={(e) => handleResizeStart(e, media.id, "se")}
                            />
                            <div
                              className="absolute w-6 h-6 bg-white border border-blue-500 rounded-full left-0 bottom-0 transform -translate-x-1/2 translate-y-1/2 cursor-sw-resize"
                              onMouseDown={(e) => handleResizeStart(e, media.id, "sw")}
                            />
                            <div
                              className="absolute w-6 h-6 bg-white border border-blue-500 rounded-full right-0 top-0 transform translate-x-1/2 -translate-y-1/2 cursor-ne-resize"
                              onMouseDown={(e) => handleResizeStart(e, media.id, "ne")}
                            />
                            <div
                              className="absolute w-6 h-6 bg-white border border-blue-500 rounded-full left-0 top-0 transform -translate-x-1/2 -translate-y-1/2 cursor-nw-resize"
                              onMouseDown={(e) => handleResizeStart(e, media.id, "nw")}
                            />
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="h-24 border-t bg-background p-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Button variant="ghost" size="sm" onClick={resetPlayback} className="px-2">
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={togglePlay} className="px-2">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={toggleMute} className="px-2">
                      {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <div className="ml-2 text-sm font-medium">
                      {formatTime(currentTime)} / {formatTime(projectDuration)}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Button variant="ghost" size="sm" className="px-2">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="px-2">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="relative h-12 border border-gray-200 rounded-md bg-gray-50">
                  <div className="absolute top-0 left-0 right-0 h-full overflow-x-auto">
                    <div className="relative w-full h-full" style={{ minWidth: "1000px" }}>
                      <div className="flex h-6 border-b text-xs text-muted-foreground">
                        {getTimeMarkers().map((second) => (
                          <div
                            key={second}
                            className="flex items-end pb-1 border-r pr-1"
                            style={{ width: `${(second / projectDuration) * 100}%` }}
                          >
                            {second}s
                          </div>
                        ))}
                      </div>

                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary z-10"
                        style={{ left: `${(currentTime / projectDuration) * 100}%` }}
                      ></div>
                      {mediaElements.map((media) => (
                        <div
                          key={`timeline-${media.id}`}
                          className={`absolute h-6 rounded-sm ${selectedMedia?.id === media.id ? "bg-blue-500" : "bg-gray-500"}`}
                          style={{
                            left: `${(media.timing.start / projectDuration) * 100}%`,
                            width: `${((media.timing.end - media.timing.start) / projectDuration) * 100}%`,
                            bottom: "0",
                            opacity: 0.7,
                          }}
                          onClick={() => setSelectedMedia(media)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-[500px] max-w-[90vw]">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">Upload Media</h2>
              <button onClick={() => setShowUploadModal(false)}>
                <span className="text-lg">&times;</span>
              </button>
            </div>

            <div className="p-8">
              <div
                className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center cursor-pointer hover:bg-gray-50"
                onClick={triggerFileUpload}
              >
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <Upload className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-lg mb-1">Upload files</p>
                <p className="text-sm text-muted-foreground mb-4">Choose files or drag them here</p>
                <Button variant="outline" className="cursor-pointer">
                  Choose files
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

