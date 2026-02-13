"use client"

import type React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import {
  Save,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Type,
  ImageIcon,
  Layout,
  Mail,
  Trash2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit3,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Palette,
  Settings,
  X,
  GripVertical,
  Move,
  Maximize2,
  Grid3X3,
  MousePointer,
  Upload,
  Minus,
} from "lucide-react"

// Types
interface NewsletterBlock {
  id: string
  type: "header" | "text" | "image" | "button" | "divider"
  content: any
  styles: any
  order: number
  position?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface NewsletterTemplate {
  id?: string
  title: string
  subject: string
  blocks: NewsletterBlock[]
  status: "draft" | "sent" | "scheduled"
  createdAt: string
  updatedAt: string
  globalStyles: {
    primaryColor: string
    backgroundColor: string
    contentWidth: number
    contentHeight: number
    fontFamily: string
  }
}

interface NewsletterBuilderProps {
  templateId?: string
  initialTemplate?: NewsletterTemplate
  onSave?: (template: NewsletterTemplate) => void
}

interface DragState {
  isDragging: boolean
  draggedBlockId: string | null
  draggedBlockType: string | null
  dragOffset: { x: number; y: number }
  dropZones: Array<{
    id: string
    rect: DOMRect
    type: "before" | "after" | "inside"
    targetBlockId?: string
  }>
  activeDropZone: string | null
}

// Helper function to extract siteId from pathname
function extractSiteIdFromPath(pathname: string): string | null {
  const pathSegments = pathname.split("/")
  const siteIndex = pathSegments.indexOf("sites")
  if (siteIndex !== -1 && pathSegments[siteIndex + 1]) {
    return pathSegments[siteIndex + 1]
  }
  return null
}

function formatUrl(url: string): string {
  if (!url || url === "#") return "#"
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

// WYSIWYG Text Editor Component with event handling
function WYSIWYGEditor({
  content,
  onChange,
  placeholder = "Tapez votre texte ici...",
}: {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isUpdatingRef = useRef(false)
  const lastContentRef = useRef(content)

  // Save and restore cursor position
  const saveCursorPosition = useCallback(() => {
    if (!editorRef.current) return null

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return null

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editorRef.current)
    preCaretRange.setEnd(range.startContainer, range.startOffset)

    return {
      start: preCaretRange.toString().length,
      end: preCaretRange.toString().length + range.toString().length,
    }
  }, [])

  const restoreCursorPosition = useCallback((position: { start: number; end: number } | null) => {
    if (!editorRef.current || !position) return

    const selection = window.getSelection()
    if (!selection) return

    try {
      const range = document.createRange()
      let charIndex = 0
      let startNode: Node | null = null
      let endNode: Node | null = null
      let startOffset = 0
      let endOffset = 0

      const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT, null)

      let node: Node | null
      while ((node = walker.nextNode())) {
        const textLength = node.textContent?.length || 0

        if (!startNode && charIndex + textLength >= position.start) {
          startNode = node
          startOffset = position.start - charIndex
        }

        if (!endNode && charIndex + textLength >= position.end) {
          endNode = node
          endOffset = position.end - charIndex
          break
        }

        charIndex += textLength
      }

      if (startNode) {
        range.setStart(startNode, Math.min(startOffset, startNode.textContent?.length || 0))
        range.setEnd(endNode || startNode, Math.min(endOffset, (endNode || startNode).textContent?.length || 0))

        selection.removeAllRanges()
        selection.addRange(range)
      }
    } catch (error) {
      console.warn("Could not restore cursor position:", error)
    }
  }, [])

  const handleCommand = useCallback(
    (command: string, value?: string) => {
      if (!editorRef.current) return

      const cursorPos = saveCursorPosition()
      editorRef.current.focus()

      try {
        document.execCommand(command, false, value)

        const newContent = editorRef.current.innerHTML
        if (newContent !== lastContentRef.current) {
          lastContentRef.current = newContent
          onChange(newContent)
        }

        // Restore cursor position after a brief delay
        setTimeout(() => {
          restoreCursorPosition(cursorPos)
        }, 10)
      } catch (error) {
        console.warn("Command execution failed:", error)
      }
    },
    [onChange, saveCursorPosition, restoreCursorPosition],
  )

  const handleAlignment = useCallback(
    (alignment: "left" | "center" | "right") => {
      if (!editorRef.current) return

      const cursorPos = saveCursorPosition()
      editorRef.current.focus()

      try {
        document.execCommand(`justify${alignment.charAt(0).toUpperCase() + alignment.slice(1)}`, false)

        const newContent = editorRef.current.innerHTML
        if (newContent !== lastContentRef.current) {
          lastContentRef.current = newContent
          onChange(newContent)
        }

        setTimeout(() => {
          restoreCursorPosition(cursorPos)
        }, 10)
      } catch (error) {
        console.warn("Alignment command failed:", error)
      }
    },
    [onChange, saveCursorPosition, restoreCursorPosition],
  )

  const handleInput = useCallback(
    (e: React.FormEvent) => {
      if (!editorRef.current || isUpdatingRef.current) return

      const newContent = editorRef.current.innerHTML

      if (newContent !== lastContentRef.current) {
        lastContentRef.current = newContent
        onChange(newContent)
      }
    },
    [onChange],
  )

  const handleFocus = useCallback(() => {
    setIsEditing(true)
  }, [])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't hide toolbar if clicking on toolbar buttons
    if (e.relatedTarget && (e.relatedTarget as HTMLElement).closest(".editor-toolbar")) {
      return
    }
    setTimeout(() => setIsEditing(false), 200)
  }, [])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "a":
            // Allow Ctrl+A to select all text
            e.stopPropagation()
            break
          case "b":
            e.preventDefault()
            handleCommand("bold")
            break
          case "i":
            e.preventDefault()
            handleCommand("italic")
            break
          case "u":
            e.preventDefault()
            handleCommand("underline")
            break
        }
      }
    },
    [handleCommand],
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Prevent event bubbling during text selection
    if (window.getSelection()?.toString()) {
      e.stopPropagation()
    }
  }, [])

  // Only update content when it changes from outside and we're not currently editing
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current && content !== lastContentRef.current) {
      // Only update if the editor is not focused (external update)
      if (document.activeElement !== editorRef.current) {
        const cursorPos = saveCursorPosition()
        editorRef.current.innerHTML = content || `<p>${placeholder}</p>`
        lastContentRef.current = content

        // Restore cursor if we had one
        if (cursorPos && document.activeElement === editorRef.current) {
          restoreCursorPosition(cursorPos)
        }
      }
    }
  }, [content, placeholder, saveCursorPosition, restoreCursorPosition])

  // Initialize content on mount
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content || `<p>${placeholder}</p>`
      lastContentRef.current = content
    }
  }, [])

  return (
    <div ref={containerRef} className="relative">
      {isEditing && (
        <div className="editor-toolbar absolute -top-12 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center gap-2 z-10">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleCommand("bold")}
            className="p-1 hover:bg-gray-100 rounded"
            title="Gras (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleCommand("italic")}
            className="p-1 hover:bg-gray-100 rounded"
            title="Italique (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleCommand("underline")}
            className="p-1 hover:bg-gray-100 rounded"
            title="Souligné (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAlignment("left")}
            className="p-1 hover:bg-gray-100 rounded"
            title="Aligner à gauche"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAlignment("center")}
            className="p-1 hover:bg-gray-100 rounded"
            title="Centrer"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAlignment("right")}
            className="p-1 hover:bg-gray-100 rounded"
            title="Aligner à droite"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300" />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = prompt("Entrez l'URL du lien:")
              if (url) handleCommand("createLink", url)
            }}
            className="p-1 hover:bg-gray-100 rounded"
            title="Ajouter un lien"
          >
            <Link className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className="min-h-[100px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-text select-text"
        style={{
          minHeight: "100px",
          userSelect: "text",
          wordWrap: "break-word",
          overflowWrap: "break-word",
        }}
        suppressContentEditableWarning={true}
      />
    </div>
  )
}

