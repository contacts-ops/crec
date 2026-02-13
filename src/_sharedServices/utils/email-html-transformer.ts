// MJML-based HTML transformer for perfect Gmail compatibility
// This generates responsive HTML that works reliably in all email clients
export async function transformNewsletterToEmailHTML(templateData: any): Promise<string> {
  if (!templateData?.blocks || !Array.isArray(templateData.blocks)) {
    return "<div>No content available</div>"
  }

  // Use the ACTUAL user-configured dimensions from the builder
  const containerWidth = templateData.globalStyles?.contentWidth || 600
  const backgroundColor = templateData.globalStyles?.backgroundColor || "#FFFFFF"
  const fontFamily = templateData.globalStyles?.fontFamily || "Arial, sans-serif"

  console.log("[MJML Transformer] Using MJML for Newsletter Builder campaign")
  console.log("[MJML Transformer] Template dimensions:", { containerWidth, backgroundColor, fontFamily })
  
  try {
    // Dynamic import to avoid bundling issues
    const mjml = (await import('mjml')).default
    
    // Convert blocks to MJML structure with table-based layout for Gmail compatibility
    const mjmlStructure = convertBlocksToMJMLWithTables(templateData.blocks, templateData.globalStyles)

    // Generate MJML template
    const mjmlTemplate = `
      <mjml>
        <mj-head>
          <mj-title>Newsletter</mj-title>
          <mj-font name="Arial" href="https://fonts.googleapis.com/css?family=Arial" />
          <mj-attributes>
            <mj-all font-family="Arial, sans-serif" />
            <mj-text font-size="16px" color="#374151" line-height="1.6" />
            <mj-button font-size="16px" font-weight="600" />
          </mj-attributes>
        </mj-head>
        <mj-body background-color="#f5f5f5" width="${containerWidth}px">
          <mj-wrapper background-color="${backgroundColor}" border-radius="8px" padding="0">
            ${mjmlStructure}
          </mj-wrapper>
        </mj-body>
      </mjml>
    `

    // Convert MJML to HTML
    const result = mjml(mjmlTemplate, {
      keepComments: false,
      beautify: false,
      minify: true,
      validationLevel: 'soft'
    })

    if (result.errors && result.errors.length > 0) {
      console.warn("[MJML Transformer] MJML warnings:", result.errors)
    }

    console.log("[MJML Transformer] Generated MJML HTML length:", result.html.length)
    console.log("[MJML Transformer] HTML contains responsive structure:", result.html.includes("mjml"))
    
    return result.html
    
  } catch (error) {
    console.error("[MJML Transformer] MJML import failed, falling back to table-based layout:", error)
    
    // Fallback to table-based layout if MJML fails
    return generateTableBasedFallback(templateData)
  }
}

