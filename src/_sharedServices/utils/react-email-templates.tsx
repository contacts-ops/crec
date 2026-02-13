import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Column,
  Text,
  Heading,
  Img,
  Button,
  Hr,
  Preview,
} from '@react-email/components'

// Base email template wrapper
export function BaseEmailTemplate({ 
  children, 
  subject, 
  previewText,
  backgroundColor = "#f5f5f5",
  containerWidth = 600 
}: {
  children: React.ReactNode
  subject: string
  previewText?: string
  backgroundColor?: string
  containerWidth?: number
}) {
  return (
    <Html>
      <Head>
        <title>{subject}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      </Head>
      <Preview>{previewText || subject}</Preview>
      <Body style={{ 
        margin: 0, 
        padding: '20px', 
        backgroundColor,
        fontFamily: 'Arial, sans-serif',
        WebkitTextSizeAdjust: '100%',
        textSizeAdjust: '100%'
      }}>
        <Container style={{ 
          width: containerWidth, 
          maxWidth: containerWidth,
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          {children}
        </Container>
      </Body>
    </Html>
  )
}

// Header block component
export function HeaderBlock({ 
  text, 
  color = "#1F2937", 
  textAlign = "center",
  fontSize = "32px",
  fontFamily = "Arial, sans-serif"
}: {
  text: string
  color?: string
  textAlign?: "left" | "center" | "right"
  fontSize?: string
  fontFamily?: string
}) {
  return (
    <Section style={{ padding: '24px' }}>
      <Heading 
        as="h1" 
        style={{
          color,
          fontSize,
          fontWeight: 'bold',
          textAlign,
          fontFamily,
          lineHeight: '1.2',
          margin: 0,
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        {text}
      </Heading>
    </Section>
  )
}

// Text block component
export function TextBlock({ 
  html, 
  color = "#374151", 
  textAlign = "left",
  fontSize = "16px",
  fontFamily = "Arial, sans-serif"
}: {
  html: string
  color?: string
  textAlign?: "left" | "center" | "right"
  fontSize?: string
  fontFamily?: string
}) {
  return (
    <Section style={{ padding: '24px' }}>
      <Text 
        style={{
          color,
          fontSize,
          textAlign,
          fontFamily,
          lineHeight: '1.6',
          margin: 0,
          wordWrap: 'break-word',
          overflowWrap: 'break-word'
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </Section>
  )
}

// Image block component
export function ImageBlock({ 
  src, 
  alt = "", 
  href = "", 
  borderRadius = "8px",
  width,
  height
}: {
  src: string
  alt?: string
  href?: string
  borderRadius?: string
  width?: number
  height?: number
}) {
  if (!src) {
    return (
      <Section style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{
          width: width || 400,
          height: height || 300,
          backgroundColor: '#f3f4f6',
          border: '2px dashed #d1d5db',
          borderRadius,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '14px'
        }}>
          Image placeholder
        </div>
      </Section>
    )
  }

  const imageElement = (
    <Img
      src={src}
      alt={alt}
      style={{
        width: width || '100%',
        height: height || 'auto',
        maxWidth: '100%',
        borderRadius,
        display: 'block',
        margin: '0 auto'
      }}
    />
  )

  if (href && href !== '#') {
    return (
      <Section style={{ padding: '24px', textAlign: 'center' }}>
        <a href={href} style={{ textDecoration: 'none', border: 'none', outline: 'none' }}>
          {imageElement}
        </a>
      </Section>
    )
  }

  return (
    <Section style={{ padding: '24px', textAlign: 'center' }}>
      {imageElement}
    </Section>
  )
}

// Button block component
export function ButtonBlock({ 
  text, 
  href = "#", 
  backgroundColor = "#3B82F6", 
  color = "#FFFFFF",
  borderRadius = "8px",
  paddingX = 32,
  paddingY = 16,
  fontSize = "16px",
  fontFamily = "Arial, sans-serif",
  textAlign = "center"
}: {
  text: string
  href?: string
  backgroundColor?: string
  color?: string
  borderRadius?: string
  paddingX?: number
  paddingY?: number
  fontSize?: string
  fontFamily?: string
  textAlign?: "left" | "center" | "right"
}) {
  const justifyContent = textAlign === "left" ? "flex-start" : textAlign === "right" ? "flex-end" : "center"

  return (
    <Section style={{ 
      padding: '24px', 
      textAlign: 'center',
      display: 'flex',
      justifyContent: justifyContent
    }}>
      <Button
        href={href}
        style={{
          backgroundColor,
          color,
          borderRadius,
          padding: `${paddingY}px ${paddingX}px`,
          fontSize,
          fontFamily,
          fontWeight: '600',
          textDecoration: 'none',
          display: 'inline-block',
          border: 'none',
          cursor: 'pointer',
          minWidth: 'auto',
          maxWidth: '100%',
          boxSizing: 'border-box',
          whiteSpace: 'nowrap'
        }}
      >
        {text}
      </Button>
    </Section>
  )
}

// Divider block component
export function DividerBlock({ 
  color = "#E5E7EB", 
  thickness = "1px" 
}: {
  color?: string
  thickness?: string
}) {
  return (
    <Section style={{ padding: '24px', textAlign: 'center' }}>
      <Hr style={{
        border: 'none',
        borderTop: `${thickness} solid ${color}`,
        width: '80%',
        margin: '0 auto'
      }} />
    </Section>
  )
}

// Gmail-compatible table-based layout component
export function TableBasedLayout({ 
  blocks, 
  globalStyles, 
  containerWidth 
}: {
  blocks: any[]
  globalStyles: any
  containerWidth: number
}) {
  // Group blocks into rows based on Y position
  const rows = groupBlocksIntoRows(blocks)
  
  return (
    <>
      {rows.map((row, rowIndex) => (
        <Section key={rowIndex} style={{ padding: 0 }}>
          {row.length === 1 ? (
            // Single block row - full width
            <Column>
              {renderBlock(row[0], globalStyles)}
            </Column>
          ) : (
            // Multiple blocks row - use table-based layout for Gmail compatibility
            <TableRowLayout 
              blocks={row} 
              globalStyles={globalStyles} 
              containerWidth={containerWidth}
            />
          )}
        </Section>
      ))}
    </>
  )
}

// Table-based row layout for Gmail compatibility
function TableRowLayout({ 
  blocks, 
  globalStyles, 
  containerWidth 
}: {
  blocks: any[]
  globalStyles: any
  containerWidth: number
}) {
  // Sort blocks by X position
  const sortedBlocks = [...blocks].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0))
  
  // Calculate column widths based on block positions
  const totalWidth = containerWidth
  const columnWidths = sortedBlocks.map(block => {
    const blockWidth = block.position?.width || 200
    return Math.round((blockWidth / totalWidth) * 100)
  })
  
  // Ensure total width is 100%
  const totalColumnWidth = columnWidths.reduce((sum, width) => sum + width, 0)
  if (totalColumnWidth !== 100) {
    const adjustment = 100 - totalColumnWidth
    columnWidths[0] += adjustment
  }
  
  return (
    <div style={{ 
      width: '100%', 
      padding: '0 24px',
      boxSizing: 'border-box'
    }}>
      {/* Gmail-compatible table structure */}
      <table 
        cellPadding="0" 
        cellSpacing="0" 
        border="0" 
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          msoTableLspace: '0pt',
          msoTableRspace: '0pt'
        }}
      >
        <tr>
          {sortedBlocks.map((block, index) => (
            <td 
              key={block.id}
              style={{
                width: `${columnWidths[index]}%`,
                verticalAlign: 'top',
                padding: '0',
                textAlign: getBlockTextAlign(block, globalStyles)
              }}
            >
              {renderBlockForTable(block, globalStyles)}
            </td>
          ))}
        </tr>
      </table>
    </div>
  )
}

// Get text alignment for block
function getBlockTextAlign(block: any, globalStyles: any): string {
  const textAlign = block.styles?.textAlign || "left"
  
  // Convert flexbox alignment to table alignment
  switch (textAlign) {
    case "left":
      return "left"
    case "center":
      return "center"
    case "right":
      return "right"
    default:
      return "left"
  }
}

// Render block optimized for table layout
function renderBlockForTable(block: any, globalStyles: any) {
  const blockStyles = block.styles || {}
  
  switch (block.type) {
    case "header":
      return (
        <div style={{
          padding: '24px 0',
          textAlign: getBlockTextAlign(block, globalStyles)
        }}>
          <h1 style={{
            color: blockStyles.color || globalStyles.primaryColor || "#1F2937",
            fontSize: blockStyles.fontSize || "32px",
            fontWeight: 'bold',
            margin: 0,
            lineHeight: '1.2',
            fontFamily: globalStyles.fontFamily || "Arial, sans-serif",
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}>
            {block.content?.text || "Titre"}
          </h1>
        </div>
      )
    
    case "text":
      return (
        <div style={{
          padding: '24px 0',
          textAlign: getBlockTextAlign(block, globalStyles)
        }}>
          <div 
            style={{
              color: blockStyles.color || "#374151",
              fontSize: blockStyles.fontSize || "16px",
              lineHeight: '1.6',
              margin: 0,
              fontFamily: globalStyles.fontFamily || "Arial, sans-serif",
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
            }}
            dangerouslySetInnerHTML={{ __html: block.content?.html || "<p>Texte</p>" }}
          />
        </div>
      )
    
    case "image":
      if (block.content?.src) {
        const imageElement = (
          <img
            src={block.content.src}
            alt={block.content.alt || ""}
            style={{
              width: '100%',
              maxWidth: '100%',
              height: 'auto',
              borderRadius: blockStyles.borderRadius || "8px",
              display: 'block',
              margin: '0 auto'
            }}
          />
        )
        
        if (block.content.href && block.content.href !== '#') {
          return (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <a href={block.content.href} style={{ textDecoration: 'none', border: 'none', outline: 'none' }}>
                {imageElement}
              </a>
            </div>
          )
        }
        
        return (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            {imageElement}
          </div>
        )
      } else {
        return (
          <div style={{
            padding: '24px 0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '100%',
              height: '200px',
              backgroundColor: '#f3f4f6',
              border: '2px dashed #d1d5db',
              borderRadius: blockStyles.borderRadius || "8px",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              fontSize: '14px'
            }}>
              Image placeholder
            </div>
          </div>
        )
      }
    
    case "button":
      const textAlign = getBlockTextAlign(block, globalStyles)
      const buttonStyle = {
        backgroundColor: blockStyles.backgroundColor || globalStyles.primaryColor || "#3B82F6",
        color: blockStyles.color || "#FFFFFF",
        borderRadius: blockStyles.borderRadius || "8px",
        padding: `${blockStyles.paddingY || 16}px ${blockStyles.paddingX || 32}px`,
        fontSize: blockStyles.fontSize || "16px",
        fontFamily: globalStyles.fontFamily || "Arial, sans-serif",
        fontWeight: '600',
        textDecoration: 'none',
        display: 'inline-block',
        border: 'none',
        cursor: 'pointer',
        textAlign: textAlign as any,
        minWidth: 'auto',
        maxWidth: '100%',
        boxSizing: 'border-box' as any,
        whiteSpace: 'nowrap' as any
      }
      
      return (
        <div style={{
          padding: '24px 0',
          textAlign: textAlign
        }}>
          <a href={block.content?.href || "#"} style={buttonStyle}>
            {block.content?.text || "Bouton"}
          </a>
        </div>
      )
    
    case "divider":
      return (
        <div style={{
          padding: '24px 0',
          textAlign: 'center'
        }}>
          <hr style={{
            border: 'none',
            borderTop: `${blockStyles.thickness || "1px"} solid ${blockStyles.color || "#E5E7EB"}`,
            width: '80%',
            margin: '0 auto'
          }} />
        </div>
      )
    
    default:
      return (
        <div style={{
          padding: '24px 0',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          Bloc non reconnu
        </div>
      )
  }
}

// Main newsletter template that combines all blocks
export function NewsletterEmailTemplate({ 
  templateData 
}: {
  templateData: {
    subject: string
    globalStyles: {
      backgroundColor: string
      contentWidth: number
      fontFamily: string
      primaryColor: string
    }
    blocks: Array<{
      id: string
      type: "header" | "text" | "image" | "button" | "divider"
      content: any
      styles: any
      position?: {
        x: number
        y: number
        width: number
        height: number
      }
    }>
  }
}) {
  const { subject, globalStyles, blocks } = templateData
  
  return (
    <BaseEmailTemplate 
      subject={subject}
      backgroundColor={globalStyles.backgroundColor}
      containerWidth={globalStyles.contentWidth}
    >
      <TableBasedLayout 
        blocks={blocks}
        globalStyles={globalStyles}
        containerWidth={globalStyles.contentWidth}
      />
    </BaseEmailTemplate>
  )
}

// Helper function to render individual blocks (for single block rows)
function renderBlock(block: any, globalStyles: any) {
  switch (block.type) {
    case "header":
      return (
        <HeaderBlock
          text={block.content?.text || "Titre"}
          color={block.styles?.color || globalStyles.primaryColor}
          textAlign={block.styles?.textAlign || "center"}
          fontSize={block.styles?.fontSize || "32px"}
          fontFamily={globalStyles.fontFamily}
        />
      )
    
    case "text":
      return (
        <TextBlock
          html={block.content?.html || "<p>Texte</p>"}
          color={block.styles?.color || "#374151"}
          textAlign={block.styles?.textAlign || "left"}
          fontSize={block.styles?.fontSize || "16px"}
          fontFamily={globalStyles.fontFamily}
        />
      )
    
    case "image":
      return (
        <ImageBlock
          src={block.content?.src || ""}
          alt={block.content?.alt || ""}
          href={block.content?.href || ""}
          borderRadius={block.styles?.borderRadius || "8px"}
          width={block.position?.width ? block.position.width - 48 : undefined}
          height={block.position?.height ? block.position.height - 48 : undefined}
        />
      )
    
    case "button":
      return (
        <ButtonBlock
          text={block.content?.text || "Bouton"}
          href={block.content?.href || "#"}
          backgroundColor={block.styles?.backgroundColor || globalStyles.primaryColor}
          color={block.styles?.color || "#FFFFFF"}
          borderRadius={block.styles?.borderRadius || "8px"}
          paddingX={block.styles?.paddingX || 32}
          paddingY={block.styles?.paddingY || 16}
          fontSize={block.styles?.fontSize || "16px"}
          fontFamily={globalStyles.fontFamily}
          textAlign={block.styles?.textAlign || "center"}
        />
      )
    
    case "divider":
      return (
        <DividerBlock
          color={block.styles?.color || "#E5E7EB"}
          thickness={block.styles?.thickness || "1px"}
        />
      )
    
    default:
      return (
        <Section style={{ padding: '24px', textAlign: 'center' }}>
          <Text style={{ color: '#6b7280', fontSize: '14px' }}>
            Bloc non reconnu
          </Text>
        </Section>
      )
  }
}

// Group blocks into rows based on Y position
function groupBlocksIntoRows(blocks: any[]): any[][] {
  const rows: any[][] = []
  const rowTolerance = 50 // 50px tolerance for grouping into rows
  
  blocks.forEach((block) => {
    if (!block.position) {
      console.warn("Block missing position data:", block)
      return
    }
    
    let addedToRow = false
    
    // Try to add to existing row
    for (const row of rows) {
      const rowMinY = Math.min(...row.map((b: any) => b.position?.y || 0))
      const rowMaxY = Math.max(...row.map((b: any) => (b.position?.y || 0) + (b.position?.height || 0)))
      
      const blockY = block.position.y
      const blockMaxY = block.position.y + block.position.height
      
      // Check if block overlaps vertically with this row
      const verticalOverlap = !(blockMaxY < rowMinY - rowTolerance || blockY > rowMaxY + rowTolerance)
      
      if (verticalOverlap) {
        // Check if there's horizontal space in this row
        const rowBlocks = row.map((b: any) => ({
          x: b.position?.x || 0,
          width: b.position?.width || 0,
          endX: (b.position?.x || 0) + (b.position?.width || 0)
        }))
        
        // Sort by X position
        rowBlocks.sort((a, b) => a.x - b.x)
        
        // Check if we can fit this block
        let canFit = true
        for (const existingBlock of rowBlocks) {
          if (block.position.x < existingBlock.endX && 
              block.position.x + block.position.width > existingBlock.x) {
            canFit = false
            break
          }
        }
        
        if (canFit) {
          row.push(block)
          addedToRow = true
          break
        }
      }
    }
    
    // Create new row if couldn't add to existing
    if (!addedToRow) {
      rows.push([block])
    }
  })
  
  return rows
} 