// Enhanced Block Library Component
function BlockLibrary({
  onAddBlock,
  isCollapsed,
  onToggleCollapse,
}: {
  onAddBlock: (blockType: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}) {
  const libraryRef = useRef<HTMLDivElement>(null)

  // Available block types for the newsletter builder
  const blockTypes = [
    {
      type: "header",
      icon: Type,
      label: "Titre",
      color: "bg-blue-100 text-blue-600",
      desc: "Titre principal",
    },
    {
      type: "text",
      icon: AlignLeft,
      label: "Texte",
      color: "bg-green-100 text-green-600",
      desc: "Paragraphe de texte",
    },
    {
      type: "image",
      icon: ImageIcon,
      label: "Image",
      color: "bg-purple-100 text-purple-600",
      desc: "Image ou photo",
    },
    {
      type: "button",
      icon: MousePointer,
      label: "Bouton",
      color: "bg-orange-100 text-orange-600",
      desc: "Bouton d'action",
    },
    {
      type: "divider",
      icon: Minus,
      label: "Séparateur",
      color: "bg-gray-100 text-gray-600",
      desc: "Ligne de séparation",
    },
  ]

  const blocks = [
    { type: "header", icon: Type, label: "En-tête", color: "bg-blue-100 text-blue-600", desc: "Titre principal" },
    { type: "text", icon: Edit3, label: "Texte", color: "bg-green-100 text-green-600", desc: "Contenu éditable" },
    {
      type: "image",
      icon: ImageIcon,
      label: "Image",
      color: "bg-purple-100 text-purple-600",
      desc: "Photo ou illustration",
    },
    { type: "button", icon: Layout, label: "Bouton", color: "bg-orange-100 text-orange-600", desc: "Call-to-action" },
    {
      type: "divider",
      icon: Layout,
      label: "Séparateur",
      color: "bg-gray-100 text-gray-600",
      desc: "Ligne de séparation",
    },
  ]

  const handleDragStart = (e: React.DragEvent, blockType: string) => {
    e.dataTransfer.setData("text/plain", blockType)
    e.dataTransfer.effectAllowed = "copy"

    // Create a custom drag image
    const dragImage = document.createElement("div")
    dragImage.className = "bg-white border-2 border-blue-400 rounded-lg p-3 shadow-lg"
    dragImage.innerHTML = `<div class="flex items-center gap-2"><div class="w-6 h-6 bg-blue-100 rounded flex items-center justify-center"><span class="text-xs">📦</span></div><span class="text-sm font-medium">${blocks.find((b) => b.type === blockType)?.label}</span></div>`
    dragImage.style.position = "absolute"
    dragImage.style.top = "-1000px"
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 50, 25)

    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  return (
    <div
      ref={libraryRef}
      className={`${isCollapsed ? "w-16" : "w-80"} bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300`}
    >
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!isCollapsed && <h3 className="text-lg font-semibold text-gray-900">Blocs disponibles</h3>}
        </div>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-gray-200 rounded"
          title={isCollapsed ? "Développer" : "Réduire"}
        >
          {isCollapsed ? <Maximize2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">Glissez-déposez ou cliquez pour ajouter</p>
          <div className="space-y-3">
            {blocks.map((block) => {
              const IconComponent = block.icon

              return (
                <div
                  key={block.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, block.type)}
                  onClick={() => onAddBlock(block.type)}
                  className="w-full flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group cursor-pointer hover:scale-[1.02]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${block.color} flex-shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-700 group-hover:text-blue-700">{block.label}</div>
                    <div className="text-xs text-gray-500 group-hover:text-blue-600">{block.desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="p-2 space-y-2">
          {blocks.map((block) => {
            const IconComponent = block.icon
            return (
              <button
                key={block.type}
                onClick={() => onAddBlock(block.type)}
                className={`w-full p-3 rounded-lg ${block.color} hover:scale-110 transition-transform`}
                title={block.label}
              >
                <IconComponent className="w-5 h-5 mx-auto" />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Enhanced positioning with intelligent collision avoidance and email constraints
const findFreePosition = (
  blocks: NewsletterBlock[],
  canvasWidth: number,
  canvasHeight: number,
  width = 200,
  height = 100,
) => {
  const positionedBlocks = blocks.filter((b) => b.position)

  // Email-compatible constraints - stricter for better compatibility
  const maxBlockWidth = Math.min(canvasWidth - 60, 480) // Reduced from 500px for better margins
  const maxBlockHeight = Math.min(canvasHeight - 60, 350) // Reduced from 400px for better spacing
  const minBlockWidth = 160 // Increased from 150px for better readability
  const minBlockHeight = 80 // Increased from 60px for better content space

  // Constrain the requested dimensions to email-safe ranges
  const constrainedWidth = Math.max(minBlockWidth, Math.min(width, maxBlockWidth))
  const constrainedHeight = Math.max(minBlockHeight, Math.min(height, maxBlockHeight))

  // Enhanced grid-based positioning for better alignment
  const gridSize = 20 // 20px grid for better alignment
  const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize

  // If no blocks exist, place in the center-top area with grid alignment
  if (positionedBlocks.length === 0) {
    return {
      x: snapToGrid(Math.max(30, (canvasWidth - constrainedWidth) / 2)),
      y: snapToGrid(30), // Start from top with safe margin
      width: constrainedWidth,
      height: constrainedHeight,
    }
  }

  // Enhanced positioning strategies with grid alignment
  const strategies = [
    // Strategy 1: Place below the lowest block with better spacing
    () => {
      const maxY = Math.max(...positionedBlocks.map((b) => b.position!.y + b.position!.height))
      return {
        x: snapToGrid(Math.max(30, (canvasWidth - constrainedWidth) / 2)),
        y: snapToGrid(maxY + 40), // Increased spacing from 20px to 40px
        width: constrainedWidth,
        height: constrainedHeight,
      }
    },

    // Strategy 2: Smart gap detection with improved logic
    () => {
      const sortedBlocks = [...positionedBlocks].sort((a, b) => a.position!.y - b.position!.y)

      for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const currentBlock = sortedBlocks[i]
        const nextBlock = sortedBlocks[i + 1]

        const gapStart = currentBlock.position!.y + currentBlock.position!.height + 40
        const gapEnd = nextBlock.position!.y - 40
        const gapHeight = gapEnd - gapStart

        if (gapHeight >= constrainedHeight + 20) {
          // Extra margin for safety
          return {
            x: snapToGrid(Math.max(30, (canvasWidth - constrainedWidth) / 2)),
            y: snapToGrid(gapStart),
            width: constrainedWidth,
            height: constrainedHeight,
          }
        }
      }
      return null
    },

    // Strategy 3: Side-by-side placement with improved spacing
    () => {
      const sortedBlocks = [...positionedBlocks].sort((a, b) => a.position!.x - b.position!.x)

      for (const block of sortedBlocks) {
        const rightEdge = block.position!.x + block.position!.width + 40 // Increased spacing
        const availableWidth = canvasWidth - rightEdge - 30

        if (availableWidth >= constrainedWidth) {
          return {
            x: snapToGrid(rightEdge),
            y: snapToGrid(block.position!.y),
            width: constrainedWidth,
            height: constrainedHeight,
          }
        }
      }
      return null
    },

    // Strategy 4: Column-based placement for better email structure
    () => {
      const columnWidth = (canvasWidth - 90) / 2 // Two-column layout with margins
      const leftColumnX = snapToGrid(30)
      const rightColumnX = snapToGrid(30 + columnWidth + 30)

      // Check if we can fit in left column
      const leftColumnBlocks = positionedBlocks.filter((b) => b.position!.x < canvasWidth / 2)

      if (leftColumnBlocks.length === 0) {
        return {
          x: leftColumnX,
          y: snapToGrid(30),
          width: Math.min(constrainedWidth, columnWidth),
          height: constrainedHeight,
        }
      }

      // Check if we can fit in right column
      const rightColumnBlocks = positionedBlocks.filter((b) => b.position!.x >= canvasWidth / 2)

      if (rightColumnBlocks.length === 0 && constrainedWidth <= columnWidth) {
        return {
          x: rightColumnX,
          y: snapToGrid(30),
          width: Math.min(constrainedWidth, columnWidth),
          height: constrainedHeight,
        }
      }

      return null
    },
  ]

  // Try each strategy with enhanced validation
  for (const strategy of strategies) {
    const position = strategy()
    if (position) {
      // Enhanced validation with larger safety margins
      const isValid = !positionedBlocks.some((block) => {
        const margin = 30 // Increased minimum spacing for better email layout
        return !(
          position.x + position.width + margin <= block.position!.x ||
          position.x >= block.position!.x + block.position!.width + margin ||
          position.y + position.height + margin <= block.position!.y ||
          position.y >= block.position!.y + block.position!.height + margin
        )
      })

      if (
        isValid &&
        position.x + position.width <= canvasWidth - 30 &&
        position.y + position.height <= canvasHeight - 30
      ) {
        return position
      }
    }
  }

  // Enhanced fallback with grid alignment
  const maxY = Math.max(...positionedBlocks.map((b) => b.position!.y + b.position!.height))
  return {
    x: snapToGrid(Math.max(30, (canvasWidth - constrainedWidth) / 2)),
    y: snapToGrid(maxY + 40),
    width: constrainedWidth,
    height: constrainedHeight,
  }
}

//  Enhanced Canvas Component with consistent spacing
function Canvas({
  blocks,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
  onAddBlock,
  selectedBlockId,
  onSelectBlock,
  previewMode,
  globalStyles,
  template,
  updateTemplate,
}: {
  blocks: NewsletterBlock[]
  onUpdateBlock: (id: string, updates: any) => void
  onDeleteBlock: (id: string) => void
  onMoveBlock: (id: string, direction: "up" | "down") => void
  onAddBlock: (blockType: string) => void
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
  previewMode: "desktop" | "tablet" | "mobile"
  globalStyles: any
  template: NewsletterTemplate
  updateTemplate: (updates: Partial<NewsletterTemplate>) => void
}) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedBlockId: null,
    draggedBlockType: null,
    dragOffset: { x: 0, y: 0 },
    dropZones: [],
    activeDropZone: null,
  })

  const [resizeState, setResizeState] = useState<{
    isResizing: boolean
    resizeHandle: string | null
    startPos: { x: number; y: number }
    startSize: { width: number; height: number }
    blockId: string | null
  }>({
    isResizing: false,
    resizeHandle: null,
    startPos: { x: 0, y: 0 },
    startSize: { width: 0, height: 0 },
    blockId: null,
  })

  const [containerWidth, setContainerWidth] = useState(globalStyles.contentWidth)
  const [containerHeight, setContainerHeight] = useState(globalStyles.contentHeight || 800)
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentImageBlockId, setCurrentImageBlockId] = useState<string | null>(null)
  const gridSize = 20

  const getCanvasWidth = () => {
    switch (previewMode) {
      case "mobile":
        return "375px"
      case "tablet":
        return "768px"
      default:
        return `${containerWidth}px`
    }
  }

  const getCanvasHeight = () => {
    return `${containerHeight}px`
  }

  const handleImageUpload = (blockId: string) => {
    console.log("[DEBUG] handleImageUpload called for block:", blockId)
    setCurrentImageBlockId(blockId)

    // Create file input element
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"
    fileInput.style.display = "none"

    // Set up event handlers BEFORE adding to DOM
    fileInput.addEventListener("change", async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]

      // Clean up the file input
      if (document.body.contains(fileInput)) {
        document.body.removeChild(fileInput)
      }

      if (file && blockId) {
        try {
          const formData = new FormData()
          formData.append("file", file)

          console.log("[DEBUG] Uploading file:", file.name, "Size:", file.size, "Type:", file.type)

          const response = await fetch("/api/services/newsletter/admin/upload-image", {
            method: "POST",
            body: formData,
          })

          console.log("[DEBUG] Upload response status:", response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error("[DEBUG] Upload error response:", errorText)
            throw new Error(`Téléchargement échoué: ${response.status} - ${errorText}`)
          }

          const result = await response.json()
          console.log("[DEBUG] Upload success result:", result)

          onUpdateBlock(blockId, {
            content: {
              src: result.url || result.fullUrl,
              alt: file.name,
              href: "",
            },
          })
        } catch (error) {
          console.error("[DEBUG] Error uploading image:", error)
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          alert(`Téléchargement échoué: ${errorMessage}`)
        }
      }
    })

    // Add to DOM and trigger click
    document.body.appendChild(fileInput)

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      try {
        fileInput.click()
      } catch (err) {
        console.error("[DEBUG] Error triggering file input:", err)
        // Fallback: try direct click
        fileInput.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      }
    }, 100)
  }

  // const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (file && currentImageBlockId) {
  //     setUploadingImages((prev) => new Set(prev).add(currentImageBlockId))

  //     try {
  //       const formData = new FormData()
  //       formData.append("file", file)

  //       console.log("[DEBUG] Uploading file:", file.name, "Size:", file.size, "Type:", file.type)

  //       const response = await fetch("/api/services/newsletter/admin/upload-image", {
  //         method: "POST",
  //         body: formData,
  //       })

  //       console.log("[DEBUG] Upload response status:", response.status)

  //       if (!response.ok) {
  //         const errorText = await response.text()
  //         console.error("[DEBUG] Upload error response:", errorText)
  //         throw new Error(`Téléchargement échoué: ${response.status} - ${errorText}`)
  //       }

  //       const result = await response.json()
  //       console.log("[DEBUG] Upload success result:", result)

  //       onUpdateBlock(currentImageBlockId, {
  //         content: {
  //           src: result.url || result.fullUrl,
  //           alt: file.name,
  //           href: "",
  //         },
  //       })
  //     } catch (error) {
  //       console.error("[DEBUG] Error uploading image:", error)
  //       alert(`Téléchargement échoué: ${error.message}`)
  //     } finally {
  //       setUploadingImages((prev) => {
  //         const newSet = new Set(prev)
  //         newSet.delete(currentImageBlockId)
  //         return newSet
  //       })
  //     }
  //   }
  // Snap to grid function
  const snapToGridFn = (x: number, y: number) => {
    if (!snapToGrid) return { x, y }
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()

    // Only create new blocks from library drag operations, not from internal block drags
    if (dragState.isDragging && dragState.draggedBlockId) {
      // This is an internal block move, don't create a new block
      return
    }

    const blockType = e.dataTransfer.getData("text/plain")

    // Only create new blocks if we have a valid block type from the library
    if (blockType && canvasRef.current && ["header", "text", "image", "button", "divider"].includes(blockType)) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const x = e.clientX - canvasRect.left - 100
      const y = e.clientY - canvasRect.top - 50

      const snapped = snapToGridFn(x, y)
      onAddBlock(blockType)
    }
  }

  // Enhanced block mouse handlers for positioned blocks
  const handleBlockMouseDown = (e: React.MouseEvent, blockId: string) => {
    // Only allow dragging from the drag handle or when explicitly clicking the block border
    const target = e.target as HTMLElement
    const isDragHandle = target.closest(".block-drag-handle")
    const isBlockBorder = target === e.currentTarget

    if (isDragHandle || isBlockBorder) {
      const rect = e.currentTarget.getBoundingClientRect()
      const canvasRect = canvasRef.current?.getBoundingClientRect()
      const block = blocks.find((b) => b.id === blockId)

      if (canvasRect && block?.position) {
        e.preventDefault() // Prevent default drag behavior
        setDragState((prev) => ({
          ...prev,
          isDragging: true,
          draggedBlockId: blockId,
          dragOffset: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
        }))
      }
    }
  }

  // Enhanced block mouse move handler with intelligent magnetic boundaries
  const handleBlockMouseMove = (e: MouseEvent) => {
    if (dragState.isDragging && dragState.draggedBlockId && canvasRef.current) {
      const canvasRect = canvasRef.current.getBoundingClientRect()
      const block = blocks.find((b) => b.id === dragState.draggedBlockId)
      const x = e.clientX - canvasRect.left - dragState.dragOffset.x
      const y = e.clientY - canvasRect.top - dragState.dragOffset.y

      const snapped = snapToGridFn(x, y)

      if (block?.position) {
        // Email-compatible boundary constraints
        const maxX = canvasRect.width - block.position.width - 20
        const maxY = canvasRect.height - block.position.height - 20
        let constrainedX = Math.max(20, Math.min(snapped.x, maxX))
        let constrainedY = Math.max(20, Math.min(snapped.y, maxY))

        // Enhanced magnetic system with smoother attraction/repulsion
        const magneticMargin = 20 // Increased magnetic attraction zone
        const repulsionMargin = 35 // Increased repulsion zone for better spacing
        const gridSize = 20 // Grid snapping for better alignment

        const draggedBlock = {
          x: constrainedX,
          y: constrainedY,
          width: block.position.width,
          height: block.position.height,
        }

        // Enhanced magnetic forces with grid alignment
        const magneticForces: Array<{ x: number; y: number; strength: number; type: "attract" | "repel" }> = []

        // Grid snapping force - subtle attraction to grid
        const gridSnapX = Math.round(draggedBlock.x / gridSize) * gridSize
        const gridSnapY = Math.round(draggedBlock.y / gridSize) * gridSize
        const gridDistanceX = Math.abs(draggedBlock.x - gridSnapX)
        const gridDistanceY = Math.abs(draggedBlock.y - gridSnapY)

        if (gridDistanceX < 10) {
          magneticForces.push({
            x: (gridSnapX - draggedBlock.x) * 0.3,
            y: 0,
            strength: 0.3,
            type: "attract",
          })
        }

        if (gridDistanceY < 10) {
          magneticForces.push({
            x: 0,
            y: (gridSnapY - draggedBlock.y) * 0.3,
            strength: 0.3,
            type: "attract",
          })
        }

        // Enhanced block interaction system
        blocks.forEach((otherBlock) => {
          if (otherBlock.id === block.id || !otherBlock.position) return

          const other = otherBlock.position

          // Calculate overlap and distances
          const overlapX = Math.max(
            0,
            Math.min(draggedBlock.x + draggedBlock.width - other.x, other.x + other.width - draggedBlock.x),
          )
          const overlapY = Math.max(
            0,
            Math.min(draggedBlock.y + draggedBlock.height - other.y, other.y + other.height - draggedBlock.y),
          )

          // Strong repulsion for overlaps
          if (overlapX > 0 && overlapY > 0) {
            const repulsionStrength = Math.min(overlapX, overlapY) * 2

            if (overlapX < overlapY) {
              // Horizontal repulsion
              const direction = draggedBlock.x < other.x ? -1 : 1
              magneticForces.push({
                x: direction * repulsionStrength,
                y: 0,
                strength: 1,
                type: "repel",
              })
            } else {
              // Vertical repulsion
              const direction = draggedBlock.y < other.y ? -1 : 1
              magneticForces.push({
                x: 0,
                y: direction * repulsionStrength,
                strength: 1,
                type: "repel",
              })
            }
          } else {
            // Magnetic alignment attractions
            const alignmentTolerance = 15

            // Horizontal alignment
            if (Math.abs(draggedBlock.x - other.x) < alignmentTolerance) {
              magneticForces.push({
                x: (other.x - draggedBlock.x) * 0.4,
                y: 0,
                strength: 0.4,
                type: "attract",
              })
            }

            if (Math.abs(draggedBlock.x + draggedBlock.width - (other.x + other.width)) < alignmentTolerance) {
              magneticForces.push({
                x: (other.x + other.width - (draggedBlock.x + draggedBlock.width)) * 0.4,
                y: 0,
                strength: 0.4,
                type: "attract",
              })
            }

            // Vertical alignment
            if (Math.abs(draggedBlock.y - other.y) < alignmentTolerance) {
              magneticForces.push({
                x: 0,
                y: (other.y - draggedBlock.y) * 0.4,
                strength: 0.4,
                type: "attract",
              })
            }

            if (Math.abs(draggedBlock.y + draggedBlock.height - (other.y + other.height)) < alignmentTolerance) {
              magneticForces.push({
                x: 0,
                y: (other.y + other.height - (draggedBlock.y + draggedBlock.height)) * 0.4,
                strength: 0.4,
                type: "attract",
              })
            }
          }
        })

        // Apply magnetic forces with smoothing
        let totalForceX = 0
        let totalForceY = 0

        magneticForces.forEach((force) => {
          totalForceX += force.x
          totalForceY += force.y
        })

        // Smooth force application
        const dampening = 0.7
        constrainedX += totalForceX * dampening
        constrainedY += totalForceY * dampening

        // Final boundary constraints
        constrainedX = Math.max(20, Math.min(constrainedX, maxX))
        constrainedY = Math.max(20, Math.min(constrainedY, maxY))

        // Snap to grid if enabled
        if (snapToGrid) {
          constrainedX = Math.round(constrainedX / gridSize) * gridSize
          constrainedY = Math.round(constrainedY / gridSize) * gridSize
        }

        // Hard boundary collision resolution: never allow overlap with other blocks
        const hardMargin = 20
        const resolveCollision = (proposed: { x: number; y: number; width: number; height: number }) => {
          let adjustedX = proposed.x
          let adjustedY = proposed.y

          for (const other of blocks) {
            if (!other.position || other.id === block.id) continue

            const aLeft = adjustedX
            const aRight = adjustedX + proposed.width
            const aTop = adjustedY
            const aBottom = adjustedY + proposed.height

            const bLeft = other.position.x - hardMargin
            const bRight = other.position.x + other.position.width + hardMargin
            const bTop = other.position.y - hardMargin
            const bBottom = other.position.y + other.position.height + hardMargin

            const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft))
            const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop))

            if (overlapX > 0 && overlapY > 0) {
              const pushLeft = aRight - bLeft
              const pushRight = bRight - aLeft
              const pushUp = aBottom - bTop
              const pushDown = bBottom - aTop

              const minHorizontal = Math.min(pushLeft, pushRight)
              const minVertical = Math.min(pushUp, pushDown)

              if (minHorizontal < minVertical) {
                if (pushLeft < pushRight) {
                  adjustedX -= pushLeft
                } else {
                  adjustedX += pushRight
                }
              } else {
                if (pushUp < pushDown) {
                  adjustedY -= pushUp
                } else {
                  adjustedY += pushDown
                }
              }

              adjustedX = Math.max(20, Math.min(adjustedX, maxX))
              adjustedY = Math.max(20, Math.min(adjustedY, maxY))
            }
          }

          return { x: adjustedX, y: adjustedY }
        }

        const resolved = resolveCollision({ x: constrainedX, y: constrainedY, width: draggedBlock.width, height: draggedBlock.height })
        constrainedX = resolved.x
        constrainedY = resolved.y

        onUpdateBlock(dragState.draggedBlockId, {
          position: {
            x: constrainedX,
            y: constrainedY,
            width: block.position.width,
            height: block.position.height,
          },
        })
      }
    }
  }

  const handleBlockMouseUp = () => {
    setDragState((prev) => ({
      ...prev,
      isDragging: false,
      draggedBlockId: null,
    }))
  }

  // Add resize handle mouse down handler
  const handleResizeMouseDown = (e: React.MouseEvent, blockId: string, handle: string) => {
    e.stopPropagation()
    const block = blocks.find((b) => b.id === blockId)
    if (!block?.position) return

    setResizeState({
      isResizing: true,
      resizeHandle: handle,
      startPos: { x: e.clientX, y: e.clientY },
      startSize: { width: block.position.width, height: block.position.height },
      blockId: blockId,
    })
  }

  // Add resize mouse move handler with email-compatible constraints
  const handleResizeMouseMove = (e: MouseEvent) => {
    if (!resizeState.isResizing || !resizeState.blockId) return

    const deltaX = e.clientX - resizeState.startPos.x
    const deltaY = e.clientY - resizeState.startPos.y

    let newWidth = resizeState.startSize.width
    let newHeight = resizeState.startSize.height

    // Enhanced resize constraints with stricter email compatibility
    const maxBlockWidth = Math.min(containerWidth - 60, 480) // Reduced for better margins
    const maxBlockHeight = Math.min(containerHeight - 60, 350) // Reduced for better spacing
    const minBlockWidth = 160 // Increased for better readability
    const minBlockHeight = 80 // Increased for better content space

    switch (resizeState.resizeHandle) {
      case "se": // bottom-right
        newWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, resizeState.startSize.width + deltaX))
        newHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, resizeState.startSize.height + deltaY))
        break
      case "sw": // bottom-left
        newWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, resizeState.startSize.width - deltaX))
        newHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, resizeState.startSize.height + deltaY))
        break
      case "ne": // top-right
        newWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, resizeState.startSize.width + deltaX))
        newHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, resizeState.startSize.height - deltaY))
        break
      case "nw": // top-left
        newWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, resizeState.startSize.width - deltaX))
        newHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, resizeState.startSize.height - deltaY))
        break
      case "e": // right
        newWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, resizeState.startSize.width + deltaX))
        break
      case "w": // left
        newWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, resizeState.startSize.width - deltaX))
        break
      case "s": // bottom
        newHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, resizeState.startSize.height + deltaY))
        break
      case "n": // top
        newHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, resizeState.startSize.height - deltaY))
        break
    }

    const snapped = snapToGridFn(newWidth, newHeight)

    // Prevent resizing into other blocks (hard boundary during resize)
    const subjectBlock = blocks.find((b) => b.id === resizeState.blockId)
    if (subjectBlock?.position) {
      const hardMargin = 20
      const proposed = {
        x: subjectBlock.position.x,
        y: subjectBlock.position.y,
        width: snapped.x,
        height: snapped.y,
      }

      for (const other of blocks) {
        if (!other.position || other.id === resizeState.blockId) continue

        const aLeft = proposed.x
        const aRight = proposed.x + proposed.width
        const aTop = proposed.y
        const aBottom = proposed.y + proposed.height

        const bLeft = other.position.x - hardMargin
        const bRight = other.position.x + other.position.width + hardMargin
        const bTop = other.position.y - hardMargin
        const bBottom = other.position.y + other.position.height + hardMargin

        const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft))
        const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop))

        if (overlapX > 0 && overlapY > 0) {
          if (
            resizeState.resizeHandle === "e" ||
            resizeState.resizeHandle === "se" ||
            resizeState.resizeHandle === "ne"
          ) {
            proposed.width = Math.max(minBlockWidth, Math.min(proposed.width, Math.max(0, bLeft - proposed.x)))
          }
          if (
            resizeState.resizeHandle === "w" ||
            resizeState.resizeHandle === "sw" ||
            resizeState.resizeHandle === "nw"
          ) {
            const rightEdge = subjectBlock.position.x + subjectBlock.position.width
            const maxLeftWidth = Math.max(minBlockWidth, Math.min(maxBlockWidth, rightEdge - (bRight)))
            proposed.width = Math.max(minBlockWidth, Math.min(proposed.width, maxLeftWidth))
          }
          if (
            resizeState.resizeHandle === "s" ||
            resizeState.resizeHandle === "se" ||
            resizeState.resizeHandle === "sw"
          ) {
            proposed.height = Math.max(minBlockHeight, Math.min(proposed.height, Math.max(0, bTop - proposed.y)))
          }
          if (
            resizeState.resizeHandle === "n" ||
            resizeState.resizeHandle === "ne" ||
            resizeState.resizeHandle === "nw"
          ) {
            const bottomEdge = subjectBlock.position.y + subjectBlock.position.height
            const maxTopHeight = Math.max(minBlockHeight, Math.min(maxBlockHeight, bottomEdge - (bBottom)))
            proposed.height = Math.max(minBlockHeight, Math.min(proposed.height, maxTopHeight))
          }
        }
      }

      // Re-snap after adjustments
      proposed.width = snapToGrid ? Math.round(proposed.width / gridSize) * gridSize : proposed.width
      proposed.height = snapToGrid ? Math.round(proposed.height / gridSize) * gridSize : proposed.height

      onUpdateBlock(resizeState.blockId, {
        position: {
          ...blocks.find((b) => b.id === resizeState.blockId)?.position,
          width: proposed.width,
          height: proposed.height,
        },
      })
      return
    }

    onUpdateBlock(resizeState.blockId, {
      position: {
        ...blocks.find((b) => b.id === resizeState.blockId)?.position,
        width: snapped.x,
        height: snapped.y,
      },
    })
  }

  // Add resize mouse up handler
  const handleResizeMouseUp = () => {
    setResizeState({
      isResizing: false,
      resizeHandle: null,
      startPos: { x: 0, y: 0 },
      startSize: { width: 0, height: 0 },
      blockId: null,
    })
  }

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleBlockMouseMove)
      document.addEventListener("mouseup", handleBlockMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleBlockMouseMove)
        document.removeEventListener("mouseup", handleBlockMouseUp)
      }
    }
  }, [dragState.isDragging, dragState.dragOffset])

  // Add useEffect for resize event listeners
  useEffect(() => {
    if (resizeState.isResizing) {
      document.addEventListener("mousemove", handleResizeMouseMove)
      document.addEventListener("mouseup", handleResizeMouseUp)
      return () => {
        document.removeEventListener("mousemove", handleResizeMouseMove)
        document.removeEventListener("mouseup", handleResizeMouseUp)
      }
    }
  }, [resizeState.isResizing, resizeState])

  const renderBlock = (block: NewsletterBlock, index: number) => {
    const isSelected = selectedBlockId === block.id
    const isDragging = dragState.isDragging && dragState.draggedBlockId === block.id
    const isBeingMagnetized =
      dragState.isDragging && dragState.draggedBlockId !== block.id && block.position && dragState.draggedBlockId
    const position = block.position

    // Ensure block.type is always valid - prevent corruption
    const validTypes = ["header", "text", "image", "button", "divider"]
    if (!validTypes.includes(block.type)) {
      console.error("Invalid block type detected:", block.type, "for block:", block.id)
      // Try to recover by guessing the type from content
      if (block.content?.text && block.content.text.length < 100) {
        block.type = "header"
      } else if (block.content?.html) {
        block.type = "text"
      } else if (block.content?.src) {
        block.type = "image"
      } else {
        block.type = "text" // fallback
      }
    }

    const blockContent = (() => {
      switch (block.type) {
        case "header":
          return (
            <div
              className="cursor-text resize-container"
              onClick={() => onSelectBlock(block.id)}
              style={{
                textAlign: block.styles?.textAlign || "center",
                width: position ? "100%" : "auto",
                height: position ? "100%" : "auto",
                overflow: "hidden",
              }}
            >
              {isSelected ? (
                <textarea
                  value={block.content?.text || ""}
                  onChange={(e) => onUpdateBlock(block.id, { content: { ...block.content, text: e.target.value } })}
                  className="w-full h-full text-3xl font-bold bg-transparent border-none outline-none focus:bg-blue-50 px-2 py-1 rounded resize-none"
                  style={{
                    color: block.styles?.color || globalStyles.primaryColor,
                    fontFamily: globalStyles.fontFamily,
                    textAlign: block.styles?.textAlign || "center",
                    wordWrap: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                  placeholder="Cliquez pour modifier le titre"
                  autoFocus
                />
              ) : (
                <h1
                  className="text-3xl font-bold cursor-text select-text hover:bg-gray-50 px-2 py-1 rounded transition-colors"
                  style={{
                    color: block.styles?.color || globalStyles.primaryColor,
                    fontFamily: globalStyles.fontFamily,
                    wordWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    lineHeight: "1.2",
                  }}
                  onDoubleClick={() => onSelectBlock(block.id)}
                >
                  {block.content?.text || "Cliquez pour modifier le titre"}
                </h1>
              )}
            </div>
          )

        case "text":
          return (
            <div className="cursor-text" onClick={() => onSelectBlock(block.id)}>
              {isSelected ? (
                <WYSIWYGEditor
                  content={block.content?.html || ""}
                  onChange={(html) => onUpdateBlock(block.id, { content: { ...block.content, html } })}
                  placeholder="Tapez votre texte ici..."
                />
              ) : (
                <div
                  className="prose max-w-none min-h-[60px] p-3 rounded border-2 border-dashed border-transparent hover:border-gray-300 cursor-text select-text"
                  style={{
                    color: block.styles?.color || "#000000",
                    fontSize: block.styles?.fontSize || "16px",
                    textAlign: block.styles?.textAlign || "left",
                    fontFamily: globalStyles.fontFamily,
                  }}
                  dangerouslySetInnerHTML={{
                    __html: block.content?.html || "<p>Cliquez pour modifier le texte</p>",
                  }}
                  onDoubleClick={() => onSelectBlock(block.id)}
                />
              )}
            </div>
          )

        case "image":
          return (
            <div className="text-center cursor-pointer" onClick={() => onSelectBlock(block.id)}>
              {block.content?.src ? (
                <img
                  src={block.content.src || "/placeholder.svg"}
                  alt={block.content.alt || ""}
                  className="max-w-full h-auto mx-auto rounded-lg hover:opacity-90 transition-opacity"
                  style={{
                    maxHeight: "400px",
                    borderRadius: block.styles?.borderRadius || "8px",
                  }}
                />
              ) : (
                <div
                  className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleImageUpload(block.id)
                  }}
                >
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Cliquez pour ajouter une image</p>
                    <p className="text-xs text-gray-400 mt-1">ou entrez une URL</p>
                  </div>
                </div>
              )}
            </div>
          )

        case "button":
          return (
            <div
              className="cursor-pointer"
              onClick={() => onSelectBlock(block.id)}
              style={{ textAlign: block.styles?.textAlign || "center" }}
            >
              {isSelected ? (
                <div style={{ textAlign: block.styles?.textAlign || "center" }}>
                  <input
                    type="text"
                    value={block.content?.text || ""}
                    onChange={(e) =>
                      onUpdateBlock(block.id, {
                        content: { ...block.content, text: e.target.value },
                      })
                    }
                    className="inline-block font-medium text-center border-2 border-blue-300 rounded"
                    style={{
                      backgroundColor: block.styles?.backgroundColor || globalStyles.primaryColor,
                      color: block.styles?.color || "#FFFFFF",
                      borderRadius: block.styles?.borderRadius || "8px",
                      fontFamily: globalStyles.fontFamily,
                      padding: `${block.styles?.paddingY || 16}px ${block.styles?.paddingX || 32}px`,
                      fontSize: block.styles?.fontSize || "16px",
                      minWidth: block.styles?.minWidth || "auto",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      outline: "none",
                      fontWeight: "600",
                      width: "100%",
                      display: "inline-block",
                    }}
                    placeholder="Texte du bouton"
                    autoFocus
                  />
                </div>
              ) : (
                <a
                  href={formatUrl(block.content?.href || "#")}
                  className="inline-block font-medium text-decoration-none hover:opacity-90 transition-opacity"
                  style={{
                    backgroundColor: block.styles?.backgroundColor || globalStyles.primaryColor,
                    color: block.styles?.color || "#FFFFFF",
                    borderRadius: block.styles?.borderRadius || "8px",
                    fontFamily: globalStyles.fontFamily,
                    padding: `${block.styles?.paddingY || 16}px ${block.styles?.paddingX || 32}px`,
                    fontSize: block.styles?.fontSize || "16px",
                    minWidth: block.styles?.minWidth || "auto",
                    maxWidth: "100%",
                    boxSizing: "border-box",
                    textDecoration: "none",
                    display: "inline-block",
                    fontWeight: "600",
                    width: "100%",
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    if (block.content?.href && block.content.href !== "#") {
                      window.open(formatUrl(block.content.href), "_blank")
                    }
                  }}
                >
                  {block.content?.text || "Cliquez pour modifier"}
                </a>
              )}
            </div>
          )
        case "divider":
          return (
            <div className="cursor-pointer py-4" onClick={() => onSelectBlock(block.id)}>
              <hr
                className="border-t my-4 hover:border-blue-400 transition-colors"
                style={{
                  borderColor: block.styles?.color || "#E5E7EB",
                  borderWidth: block.styles?.thickness || "1px",
                }}
              />
            </div>
          )

        default:
          console.error("Fallback case reached for block:", block)
          return (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Bloc en cours de récupération...</span>
              </div>
              <p className="text-xs text-yellow-500 mt-1">Le bloc sera restauré automatiquement.</p>
            </div>
          )
      }
    })()

    //  Consistent padding for both builder and preview
    const blockStyle = position
      ? {
          position: "absolute" as const,
          left: position.x,
          top: position.y,
          width: position.width,
          minHeight: position.height,
          zIndex: isSelected ? 10 : 1,
        }
      : {}

    return (
      <div key={block.id}>
        <div
          data-block-id={block.id}
          className={`relative group transition-all duration-200 ${
            isSelected
              ? "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50"
              : "hover:ring-1 hover:ring-gray-300 hover:ring-offset-1"
          } ${dragState.isDragging && dragState.draggedBlockId === block.id ? "opacity-50" : ""} ${
            dragState.isDragging && dragState.draggedBlockId !== block.id ? "ring-1 ring-blue-200 ring-offset-1" : ""
          }`}
          style={{
            minHeight: "60px",
            ...blockStyle,
            // Subtle magnetic feedback
            ...(dragState.isDragging &&
              dragState.draggedBlockId !== block.id && {
                boxShadow: "0 0 0 1px rgba(59, 130, 246, 0.1)",
              }),
          }}
          onMouseDown={(e) => {
            const target = e.target as HTMLElement
            if (
              target.closest(".cursor-text") ||
              target.closest("textarea") ||
              target.closest("input") ||
              target.closest(".editor-toolbar")
            ) {
              return
            }
            handleBlockMouseDown(e, block.id)
          }}
          onDragStart={(e) => {
            // Prevent default drag behavior for the block itself
            e.preventDefault()
          }}
        >
          {/* Enhanced Block Controls */}
          {isSelected && (
            <div className="absolute -top-12 left-0 right-0 flex items-center justify-between bg-blue-600 text-white px-4 py-2 rounded-t-lg text-xs z-20 shadow-lg">
              <span className="font-medium capitalize flex items-center gap-2">
                <Settings className="w-3 h-3" />
                {block.type}
                <Move className="w-3 h-3" />
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteBlock(block.id)
                  }}
                  className="p-1 hover:bg-red-600 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Enhanced drag handle for positioned blocks */}
          <div className="block-drag-handle absolute top-1 right-1 w-8 h-8 bg-blue-500 rounded cursor-move flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-blue-600">
            <GripVertical className="w-5 h-5 text-white" />
          </div>

          {/* Enhanced resize handles for positioned blocks */}
          {isSelected && (
            <>
              {/* Corner handles */}
              <div
                className="absolute -top-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-nw-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, block.id, "nw")}
              />
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-ne-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, block.id, "ne")}
              />
              <div
                className="absolute -bottom-1 -left-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-sw-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, block.id, "sw")}
              />
              <div
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-se-resize"
                onMouseDown={(e) => handleResizeMouseDown(e, block.id, "se")}
              />

              {/* Edge handles - show for all positioned elements including text */}
              {(block.type === "text" || block.type === "header" || block.type === "button") && (
                <>
                  <div
                    className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-n-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, block.id, "n")}
                  />
                  <div
                    className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-s-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, block.id, "s")}
                  />
                  <div
                    className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-w-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, block.id, "w")}
                  />
                  <div
                    className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-blue-500 border border-white rounded-full cursor-e-resize"
                    onMouseDown={(e) => handleResizeMouseDown(e, block.id, "e")}
                  />
                </>
              )}
            </>
          )}

          {/*  Consistent padding that matches preview */}
          <div className="p-6" style={{ padding: "24px" }}>
            {blockContent}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
      {/* CSS for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
          .magnetic-feedback {
            transition: all 0.2s ease-in-out;
          }
          .magnetic-feedback:hover {
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
        `,
        }}
      />
      {/* Hidden file input for image uploads */}
      {/* Remove the hidden file input since we're creating it dynamically */}
      {/* <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" /> */}

      {/* Enhanced Container controls */}
      {previewMode === "desktop" && (
        <div className="mb-4 flex items-center justify-center gap-6 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Largeur:</span>
            <input
              type="range"
              min="400"
              max="1200"
              value={containerWidth}
              onChange={(e) => {
                const newWidth = Number(e.target.value)
                setContainerWidth(newWidth)
                // Update global styles to match
                updateTemplate({
                  globalStyles: { ...template.globalStyles, contentWidth: newWidth },
                })
              }}
              className="w-32"
            />
            <span className="text-sm font-medium text-gray-700 w-16">{containerWidth}px</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Hauteur:</span>
            <input
              type="range"
              min="400"
              max="2000"
              value={containerHeight}
              onChange={(e) => {
                const newHeight = Number(e.target.value)
                setContainerHeight(newHeight)
                // Update global styles to match
                updateTemplate({
                  globalStyles: { ...template.globalStyles, contentHeight: newHeight },
                })
              }}
              className="w-32"
            />
            <span className="text-sm font-medium text-gray-700 w-16">{containerHeight}px</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded-lg transition-colors ${
                showGrid ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
              }`}
              title="Afficher/masquer la grille"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-2 rounded-lg transition-colors ${
                snapToGrid ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
              }`}
              title="Activer/désactiver l'alignement sur la grille"
            >
              <MousePointer className="w-4 h-4" />
            </button>
          </div>

          {/* Email compatibility indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Email-compatible</span>
            <div className="text-xs text-green-600">Max: 500×400px</div>
          </div>

          {/* Magnetic boundaries indicator */}
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
            <MousePointer className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-blue-700 font-medium">Magnetic boundaries</span>
            <div className="text-xs text-blue-600">Auto-align</div>
          </div>
        </div>
      )}

      <div
        ref={canvasRef}
        className="mx-auto bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 relative"
        style={{
          width: getCanvasWidth(),
          minHeight: getCanvasHeight(),
          backgroundColor: globalStyles.backgroundColor,
          height: "auto",
          paddingBottom: "100px",
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Grid overlay */}
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${gridSize}px ${gridSize}px`,
            }}
          />
        )}

        <div className="relative" style={{ minHeight: getCanvasHeight() }}>
          {/* Email-compatible safe zone indicators */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Main safe zone */}
            <div
              className="border border-gray-200 opacity-10"
              style={{
                margin: "20px",
                height: "calc(100% - 40px)",
                width: "calc(100% - 40px)",
              }}
            />
            {/* Email compatibility indicator - only show when dragging */}
            {dragState.isDragging && (
              <div
                className="border-2 border-blue-300 opacity-30"
                style={{
                  margin: "20px",
                  height: "calc(100% - 40px)",
                  width: "calc(100% - 40px)",
                  animation: "pulse 2s infinite",
                }}
              />
            )}
          </div>

          {blocks.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Commencez votre newsletter</h3>
              <p>Glissez des blocs depuis la bibliothèque ou cliquez pour ajouter</p>
              <div className="mt-6 p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                <p className="text-sm text-gray-500">Zone de dépôt - Glissez vos blocs ici</p>
              </div>
            </div>
          ) : (
            <div className="relative">{blocks.map((block, index) => renderBlock(block, index))}</div>
          )}
        </div>
      </div>
    </div>
  )
}

// Properties Panel with all block controls
function PropertiesPanel({
  selectedBlock,
  onUpdateBlock,
  template,
  onUpdateTemplate,
  onImageUpload,
}: {
  selectedBlock: NewsletterBlock | null
  onUpdateBlock: (id: string, updates: any) => void
  template: NewsletterTemplate
  onUpdateTemplate: (updates: Partial<NewsletterTemplate>) => void
  onImageUpload: (blockId: string) => void
}) {
  if (!selectedBlock) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Propriétés</h3>
          <p className="text-sm text-gray-600">Sélectionnez un élément pour modifier ses propriétés</p>
        </div>
      </div>
    )
  }

  const updateContent = (updates: any) => {
    onUpdateBlock(selectedBlock.id, {
      ...selectedBlock,
      content: { ...selectedBlock.content, ...updates },
    })
  }

  const updateStyles = (updates: any) => {
    onUpdateBlock(selectedBlock.id, {
      styles: { ...selectedBlock.styles, ...updates },
    })
  }

  const updatePosition = (updates: any) => {
    onUpdateBlock(selectedBlock.id, {
      position: { ...selectedBlock.position, ...updates },
    })
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 capitalize flex items-center gap-2">
          <Palette className="w-5 h-5" />
          {selectedBlock.type}
        </h3>
        <p className="text-sm text-gray-600">Personnalisez ce bloc</p>
      </div>

      <div className="space-y-6">
        {/* Position controls - always show since all blocks are positioned */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Position et taille</label>
          <div className="space-y-3">
            {selectedBlock.position && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">X</label>
                  <input
                    type="number"
                    value={selectedBlock.position.x}
                    onChange={(e) => {
                      const newX = Number(e.target.value)
                      const maxX = template.globalStyles.contentWidth - selectedBlock.position!.width - 20
                      const constrainedX = Math.max(0, Math.min(newX, maxX))
                      updatePosition({ x: constrainedX })
                    }}
                    min="0"
                    max={template.globalStyles.contentWidth - (selectedBlock.position?.width || 0) - 20}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Y</label>
                  <input
                    type="number"
                    value={selectedBlock.position.y}
                    onChange={(e) => {
                      const newY = Number(e.target.value)
                      const maxY = (template.globalStyles.contentHeight || 800) - selectedBlock.position!.height - 20
                      const constrainedY = Math.max(0, Math.min(newY, maxY))
                      updatePosition({ y: constrainedY })
                    }}
                    min="0"
                    max={(template.globalStyles.contentHeight || 800) - (selectedBlock.position?.height || 0) - 20}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Largeur</label>
                  <input
                    type="number"
                    value={selectedBlock.position.width}
                    onChange={(e) => {
                      const newWidth = Number(e.target.value)
                      const maxWidth = Math.min(template.globalStyles.contentWidth - 40, 500)
                      const constrainedWidth = Math.max(150, Math.min(newWidth, maxWidth))
                      updatePosition({ width: constrainedWidth })
                    }}
                    min="150"
                    max={Math.min(template.globalStyles.contentWidth - 40, 500)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Min: 150px, Max: {Math.min(template.globalStyles.contentWidth - 40, 500)}px
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hauteur</label>
                  <input
                    type="number"
                    value={selectedBlock.position.height}
                    onChange={(e) => {
                      const newHeight = Number(e.target.value)
                      const maxHeight = Math.min((template.globalStyles.contentHeight || 800) - 40, 400)
                      const constrainedHeight = Math.max(60, Math.min(newHeight, maxHeight))
                      updatePosition({ height: constrainedHeight })
                    }}
                    min="60"
                    max={Math.min((template.globalStyles.contentHeight || 800) - 40, 400)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    Min: 60px, Max: {Math.min((template.globalStyles.contentHeight || 800) - 40, 400)}px
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Header block controls */}
        {selectedBlock.type === "header" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Texte du titre</label>
              <input
                type="text"
                value={selectedBlock.content?.text || ""}
                onChange={(e) => updateContent({ text: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Titre de votre newsletter"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alignement</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateStyles({ textAlign: "left" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "left" ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateStyles({ textAlign: "center" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "center" || !selectedBlock.styles?.textAlign ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateStyles({ textAlign: "right" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "right" ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur du texte</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedBlock.styles?.color || "#000000"}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBlock.styles?.color || "#000000"}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </>
        )}

        {/* Text block controls */}
        {selectedBlock.type === "text" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur du texte</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedBlock.styles?.color || "#000000"}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBlock.styles?.color || "#000000"}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Taille de police</label>
              <input
                type="range"
                min="12"
                max="32"
                value={Number.parseInt(selectedBlock.styles?.fontSize || "16")}
                onChange={(e) => updateStyles({ fontSize: `${e.target.value}px` })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>12px</span>
                <span className="font-medium">{selectedBlock.styles?.fontSize || "16px"}</span>
                <span>32px</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alignement</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateStyles({ textAlign: "left" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "left" || !selectedBlock.styles?.textAlign ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateStyles({ textAlign: "center" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "center" ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateStyles({ textAlign: "right" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "right" ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Image block controls */}
        {selectedBlock.type === "image" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source de l'image</label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Option 1: Télécharger depuis votre appareil
                  </label>
                  <button
                    onClick={() => onImageUpload(selectedBlock.id)}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
                  >
                    <Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                    <span className="text-sm text-gray-600">Cliquez pour télécharger</span>
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 text-sm">OU</span>
                  </div>
                  <div className="w-full h-px bg-gray-300"></div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Option 2: Entrer une URL</label>
                  <input
                    type="url"
                    value={selectedBlock.content?.src || ""}
                    onChange={(e) => updateContent({ src: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Texte alternatif</label>
              <input
                type="text"
                value={selectedBlock.content?.alt || ""}
                onChange={(e) => updateContent({ alt: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Description de l'image"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lien (optionnel)</label>
              <input
                type="url"
                value={selectedBlock.content?.href || ""}
                onChange={(e) => updateContent({ href: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bordure arrondie</label>
              <input
                type="range"
                min="0"
                max="20"
                value={Number.parseInt(selectedBlock.styles?.borderRadius || "8")}
                onChange={(e) => updateStyles({ borderRadius: `${e.target.value}px` })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0px</span>
                <span className="font-medium">{selectedBlock.styles?.borderRadius || "8px"}</span>
                <span>20px</span>
              </div>
            </div>
          </>
        )}

        {/* Button block controls */}
        {selectedBlock.type === "button" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Texte du bouton</label>
              <input
                type="text"
                value={selectedBlock.content?.text || ""}
                onChange={(e) => updateContent({ text: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Texte du bouton"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lien</label>
              <input
                type="url"
                value={selectedBlock.content?.href || ""}
                onChange={(e) => updateContent({ href: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alignement</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateStyles({ textAlign: "left" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "left" ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateStyles({ textAlign: "center" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "center" || !selectedBlock.styles?.textAlign ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  onClick={() => updateStyles({ textAlign: "right" })}
                  className={`p-2 border rounded ${selectedBlock.styles?.textAlign === "right" ? "bg-blue-100 border-blue-300" : "border-gray-300"}`}
                >
                  <AlignRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur de fond</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedBlock.styles?.backgroundColor || "#3B82F6"}
                  onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                  className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBlock.styles?.backgroundColor || "#3B82F6"}
                  onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur du texte</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={selectedBlock.styles?.color || "#FFFFFF"}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={selectedBlock.styles?.color || "#FFFFFF"}
                  onChange={(e) => updateStyles({ color: e.target.value })}
                  className="flex-1 p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Taille de police</label>
              <input
                type="range"
                min="12"
                max="24"
                value={Number.parseInt(selectedBlock.styles?.fontSize || "16")}
                onChange={(e) => updateStyles({ fontSize: `${e.target.value}px` })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>12px</span>
                <span className="font-medium">{selectedBlock.styles?.fontSize || "16px"}</span>
                <span>24px</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Padding horizontal</label>
              <input
                type="range"
                min="8"
                max="64"
                value={selectedBlock.styles?.paddingX || 32}
                onChange={(e) => updateStyles({ paddingX: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>8px</span>
                <span className="font-medium">{selectedBlock.styles?.paddingX || "32"}px</span>
                <span>64px</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Padding vertical</label>
              <input
                type="range"
                min="4"
                max="32"
                value={selectedBlock.styles?.paddingY || 16}
                onChange={(e) => updateStyles({ paddingY: Number(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4px</span>
                <span className="font-medium">{selectedBlock.styles?.paddingY || "16"}px</span>
                <span>32px</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bordure arrondie</label>
              <input
                type="range"
                min="0"
                max="20"
                value={Number.parseInt(selectedBlock.styles?.borderRadius || "8")}
                onChange={(e) => updateStyles({ borderRadius: `${e.target.value}px` })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0px</span>
                <span className="font-medium">{selectedBlock.styles?.borderRadius || "8px"}</span>
                <span>20px</span>
              </div>
            </div>
          </>
        )}

        {/* Divider block controls */}
        {selectedBlock.type === "divider" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Couleur</label>
              <input
                type="color"
                value={selectedBlock.styles?.color || "#E5E7EB"}
                onChange={(e) => updateStyles({ color: e.target.value })}
                className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Épaisseur</label>
              <select
                value={selectedBlock.styles?.thickness || "1px"}
                onChange={(e) => updateStyles({ thickness: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="1px">Fine (1px)</option>
                <option value="2px">Moyenne (2px)</option>
                <option value="3px">Épaisse (3px)</option>
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Main Newsletter Builder Component
export default function NewsletterBuilder({ templateId, initialTemplate, onSave }: NewsletterBuilderProps) {
  const pathname = usePathname()
  const siteId = extractSiteIdFromPath(pathname) || "default-site"
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState(false)

  const [template, setTemplate] = useState<NewsletterTemplate>(
    initialTemplate || {
      title: "Nouvelle Newsletter",
      subject: "",
      blocks: [],
      globalStyles: {
        primaryColor: "#3B82F6",
        backgroundColor: "#FFFFFF",
        contentWidth: 600,
        contentHeight: 800,
        fontFamily: "Arial, sans-serif",
      },
      status: "draft",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  )

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop")
  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set())

  // Image upload handler
  const handleImageUpload = (blockId: string) => {

    // Create file input element
    const fileInput = document.createElement("input")
    fileInput.type = "file"
    fileInput.accept = "image/*"
    fileInput.style.display = "none"

    // Set up event handlers BEFORE adding to DOM
    fileInput.addEventListener("change", async (event: Event) => {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]

      // Clean up the file input
      if (document.body.contains(fileInput)) {
        document.body.removeChild(fileInput)
      }

      if (file && blockId) {
        setUploadingImages((prev) => new Set(prev).add(blockId))

        try {
          const formData = new FormData()
          formData.append("file", file)

          console.log("[DEBUG] Uploading file:", file.name, "Size:", file.size, "Type:", file.type)

          const response = await fetch("/api/services/newsletter/admin/upload-image", {
            method: "POST",
            body: formData,
          })

          console.log("[DEBUG] Upload response status:", response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error("[DEBUG] Upload error response:", errorText)
            throw new Error(`Téléchargement échoué: ${response.status} - ${errorText}`)
          }

          const result = await response.json()
          console.log("[DEBUG] Upload success result:", result)

          updateBlock(blockId, {
            content: {
              src: result.url || result.fullUrl,
              alt: file.name,
              href: "",
            },
          })
        } catch (error) {
          console.error("[DEBUG] Error uploading image:", error)
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          alert(`Téléchargement échoué: ${errorMessage}`)
        } finally {
          setUploadingImages((prev) => {
            const newSet = new Set(prev)
            newSet.delete(blockId)
            return newSet
          })
        }
      }
    })

    // Add to DOM and trigger click
    document.body.appendChild(fileInput)

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      try {
        fileInput.click()
      } catch (err) {
        console.error("[DEBUG] Error triggering file input:", err)
        // Fallback: try direct click
        fileInput.dispatchEvent(new MouseEvent("click", { bubbles: true }))
      }
    }, 100)
  }

  // Auto-hide messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  // Preview content is now rendered directly in the modal

  // Load template data when templateId is provided
  useEffect(() => {
    const loadTemplate = async () => {
      if (templateId && !initialTemplate) {
        try {
          setIsLoading(true)
          const response = await fetch(`/api/services/newsletter/admin/campaigns/${templateId}`, {
            headers: {
              "x-site-id": siteId,
            },
          })

          if (response.ok) {
            const data = await response.json()
            let templateData: NewsletterTemplate | null = null

            if (data.success && data.data && data.data.templateData) {
              // Load the saved template data
              templateData = data.data.templateData
            } else if (data.success && data.data && data.data.campaign && data.data.campaign.templateData) {
              // Alternative data structure
              templateData = data.data.campaign.templateData
            }

            if (templateData) {
              // Validate and clean the template for email compatibility
              const cleanedTemplate = validateAndCleanTemplate(templateData)
              setTemplate(cleanedTemplate)
              setMessage({ type: "success", text: "Template chargé et optimisé pour email!" })
            }
          } else {
            console.error("Failed to load template:", response.status, response.statusText)
            setMessage({ type: "error", text: "Erreur lors du chargement du template" })
          }
        } catch (error) {
          console.error("Error loading template:", error)
          setMessage({ type: "error", text: "Erreur lors du chargement du template" })
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadTemplate()
  }, [templateId, initialTemplate, siteId])

  const generateId = () => Math.random().toString(36).substr(2, 9)

  // All blocks get positioned automatically with email-compatible constraints
  const addBlock = useCallback(
    (blockType: string) => {
      const canvasWidth = template.globalStyles.contentWidth
      const canvasHeight = template.globalStyles.contentHeight || 800

      // Email-compatible default sizes for different block types
      const getDefaultBlockSize = (type: string) => {
        switch (type) {
          case "header":
            return { width: 400, height: 80 } // Compact header
          case "text":
            return { width: 450, height: 120 } // Good for paragraphs
          case "image":
            return { width: 400, height: 250 } // Standard image size
          case "button":
            return { width: 200, height: 60 } // Compact button
          case "divider":
            return { width: 450, height: 40 } // Thin divider
          default:
            return { width: 200, height: 100 }
        }
      }

      const defaultSize = getDefaultBlockSize(blockType)
      const freePos = findFreePosition(
        template.blocks,
        canvasWidth,
        canvasHeight,
        defaultSize.width,
        defaultSize.height,
      )

      const newBlock: NewsletterBlock = {
        id: generateId(),
        type: blockType as any,
        content: getDefaultContent(blockType),
        styles: getDefaultStyles(blockType),
        order: template.blocks.length,
        position: {
          x: freePos.x,
          y: freePos.y,
          width: freePos.width, // Use constrained width
          height: freePos.height, // Use constrained height
        },
      }

      setTemplate((prev) => ({
        ...prev,
        blocks: [...prev.blocks, newBlock],
        updatedAt: new Date().toISOString(),
      }))
      setSelectedBlockId(newBlock.id)

      // Auto-scroll to show the new block
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`)
        if (newBlockElement) {
          newBlockElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          })
        }
      }, 100)
    },
    [template.blocks, template.globalStyles],
  )

  const updateBlock = useCallback((id: string, updates: any) => {
    setTemplate((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id === id) {
          const updatedBlock = { ...block, ...updates }
          // Ensure type never gets corrupted
          if (updates.type && !["header", "text", "image", "button", "divider"].includes(updates.type)) {
            console.warn("Invalid block type attempted:", updates.type, "keeping original:", block.type)
            delete updatedBlock.type // Remove invalid type update
          }
          return updatedBlock
        }
        return block
      }),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const deleteBlock = useCallback((id: string) => {
    setTemplate((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((block) => block.id !== id),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedBlockId(null)
  }, [])

  const moveBlock = useCallback((id: string, direction: "up" | "down") => {
    // Not needed for position libre - keeping for compatibility
  }, [])

  const updateTemplate = useCallback((updates: Partial<NewsletterTemplate>) => {
    setTemplate((prev) => ({
      ...prev,
      ...updates,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const selectedBlock = template.blocks.find((block) => block.id === selectedBlockId) || null

  // API call helper with corrected endpoints
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(`/api/services/newsletter${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-site-id": siteId,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Network error" }))
      throw new Error(errorData.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // HTML generation using React Email for perfect style preservation
  const generateHTML = async () => {
    try {
      // Import the React Email renderer dynamically to avoid bundling issues
      const { renderNewsletterToEmailHTML } = await import("@/_sharedServices/utils/react-email-renderer")

      console.log("[Newsletter Builder] Using React Email for HTML generation")

      // Create template data for React Email
      const templateDataForEmail = {
        subject: template.subject,
        globalStyles: {
          backgroundColor: template.globalStyles.backgroundColor,
          contentWidth: template.globalStyles.contentWidth,
          fontFamily: template.globalStyles.fontFamily,
          primaryColor: template.globalStyles.primaryColor,
        },
        blocks: template.blocks,
      }

      // Generate email-compatible HTML using React Email
      const emailHTML = await renderNewsletterToEmailHTML(templateDataForEmail)

      console.log("[Newsletter Builder] React Email HTML generated successfully, length:", emailHTML.length)

      return emailHTML
    } catch (error) {
      console.error("[Newsletter Builder] React Email generation failed, falling back to builder HTML:", error)

      // Fallback to the original builder HTML generation
      return generateBuilderHTML()
    }
  }

  // Fallback HTML generation (original builder logic)
  const generateBuilderHTML = () => {
    const positionedBlocks = template.blocks.filter((block) => block.position)
    const containerWidth = template.globalStyles.contentWidth
    const containerHeight = template.globalStyles.contentHeight || 800

    let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.subject}</title>
    <style>
      body { 
        margin: 0; 
        padding: 20px; 
        font-family: ${template.globalStyles.fontFamily}; 
        background-color: #f5f5f5; 
      }
      .container { 
        width: ${containerWidth}px; 
        height: ${containerHeight}px;
        margin: 0 auto; 
        background-color: ${template.globalStyles.backgroundColor}; 
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        position: relative;
      }
      .positioned-block {
        position: absolute;
        box-sizing: border-box;
      }
      @media (max-width: 600px) {
        .container { 
          width: 100% !important; 
          margin: 10px !important; 
        }
        .positioned-block { 
          position: relative !important; 
          left: auto !important; 
          top: auto !important; 
          width: 100% !important;
          margin-bottom: 20px !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
`

    // Generate blocks with exact builder styling and consistent padding
    positionedBlocks.forEach((block) => {
      const blockHtml = generateBlockHTML(block, template)
      html += `<div class="positioned-block" style="left: ${block.position!.x}px; top: ${block.position!.y}px; width: ${block.position!.width}px; height: ${block.position!.height}px; padding: 24px; box-sizing: border-box;">${blockHtml}</div>`
    })

    html += `
    </div>
    <!-- Analytics tracking pixel for email opens -->
    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display: none;" alt="" />
  </body>
  </html>
`

    return html
  }

  const formatUrl = (url: string): string => {
    if (!url || url === "#") return "#"
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url
    }
    return `https://${url}`
  }

  const generateBlockHTML = (block: NewsletterBlock, template: NewsletterTemplate) => {
    switch (block.type) {
      case "header":
        return `<div style="color: ${block.styles?.color || template.globalStyles.primaryColor}; text-align: ${block.styles?.textAlign || "center"}; font-family: ${template.globalStyles.fontFamily}; width: 100%; height: 100%; display: flex; align-items: center; justify-content: ${block.styles?.textAlign === "left" ? "flex-start" : block.styles?.textAlign === "right" ? "flex-end" : "center"}; font-size: 28px; font-weight: bold; line-height: 1.2; word-wrap: break-word;">${block.content?.text || "Titre"}</div>`

      case "text":
        return `<div style="color: ${block.styles?.color || "#000000"}; font-size: ${block.styles?.fontSize || "16px"}; text-align: ${block.styles?.textAlign || "left"}; font-family: ${template.globalStyles.fontFamily}; width: 100%; height: 100%; line-height: 1.6; word-wrap: break-word; overflow-wrap: break-word;">${block.content?.html || block.content?.text || "<p>Texte</p>"}</div>`

      case "image":
        if (block.content?.src) {
          // Calculate explicit dimensions for Gmail compatibility
          const imageWidth = block.position?.width ? block.position.width - 48 : 200 // Subtract padding
          const imageHeight = block.position?.height ? block.position.height - 48 : 150 // Subtract padding

          // Gmail-compatible image HTML with explicit dimensions
          const imageStyle = `
            width: ${imageWidth}px;
            height: ${imageHeight}px;
            max-width: ${imageWidth}px;
            max-height: ${imageHeight}px;
            border-radius: ${block.styles?.borderRadius || "8px"};
            display: block;
            margin: 0 auto;
            object-fit: contain;
          `
            .replace(/\s+/g, " ")
            .trim()

          const imageHtml = `<img src="${block.content.src}" alt="${block.content?.alt || ""}" style="${imageStyle}" width="${imageWidth}" height="${imageHeight}" />`

          return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center;">${block.content?.href ? `<a href="${block.content.href}" style="display: block;">${imageHtml}</a>` : imageHtml}</div>`
        }
        return `<div style="width: 100%; height: 100%; background-color: #f3f4f6; display: flex; align-items: center; justify-content: center; border-radius: ${block.styles?.borderRadius || "8px"}; border: 2px dashed #d1d5db;"><span style="color: #9ca3af; font-size: 14px;">Image placeholder</span></div>`

      case "button":
        const buttonText = block.content?.text || "Bouton"
        const buttonHref = formatUrl(block.content?.href || "#")
        const backgroundColor = block.styles?.backgroundColor || template.globalStyles.primaryColor
        const textColor = block.styles?.color || "#FFFFFF"
        const borderRadius = block.styles?.borderRadius || "8px"
        const paddingY = block.styles?.paddingY || 16
        const paddingX = block.styles?.paddingX || 32
        const fontSize = block.styles?.fontSize || "16px"
        const minWidth = block.styles?.minWidth || 0
        const textAlign = block.styles?.textAlign || "center"

        const justifyContent = textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center"

        const buttonStyle = `
          background-color: ${backgroundColor}; 
          color: ${textColor}; 
          border-radius: ${borderRadius}; 
          padding: ${paddingY}px ${paddingX}px; 
          font-size: ${fontSize}; 
          min-width: ${minWidth > 0 ? `${minWidth}px` : "auto"}; 
          width: ${minWidth > 0 ? `${minWidth}px` : "auto"}; 
          max-width: 100%;
          font-family: ${template.globalStyles.fontFamily}; 
          text-decoration: none; 
          display: inline-block; 
          font-weight: 600; 
          transition: opacity 0.2s; 
          box-sizing: border-box; 
          white-space: nowrap; 
          text-align: center;
          border: none;
          cursor: pointer;
        `
          .replace(/\s+/g, " ")
          .trim()

        return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: ${justifyContent};"><a href="${buttonHref}" style="${buttonStyle}">${buttonText}</a></div>`

      case "divider":
        return `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"><hr style="border: none; border-top: ${block.styles?.thickness || "1px"} solid ${block.styles?.color || "#E5E7EB"}; width: 80%; margin: 0;" /></div>`

      default:
        return `<div style="width: 100%; height: 100%; background-color: #f3f4f6; border: 2px dashed #d1d5db; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px;">Bloc non reconnu</div>`
    }
  }

  const generateTextContent = () => {
    return template.blocks
      .map((block) => {
        switch (block.type) {
          case "header":
            return block.content?.text || "Titre"
          case "text":
            return block.content?.html?.replace(/<[^>]*>/g, "") || "Texte"
          case "button":
            return `${block.content?.text || "Bouton"}: ${block.content?.href || "#"}`
          default:
            return ""
        }
      })
      .filter(Boolean)
      .join("\n\n")
  }

  // Simple validation without repositioning
  const validateTemplate = (template: NewsletterTemplate): boolean => {
    // Just check if blocks have valid positions and dimensions
    return template.blocks.every((block) => {
      if (!block.position) return false

      const { x, y, width, height } = block.position
      return x >= 0 && y >= 0 && width >= 150 && height >= 60 && width <= 500 && height <= 400
    })
  }

  const handleSave = async () => {
    if (!template.subject.trim()) {
      setMessage({ type: "error", text: "Veuillez ajouter un sujet à votre newsletter" })
      return
    }

    try {
      setIsLoading(true)

      // Simple validation without repositioning
      if (!validateTemplate(template)) {
        setMessage({ type: "error", text: "Certains blocs ont des dimensions invalides" })
        return
      }

      // Ensure template data has the correct structure for email generation
      const enhancedTemplateData = {
        ...template,
        globalStyles: {
          ...template.globalStyles,
          contentWidth: template.globalStyles.contentWidth || 600,
          contentHeight: template.globalStyles.contentHeight || 800,
          backgroundColor: template.globalStyles.backgroundColor || "#FFFFFF",
          fontFamily: template.globalStyles.fontFamily || "Arial, sans-serif",
          primaryColor: template.globalStyles.primaryColor || "#3B82F6",
        },
        blocks: template.blocks.map((block: any) => ({
          ...block,
          position: {
            x: block.position?.x || 0,
            y: block.position?.y || 0,
            width: block.position?.width || 200,
            height: block.position?.height || 100,
          },
        })),
      }

      // Generate HTML content using React Email
      const htmlContent = await generateHTML()

      const campaignData = {
        title: template.title,
        subject: template.subject,
        htmlContent: htmlContent,
        textContent: generateTextContent(),
        siteId,
        status: "draft",
        targetAudience: {
          allSubscribers: true,
          interests: [],
          segments: [],
        },
        templateData: enhancedTemplateData, // Save the enhanced template data
      }

      let response
      if (templateId) {
        // Update existing campaign
        response = await apiCall(`/admin/campaigns/${templateId}`, {
          method: "PATCH",
          body: JSON.stringify(campaignData),
        })
      } else {
        // Create new campaign
        response = await apiCall("/admin/campaigns", {
          method: "POST",
          body: JSON.stringify(campaignData),
        })
      }

      if (response.success) {
        setMessage({ type: "success", text: "Newsletter sauvegardée avec succès!" })
        onSave?.(template)
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Enhanced Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={template.title}
              onChange={(e) => updateTemplate({ title: e.target.value })}
              className="text-lg font-semibold bg-transparent border-none outline-none focus:bg-gray-50 px-3 py-2 rounded-lg transition-colors"
              placeholder="Titre de la newsletter"
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div
                className={`w-2 h-2 rounded-full ${
                  template.status === "draft"
                    ? "bg-yellow-500"
                    : template.status === "sent"
                      ? "bg-green-500"
                      : "bg-blue-500"
                }`}
              />
              <span className="capitalize">{template.status}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={`p-2 rounded-md transition-colors ${previewMode === "desktop" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                title="Vue desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode("tablet")}
                className={`p-2 rounded-md transition-colors ${previewMode === "tablet" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                title="Vue tablette"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={`p-2 rounded-md transition-colors ${previewMode === "mobile" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                title="Vue mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              Aperçu
            </button>

            

            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Sauvegarder
            </button>
          </div>
        </div>

        {/* Enhanced Subject line */}
        <div className="mt-4">
          <input
            type="text"
            value={template.subject}
            onChange={(e) => updateTemplate({ subject: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            placeholder="Objet de l'email..."
          />
        </div>

        {/* Enhanced Messages */}
        {message && (
          <div
            className={`mt-4 p-4 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <BlockLibrary
          onAddBlock={addBlock}
          isCollapsed={isLibraryCollapsed}
          onToggleCollapse={() => setIsLibraryCollapsed(!isLibraryCollapsed)}
        />

        <Canvas
          blocks={template.blocks}
          onUpdateBlock={updateBlock}
          onDeleteBlock={deleteBlock}
          onMoveBlock={moveBlock}
          onAddBlock={addBlock}
          selectedBlockId={selectedBlockId}
          onSelectBlock={setSelectedBlockId}
          previewMode={previewMode}
          globalStyles={template.globalStyles}
          template={template}
          updateTemplate={updateTemplate}
        />

        <PropertiesPanel
          selectedBlock={selectedBlock}
          onUpdateBlock={updateBlock}
          template={template}
          onUpdateTemplate={updateTemplate}
          onImageUpload={handleImageUpload}
        />
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-lg font-semibold">Aperçu - {template.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Voici comment votre newsletter apparaîtra
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {previewMode === "mobile" ? "📱 Mobile" : previewMode === "tablet" ? "📱 Tablette" : "🖥️ Desktop"}
                  </span>
                </p>
              </div>

              {/* Preview mode controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewMode("desktop")}
                    className={`p-2 rounded-md transition-colors ${previewMode === "desktop" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                    title="Vue desktop"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode("tablet")}
                    className={`p-2 rounded-md transition-colors ${previewMode === "tablet" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                    title="Vue tablette"
                  >
                    <Tablet className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewMode("mobile")}
                    className={`p-2 rounded-md transition-colors ${previewMode === "mobile" ? "bg-white shadow-sm text-blue-600" : "text-gray-600 hover:text-gray-800"}`}
                    title="Vue mobile"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto bg-gray-50">
              <div
                className="mx-auto bg-white shadow-lg rounded-lg transition-all duration-300 relative"
                style={{
                  width:
                    previewMode === "mobile"
                      ? "375px"
                      : previewMode === "tablet"
                        ? "768px"
                        : `${template.globalStyles.contentWidth}px`,
                  minHeight: `${template.globalStyles.contentHeight}px`,
                  backgroundColor: template.globalStyles.backgroundColor,
                }}
              >
                {/* Render positioned blocks in preview with responsive scaling */}
                {template.blocks.map((block) => {
                  if (!block.position) return null

                  // Calculate scaling factor based on preview mode
                  const originalWidth = template.globalStyles.contentWidth
                  const previewWidth = previewMode === "mobile" ? 375 : previewMode === "tablet" ? 768 : originalWidth
                  const scaleFactor = previewWidth / originalWidth

                  // Scale position and dimensions
                  const scaledPosition = {
                    x: block.position.x * scaleFactor,
                    y: block.position.y * scaleFactor,
                    width: block.position.width * scaleFactor,
                    height: block.position.height * scaleFactor,
                  }

                  const blockContent = (() => {
                    switch (block.type) {
                      case "header":
                        return (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              color: block.styles?.color || template.globalStyles.primaryColor,
                              fontFamily: template.globalStyles.fontFamily,
                              textAlign: block.styles?.textAlign || "center",
                            }}
                          >
                            <h1
                              className="text-3xl font-bold"
                              style={{
                                fontSize: `${(block.styles?.fontSize ? Number.parseInt(block.styles.fontSize) : 32) * scaleFactor}px`,
                                lineHeight: "1.2",
                                wordWrap: "break-word",
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {block.content?.text || "Titre de votre newsletter"}
                            </h1>
                          </div>
                        )

                      case "text":
                        return (
                          <div
                            className="w-full h-full flex items-start justify-start"
                            style={{
                              color: block.styles?.color || "#000000",
                              fontFamily: template.globalStyles.fontFamily,
                              textAlign: block.styles?.textAlign || "left",
                            }}
                          >
                            <div
                              className="prose max-w-none"
                              style={{
                                fontSize: `${(block.styles?.fontSize ? Number.parseInt(block.styles.fontSize) : 16) * scaleFactor}px`,
                                lineHeight: "1.6",
                                wordWrap: "break-word",
                                overflowWrap: "break-word",
                              }}
                              dangerouslySetInnerHTML={{
                                __html: block.content?.html || "<p>Votre contenu texte ici.</p>",
                              }}
                            />
                          </div>
                        )

                      case "image":
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            {block.content?.src ? (
                              <img
                                src={block.content.src || "/placeholder.svg"}
                                alt={block.content.alt || ""}
                                className="max-w-full h-auto rounded-lg"
                                style={{
                                  maxHeight: "100%",
                                  borderRadius: `${(block.styles?.borderRadius ? Number.parseInt(block.styles.borderRadius) : 8) * scaleFactor}px`,
                                }}
                              />
                            ) : (
                              <div
                                className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                                style={{
                                  borderRadius: `${(block.styles?.borderRadius ? Number.parseInt(block.styles.borderRadius) : 8) * scaleFactor}px`,
                                }}
                              >
                                <div className="text-center">
                                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                                  <p className="text-gray-500 text-sm">Image placeholder</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )

                      case "button":
                        return (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              textAlign: block.styles?.textAlign || "center",
                            }}
                          >
                            <a
                              href={block.content?.href || "#"}
                              className="inline-block font-medium text-decoration-none"
                              style={{
                                backgroundColor: block.styles?.backgroundColor || template.globalStyles.primaryColor,
                                color: block.styles?.color || "#FFFFFF",
                                borderRadius: `${(block.styles?.borderRadius ? Number.parseInt(block.styles.borderRadius) : 8) * scaleFactor}px`,
                                fontFamily: template.globalStyles.fontFamily,
                                padding: `${(block.styles?.paddingY || 16) * scaleFactor}px ${(block.styles?.paddingX || 32) * scaleFactor}px`,
                                fontSize: `${(block.styles?.fontSize ? Number.parseInt(block.styles.fontSize) : 16) * scaleFactor}px`,
                                fontWeight: "600",
                                textDecoration: "none",
                                display: "inline-block",
                              }}
                            >
                              {block.content?.text || "Cliquez ici"}
                            </a>
                          </div>
                        )

                      case "divider":
                        return (
                          <div className="w-full h-full flex items-center justify-center">
                            <hr
                              className="border-t"
                              style={{
                                borderColor: block.styles?.color || "#E5E7EB",
                                borderWidth: `${(block.styles?.thickness ? Number.parseInt(block.styles.thickness) : 1) * scaleFactor}px`,
                                width: "80%",
                              }}
                            />
                          </div>
                        )

                      default:
                        return (
                          <div className="w-full h-full bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center">
                            <div className="text-center text-yellow-600">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                              <span className="text-sm font-medium">Bloc non reconnu</span>
                            </div>
                          </div>
                        )
                    }
                  })()

                  return (
                    <div
                      key={block.id}
                      className="absolute"
                      style={{
                        left: scaledPosition.x,
                        top: scaledPosition.y,
                        width: scaledPosition.width,
                        height: scaledPosition.height,
                        padding: `${24 * scaleFactor}px`,
                        boxSizing: "border-box",
                      }}
                    >
                      {blockContent}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper functions
function getDefaultContent(blockType: string): any {
  switch (blockType) {
    case "header":
      return { text: "Titre de votre newsletter" }
    case "text":
      return {
        html: "<p>Votre contenu texte ici.</p>",
      }
    case "image":
      return { src: "", alt: "Description de l'image", href: "" }
    case "button":
      return { text: "Cliquez ici", href: "#" }
    case "divider":
      return {}
    default:
      return {}
  }
}

function getDefaultStyles(blockType: string): any {
  switch (blockType) {
    case "header":
      return { color: "#1F2937", textAlign: "center" }
    case "text":
      return {
        color: "#374151",
        fontSize: "16px",
        textAlign: "left",
      }
    case "image":
      return { borderRadius: "8px" }
    case "button":
      return {
        backgroundColor: "#3B82F6",
        color: "#FFFFFF",
        borderRadius: "8px",
        textAlign: "center",
        paddingX: 32,
        paddingY: 16,
        fontSize: "16px",
      }
    case "divider":
      return {
        color: "#E5E7EB",
        thickness: "1px",
      }
    default:
      return {}
  }
}

const validateAndCleanTemplate = (template: NewsletterTemplate): NewsletterTemplate => {
  const cleanedBlocks = template.blocks.map((block) => {
    if (!block.position) return block

    // Stricter email-compatible constraints
    const maxBlockWidth = Math.min(template.globalStyles.contentWidth - 60, 480)
    const maxBlockHeight = Math.min((template.globalStyles.contentHeight || 800) - 60, 350)
    const minBlockWidth = 160
    const minBlockHeight = 80

    // Constrain dimensions with grid alignment
    const gridSize = 20
    const snapToGrid = (value: number) => Math.round(value / gridSize) * gridSize

    const constrainedWidth = snapToGrid(Math.max(minBlockWidth, Math.min(block.position.width, maxBlockWidth)))
    const constrainedHeight = snapToGrid(Math.max(minBlockHeight, Math.min(block.position.height, maxBlockHeight)))

    // Constrain position with better margins
    const maxX = template.globalStyles.contentWidth - constrainedWidth - 30
    const maxY = (template.globalStyles.contentHeight || 800) - constrainedHeight - 30

    const constrainedX = snapToGrid(Math.max(30, Math.min(block.position.x, maxX)))
    const constrainedY = snapToGrid(Math.max(30, Math.min(block.position.y, maxY)))

    return {
      ...block,
      position: {
        x: constrainedX,
        y: constrainedY,
        width: constrainedWidth,
        height: constrainedHeight,
      },
    }
  })

  return {
    ...template,
    blocks: cleanedBlocks,
  }
}