// Fallback table-based layout for when MJML fails
function generateTableBasedFallback(templateData: any): string {
  const containerWidth = templateData.globalStyles?.contentWidth || 600
  const backgroundColor = templateData.globalStyles?.backgroundColor || "#FFFFFF"
  const fontFamily = templateData.globalStyles?.fontFamily || "Arial, sans-serif"
  
  console.log("[MJML Transformer] Using fallback table-based layout")
  
  // Convert blocks to table-based HTML with proper alignment
  const tableHTML = convertBlocksToTableHTMLFallback(templateData.blocks, templateData.globalStyles, containerWidth)

  // Create the complete email HTML
  const emailHTML = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Newsletter</title>
      <style>
        /* Reset styles for email clients */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          margin: 0; 
          padding: 20px; 
          font-family: ${fontFamily}, Arial, sans-serif; 
          background-color: #f5f5f5; 
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        
        /* Container styles */
        .email-container { 
          width: ${containerWidth}px !important; 
          max-width: ${containerWidth}px !important;
          margin: 0 auto !important; 
          background-color: ${backgroundColor} !important; 
          border-radius: 8px !important;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
          overflow: hidden !important;
        }
        
        /* Table styles - Gmail compatible */
        .email-table {
          width: 100% !important;
          border-collapse: collapse !important;
          mso-table-lspace: 0pt !important;
          mso-table-rspace: 0pt !important;
          table-layout: fixed !important;
        }
        
        .email-cell {
          vertical-align: top !important;
          padding: 0 !important;
          border: none !important;
        }
        
        .content-block {
          padding: 24px !important;
          box-sizing: border-box !important;
          width: 100% !important;
        }
        
        /* Block-specific styles */
        .header-block {
          text-align: center !important;
          width: 100% !important;
        }
        
        .text-block {
          width: 100% !important;
        }
        
        .image-block {
          text-align: center !important;
          width: 100% !important;
        }
        
        .button-block {
          text-align: center !important;
          width: 100% !important;
        }
        
        /* Image styles for Gmail compatibility */
        img {
          -ms-interpolation-mode: bicubic !important;
          border: 0 !important;
          outline: none !important;
          text-decoration: none !important;
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* Button styles */
        .email-button {
          display: inline-block !important;
          text-decoration: none !important;
          border: none !important;
          outline: none !important;
          font-weight: 600 !important;
          text-align: center !important;
          vertical-align: middle !important;
          cursor: pointer !important;
          -webkit-text-size-adjust: none !important;
          mso-hide: all !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          white-space: nowrap !important;
        }
        
        /* Mobile responsive styles */
        @media only screen and (max-width: 600px) {
          .email-container { 
            width: 100% !important; 
            margin: 10px !important; 
          }
          .email-cell { 
            display: block !important; 
            width: 100% !important; 
          }
          .content-block { 
            padding: 15px !important; 
          }
          .email-button { 
            display: block !important; 
            width: auto !important; 
            max-width: 280px !important;
            margin: 10px auto !important;
          }
          h1 { font-size: 24px !important; }
          h2 { font-size: 20px !important; }
          p { font-size: 16px !important; line-height: 1.5 !important; }
          img { 
            width: 100% !important; 
            height: auto !important; 
            max-width: 100% !important;
          }
        }
        
        /* Outlook-specific fixes */
        @media screen and (max-width: 0) {
          .email-container { width: 100% !important; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <div class="email-container" style="width: ${containerWidth}px !important; max-width: ${containerWidth}px !important;">
        ${tableHTML}
      </div>
      
      <!-- Gmail-compatible tracking pixel -->
      <img src="{{trackingPixelUrl}}" width="1" height="1" style="display: none !important; max-height: 1px !important; max-width: 1px !important; opacity: 0.01;" alt="" />
    </body>
    </html>
  `
  
  return emailHTML
}

// Convert newsletter blocks to MJML structure with table-based layout for Gmail compatibility
function convertBlocksToMJMLWithTables(blocks: any[], globalStyles: any): string {
  if (blocks.length === 0) return ""

  console.log("[MJML Transformer] Converting blocks to MJML structure with tables:", blocks.length)
  
  // Get container width from global styles
  const containerWidth = globalStyles?.contentWidth || 600
  
  // Sort blocks by Y position (top to bottom)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const aY = a.position?.y || 0
    const bY = b.position?.y || 0
    return aY - bY
  })
  
  // Group blocks into rows based on Y position
  const rows = groupBlocksIntoRows(sortedBlocks)
  
  console.log("[MJML Transformer] Grouped into rows:", rows.length)
  
  // Convert rows to MJML with table-based layout
  let mjmlHTML = ""
  
  rows.forEach((row, rowIndex) => {
    if (row.length === 1) {
      // Single block row - full width
      const block = row[0]
      mjmlHTML += `
        <mj-section padding="0">
          <mj-column>
            ${convertBlockToMJML(block, globalStyles)}
          </mj-column>
        </mj-section>
      `
    } else {
      // Multiple blocks row - use table-based layout for Gmail compatibility
      mjmlHTML += convertRowToTableLayout(row, globalStyles, containerWidth)
    }
    
    // Add spacing between rows if needed
    if (rowIndex < rows.length - 1) {
      const nextRow = rows[rowIndex + 1]
      const currentRowMaxY = Math.max(...row.map((b: any) => b.position?.y + b.position?.height || 0))
      const nextRowMinY = Math.min(...nextRow.map((b: any) => b.position?.y || 0))
      const gap = nextRowMinY - currentRowMaxY
      
      if (gap > 30) {
        const spacerHeight = Math.min(gap, 50)
        mjmlHTML += `
          <mj-spacer height="${spacerHeight}px" />
        `
      }
    }
  })
  
  return mjmlHTML
}

// Convert a row of blocks to table-based layout for Gmail compatibility
function convertRowToTableLayout(row: any[], globalStyles: any, containerWidth: number): string {
  // Sort blocks by X position
  const sortedBlocks = [...row].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0))
  
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
  
  let tableHTML = `
    <mj-section padding="0">
      <mj-column>
        <mj-raw>
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
            <tr>
  `
  
  sortedBlocks.forEach((block, index) => {
    const textAlign = getBlockTextAlign(block, globalStyles)
    tableHTML += `
              <td style="width: ${columnWidths[index]}%; vertical-align: top; padding: 0; text-align: ${textAlign};">
                ${convertBlockToTableHTML(block, globalStyles)}
              </td>
    `
  })
  
  tableHTML += `
            </tr>
          </table>
        </mj-raw>
      </mj-column>
    </mj-section>
  `
  
  return tableHTML
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

// Convert individual block to table HTML for Gmail compatibility
function convertBlockToTableHTML(block: any, globalStyles: any): string {
  const blockStyles = block.styles || {}
  
  switch (block.type) {
    case "header":
      return `
        <div style="padding: 24px 0; text-align: ${getBlockTextAlign(block, globalStyles)};">
          <h1 style="
            color: ${blockStyles.color || globalStyles.primaryColor || "#1F2937"};
            font-size: ${blockStyles.fontSize || "32px"};
            font-weight: bold;
            margin: 0;
            line-height: 1.2;
            font-family: ${globalStyles.fontFamily || "Arial, sans-serif"};
            word-wrap: break-word;
            overflow-wrap: break-word;
          ">${block.content?.text || "Titre"}</h1>
        </div>
      `

    case "text":
      return `
        <div style="padding: 24px 0; text-align: ${getBlockTextAlign(block, globalStyles)};">
          <div style="
            color: ${blockStyles.color || "#374151"};
            font-size: ${blockStyles.fontSize || "16px"};
            line-height: 1.6;
            margin: 0;
            font-family: ${globalStyles.fontFamily || "Arial, sans-serif"};
            word-wrap: break-word;
            overflow-wrap: break-word;
          ">${block.content?.html || "Votre contenu texte ici."}</div>
        </div>
      `

    case "image":
      if (block.content?.src) {
        const imageElement = `
          <img src="${block.content.src}" 
               alt="${block.content?.alt || ""}"
               style="
                 width: 100%;
                 max-width: 100%;
                 height: auto;
                 border-radius: ${blockStyles.borderRadius || "8px"};
                 display: block;
                 margin: 0 auto;
               " />
        `
        
        if (block.content.href && block.content.href !== '#') {
          return `
            <div style="padding: 24px 0; text-align: center;">
              <a href="${block.content.href}" style="text-decoration: none; border: none; outline: none;">
                ${imageElement}
              </a>
            </div>
          `
        }
        
        return `
          <div style="padding: 24px 0; text-align: center;">
            ${imageElement}
          </div>
        `
      } else {
        return `
          <div style="padding: 24px 0; text-align: center;">
            <div style="
              width: 100%;
              height: 200px;
              background-color: #f3f4f6;
              border: 2px dashed #d1d5db;
              border-radius: ${blockStyles.borderRadius || "8px"};
              display: flex;
              align-items: center;
              justify-content: center;
              color: #9ca3af;
              font-size: 14px;
            ">Image placeholder</div>
          </div>
        `
      }

    case "button":
      const textAlign = getBlockTextAlign(block, globalStyles)
      const paddingX = blockStyles.paddingX || 32
      const paddingY = blockStyles.paddingY || 16
      const fontSize = blockStyles.fontSize || "16px"
      const backgroundColor = blockStyles.backgroundColor || globalStyles.primaryColor || "#3B82F6"
      const textColor = blockStyles.color || "#FFFFFF"
      const borderRadius = blockStyles.borderRadius || "8px"

      return `
        <div style="padding: 24px 0; text-align: ${textAlign};">
          <a href="${block.content?.href || "#"}" 
             style="
               background-color: ${backgroundColor};
               color: ${textColor};
               border-radius: ${borderRadius};
               padding: ${paddingY}px ${paddingX}px;
               font-size: ${fontSize};
               font-family: ${globalStyles.fontFamily || "Arial, sans-serif"};
               font-weight: 600;
               text-decoration: none;
               display: inline-block;
               border: none;
               cursor: pointer;
               text-align: ${textAlign};
               min-width: auto;
               max-width: 100%;
               box-sizing: border-box;
               white-space: nowrap;
             ">${block.content?.text || "Cliquez ici"}</a>
        </div>
      `

    case "divider":
      return `
        <div style="padding: 24px 0; text-align: center;">
          <hr style="
            border: none;
            border-top: ${blockStyles.thickness || "1px"} solid ${blockStyles.color || "#E5E7EB"};
            width: 80%;
            margin: 0 auto;
          " />
        </div>
      `

    default:
      return `
        <div style="padding: 24px 0; text-align: center; color: #6b7280; font-size: 14px;">
          Bloc non reconnu
        </div>
      `
  }
}

// Convert newsletter blocks to MJML structure
function convertBlocksToMJML(blocks: any[], globalStyles: any): string {
  if (blocks.length === 0) return ""

  console.log("[MJML Transformer] Converting blocks to MJML structure:", blocks.length)
  
  // Sort blocks by Y position (top to bottom)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const aY = a.position?.y || 0
    const bY = b.position?.y || 0
    return aY - bY
  })
  
  // Group blocks into rows based on Y position
  const rows = groupBlocksIntoRows(sortedBlocks)
  
  console.log("[MJML Transformer] Grouped into rows:", rows.length)
  
  // Convert rows to MJML
  let mjmlHTML = ""
  
  rows.forEach((row, rowIndex) => {
    if (row.length === 1) {
      // Single block row - full width
      const block = row[0]
      mjmlHTML += `
        <mj-section padding="0">
          <mj-column>
            ${convertBlockToMJML(block, globalStyles)}
          </mj-column>
        </mj-section>
      `
    } else {
      // Multiple blocks row - use columns
      mjmlHTML += '<mj-section padding="0">'
      
      row.forEach((block) => {
        const columnWidth = 100 / row.length
        mjmlHTML += `
          <mj-column width="${columnWidth.toFixed(1)}%">
            ${convertBlockToMJML(block, globalStyles)}
          </mj-column>
        `
      })
      
      mjmlHTML += '</mj-section>'
    }
    
    // Add spacing between rows if needed
    if (rowIndex < rows.length - 1) {
      const nextRow = rows[rowIndex + 1]
      const currentRowMaxY = Math.max(...row.map((b: any) => b.position?.y + b.position?.height || 0))
      const nextRowMinY = Math.min(...nextRow.map((b: any) => b.position?.y || 0))
      const gap = nextRowMinY - currentRowMaxY
      
      if (gap > 30) {
        const spacerHeight = Math.min(gap, 50)
        mjmlHTML += `
          <mj-spacer height="${spacerHeight}px" />
        `
      }
    }
  })
  
  return mjmlHTML
}

// Convert blocks to table-based HTML (fallback)
function convertBlocksToTableHTML(blocks: any[], globalStyles: any): string {
  if (blocks.length === 0) return ""

  console.log("[MJML Transformer] Converting blocks to table-based HTML:", blocks.length)
  
  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => (a.order || 0) - (b.order || 0))
  
  // Group blocks into rows based on Y position
  const rows = groupBlocksIntoRows(sortedBlocks)
  
  console.log("[MJML Transformer] Grouped into rows:", rows.length)
  
  // Convert rows to table HTML
  let tableHTML = '<table class="email-table" cellpadding="0" cellspacing="0" border="0" style="width: 100% !important; border-collapse: collapse !important;">'
  
  rows.forEach((row, rowIndex) => {
    if (row.length === 1) {
      // Single block row - full width
      const block = row[0]
      tableHTML += `
        <tr>
          <td class="email-cell" style="width: 100% !important; vertical-align: top !important; padding: 0 !important;">
            <div class="content-block">
              ${convertBlockToHTML(block, globalStyles)}
            </div>
          </td>
        </tr>
      `
    } else {
      // Multiple blocks row - use columns
      const columnWidth = 100 / row.length
      tableHTML += '<tr>'
      
      row.forEach((block) => {
        tableHTML += `
          <td class="email-cell" style="width: ${columnWidth.toFixed(1)}% !important; vertical-align: top !important; padding: 0 !important;">
            <div class="content-block">
              ${convertBlockToHTML(block, globalStyles)}
            </div>
          </td>
        `
      })
      
      tableHTML += '</tr>'
    }
    
    // Add spacing between rows if needed
    if (rowIndex < rows.length - 1) {
      const nextRow = rows[rowIndex + 1]
      const currentRowMaxY = Math.max(...row.map((b: any) => b.position?.y + b.position?.height || 0))
      const nextRowMinY = Math.min(...nextRow.map((b: any) => b.position?.y || 0))
      const gap = nextRowMinY - currentRowMaxY
      
      if (gap > 30) {
        const spacerHeight = Math.min(gap, 50)
        tableHTML += `
          <tr>
            <td colspan="100" style="height: ${spacerHeight}px !important; font-size: 1px !important; line-height: 1px !important;">&nbsp;</td>
          </tr>
        `
      }
    }
  })
  
  tableHTML += '</table>'
  
  return tableHTML
}

// Convert blocks to table-based HTML for fallback (Gmail compatible)
function convertBlocksToTableHTMLFallback(blocks: any[], globalStyles: any, containerWidth: number): string {
  if (blocks.length === 0) return ""

  console.log("[MJML Transformer] Converting blocks to fallback table HTML:", blocks.length)
  
  // Sort blocks by Y position (top to bottom)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const aY = a.position?.y || 0
    const bY = b.position?.y || 0
    return aY - bY
  })
  
  // Group blocks into rows based on Y position
  const rows = groupBlocksIntoRows(sortedBlocks)
  
  console.log("[MJML Transformer] Grouped into rows for fallback:", rows.length)
  
  // Convert rows to table HTML
  let tableHTML = '<table class="email-table" cellpadding="0" cellspacing="0" border="0" style="width: 100% !important; border-collapse: collapse !important;">'
  
  rows.forEach((row, rowIndex) => {
    if (row.length === 1) {
      // Single block row - full width
      const block = row[0]
      tableHTML += `
        <tr>
          <td class="email-cell" style="width: 100% !important; vertical-align: top !important; padding: 0 !important;">
            <div class="content-block">
              ${convertBlockToHTML(block, globalStyles)}
            </div>
          </td>
        </tr>
      `
    } else {
      // Multiple blocks row - use table-based layout for Gmail compatibility
      tableHTML += convertRowToTableHTMLFallback(row, globalStyles, containerWidth)
    }
    
    // Add spacing between rows if needed
    if (rowIndex < rows.length - 1) {
      const nextRow = rows[rowIndex + 1]
      const currentRowMaxY = Math.max(...row.map((b: any) => b.position?.y + b.position?.height || 0))
      const nextRowMinY = Math.min(...nextRow.map((b: any) => b.position?.y || 0))
      const gap = nextRowMinY - currentRowMaxY
      
      if (gap > 30) {
        const spacerHeight = Math.min(gap, 50)
        tableHTML += `
          <tr>
            <td colspan="100" style="height: ${spacerHeight}px !important; font-size: 1px !important; line-height: 1px !important;">&nbsp;</td>
          </tr>
        `
      }
    }
  })
  
  tableHTML += '</table>'
  
  return tableHTML
}

// Convert a row of blocks to table HTML for fallback (Gmail compatible)
function convertRowToTableHTMLFallback(row: any[], globalStyles: any, containerWidth: number): string {
  // Sort blocks by X position
  const sortedBlocks = [...row].sort((a, b) => (a.position?.x || 0) - (b.position?.x || 0))
  
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
  
  let rowHTML = '<tr style="vertical-align: top !important;">'
  
  sortedBlocks.forEach((block, index) => {
    const textAlign = getBlockTextAlign(block, globalStyles)
    rowHTML += `
      <td class="email-cell" style="width: ${columnWidths[index]}% !important; vertical-align: top !important; padding: 0 !important; text-align: ${textAlign} !important;">
        <div class="content-block">
          ${convertBlockToHTML(block, globalStyles)}
        </div>
      </td>
    `
  })
  
  rowHTML += '</tr>'
  return rowHTML
}

// Group blocks into rows based on Y position
function groupBlocksIntoRows(blocks: any[]): any[][] {
  const rows: any[][] = []
  const rowTolerance = 50 // 50px tolerance for grouping into rows
  
  blocks.forEach((block) => {
    if (!block.position) {
      console.warn("[MJML Transformer] Block missing position data:", block)
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
          console.log(`[MJML Transformer] Added block ${block.type} to existing row`)
          break
        }
      }
    }
    
    // Create new row if couldn't add to existing
    if (!addedToRow) {
      rows.push([block])
      console.log(`[MJML Transformer] Created new row for block ${block.type}`)
    }
  })
  
  console.log("[MJML Transformer] Final row structure:", rows.map((row, index) => ({
    rowIndex: index,
    blocks: row.map(b => ({ 
      type: b.type, 
      x: b.position?.x, 
      y: b.position?.y, 
      width: b.position?.width 
    }))
  })))
  
  return rows
}

// Convert individual block to MJML
function convertBlockToMJML(block: any, globalStyles: any): string {
  const blockStyles = block.styles || {}
  
  switch (block.type) {
    case "header":
      return `
        <mj-text
          font-size="${blockStyles.fontSize || "32px"}"
          color="${blockStyles.color || globalStyles.primaryColor || "#1f2937"}"
          font-weight="${blockStyles.fontWeight || "700"}"
          align="${blockStyles.textAlign || "center"}"
          padding="24px"
          line-height="1.2"
        >
          ${block.content?.text || "Titre de votre newsletter"}
        </mj-text>
      `

    case "text":
      return `
        <mj-text
          font-size="${blockStyles.fontSize || "16px"}"
          color="${blockStyles.color || "#374151"}"
          align="${blockStyles.textAlign || "left"}"
          padding="24px"
          line-height="1.6"
        >
          ${block.content?.html || "Votre contenu texte ici."}
        </mj-text>
      `

    case "image":
      if (block.content?.src) {
        return `
          <mj-image
            src="${block.content.src}"
            alt="${block.content?.alt || ""}"
            border-radius="${blockStyles.borderRadius || "8px"}"
            padding="24px"
            width="100%"
          />
        `
      } else {
        return `
          <mj-text
            padding="24px"
            text-align="center"
            color="#9ca3af"
            font-size="14px"
          >
            Image placeholder
          </mj-text>
        `
      }

    case "button":
      const paddingX = blockStyles.paddingX || 32
      const paddingY = blockStyles.paddingY || 16
      const fontSize = blockStyles.fontSize || "16px"
      const backgroundColor = blockStyles.backgroundColor || globalStyles.primaryColor || "#3B82F6"
      const textColor = blockStyles.color || "#FFFFFF"
      const borderRadius = blockStyles.borderRadius || "8px"

      return `
        <mj-button
          href="${block.content?.href || "#"}"
          background-color="${backgroundColor}"
          color="${textColor}"
          border-radius="${borderRadius}"
          font-size="${fontSize}"
          font-weight="600"
          padding="${paddingY}px ${paddingX}px"
          align="${blockStyles.textAlign || "center"}"
          inner-padding="16px 32px"
        >
          ${block.content?.text || "Cliquez ici"}
        </mj-button>
      `

    case "divider":
      return `
        <mj-divider
          border-color="${blockStyles.color || "#E5E7EB"}"
          border-width="${blockStyles.thickness || "1px"}"
          padding="24px"
        />
      `

    default:
      return `
        <mj-text
          padding="24px"
          text-align="center"
          color="#6b7280"
          font-size="14px"
          background-color="#f3f4f6"
        >
          Bloc non reconnu
        </mj-text>
      `
  }
}

// Convert individual block to HTML (fallback)
function convertBlockToHTML(block: any, globalStyles: any): string {
  const blockStyles = block.styles || {}
  
  switch (block.type) {
    case "header":
      return `
        <div class="header-block" style="
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: ${blockStyles.textAlign === "left" ? "flex-start" : blockStyles.textAlign === "right" ? "flex-end" : "center"} !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        ">
          <h1 style="
            font-size: ${blockStyles.fontSize || "32px"} !important;
            color: ${blockStyles.color || globalStyles.primaryColor || "#333"} !important;
            font-weight: ${blockStyles.fontWeight || "700"} !important;
            margin: 0 !important;
            line-height: 1.2 !important;
            text-align: ${blockStyles.textAlign || "center"} !important;
            font-family: ${globalStyles.fontFamily || "Arial, sans-serif"} !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          ">${block.content?.text || "Titre"}</h1>
        </div>
      `

    case "text":
      return `
        <div class="text-block" style="
          width: 100% !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: ${blockStyles.textAlign === "left" ? "flex-start" : blockStyles.textAlign === "right" ? "flex-end" : "center"} !important;
        ">
          <div style="
            font-size: ${blockStyles.fontSize || "16px"} !important;
            color: ${blockStyles.color || "#333"} !important;
            margin: 0 !important;
            line-height: 1.6 !important;
            text-align: ${blockStyles.textAlign || "left"} !important;
            font-family: ${globalStyles.fontFamily || "Arial, sans-serif"} !important;
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
          ">${block.content?.html || "Texte"}</div>
        </div>
      `

    case "image":
      if (block.content?.src) {
        return `
          <div class="image-block" style="
            width: 100% !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          ">
            <img src="${block.content.src}" 
                 alt="${block.content?.alt || ""}"
                 style="
                   width: 100% !important;
                   max-width: 100% !important;
                   border-radius: ${blockStyles.borderRadius || "8px"} !important;
                   display: block !important;
                   margin: 0 auto !important;
                 " />
          </div>
        `
      } else {
        return `
          <div class="image-block" style="
            width: 100% !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          ">
            <div style="
              width: 100%;
              height: 200px;
              background-color: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: ${blockStyles.borderRadius || "8px"};
              border: 2px dashed #d1d5db;
            ">
              <span style="color: #9ca3af; font-size: 14px;">Image placeholder</span>
            </div>
          </div>
        `
      }

    case "button":
      const paddingX = blockStyles.paddingX || 32
      const paddingY = blockStyles.paddingY || 16
      const fontSize = blockStyles.fontSize || "16px"
      const backgroundColor = blockStyles.backgroundColor || globalStyles.primaryColor || "#3B82F6"
      const textColor = blockStyles.color || "#FFFFFF"
      const borderRadius = blockStyles.borderRadius || "8px"

      return `
        <div class="button-block" style="
          width: 100% !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: ${blockStyles.textAlign === "left" ? "flex-start" : blockStyles.textAlign === "right" ? "flex-end" : "center"} !important;
        ">
          <a href="${block.content?.href || "#"}" 
             class="email-button"
             style="
               background-color: ${backgroundColor} !important;
               color: ${textColor} !important;
               padding: ${paddingY}px ${paddingX}px !important;
               border-radius: ${borderRadius} !important;
               font-size: ${fontSize} !important;
               text-decoration: none !important;
              display: inline-block !important;
               font-weight: 600 !important;
               text-align: center !important;
               max-width: 100% !important;
               box-sizing: border-box !important;
               white-space: nowrap !important;
               border: none !important;
               cursor: pointer !important;
             ">${block.content?.text || "Button"}</a>
        </div>
      `

    case "divider":
      return `
        <div style="
          width: 100% !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        ">
          <hr style="
            border: none !important;
            border-top: ${blockStyles.thickness || "1px"} solid ${blockStyles.color || "#E5E7EB"} !important;
            width: 80% !important;
            margin: 0 !important;
          " />
        </div>
      `

    default:
      return `
        <div style="
          width: 100% !important;
          background-color: #f3f4f6;
          border: 2px dashed #d1d5db;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #6b7280;
          font-size: 14px;
          padding: 20px;
        ">
          Bloc non reconnu
        </div>
      `
  }
}