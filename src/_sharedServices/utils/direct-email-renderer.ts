/**
 * Direct email HTML renderer that preserves exact positioning from the newsletter builder
 * This generates Gmail-compatible HTML without any external dependencies
 */
export async function renderNewsletterToEmailHTML(templateData: any): Promise<string> {
  try {
    console.log("[Direct Email Renderer] Rendering newsletter template with", templateData.blocks?.length || 0, "blocks")
    
    // Validate template data
    if (!templateData?.blocks || !Array.isArray(templateData.blocks)) {
      console.warn("[Direct Email Renderer] Invalid template data, returning fallback")
      return "<div>No content available</div>"
    }

    // Filter out blocks without valid positions
    const validBlocks = templateData.blocks.filter((block: any) => {
      if (!block.position) {
        console.warn("[Direct Email Renderer] Block missing position:", block.id, block.type)
        return false
      }
      
      // Validate block dimensions
      const { width, height } = block.position
      if (width < 150 || height < 60 || width > 500 || height > 400) {
        console.warn("[Direct Email Renderer] Block dimensions out of email-safe range:", {
          id: block.id,
          type: block.type,
          width,
          height
        })
        return false
      }
      
      return true
    })

    console.log("[Direct Email Renderer] Valid blocks for rendering:", validBlocks.length)

    // Ensure required fields exist
    const enhancedTemplateData = {
      subject: templateData.subject || "Newsletter",
      globalStyles: {
        backgroundColor: templateData.globalStyles?.backgroundColor || "#FFFFFF",
        contentWidth: templateData.globalStyles?.contentWidth || 600,
        fontFamily: templateData.globalStyles?.fontFamily || "Arial, sans-serif",
        primaryColor: templateData.globalStyles?.primaryColor || "#3B82F6"
      },
      blocks: validBlocks.map((block: any) => ({
        ...block,
        position: {
          x: Math.max(0, block.position.x),
          y: Math.max(0, block.position.y),
          width: Math.max(150, Math.min(block.position.width, 500)),
          height: Math.max(60, Math.min(block.position.height, 400))
        }
      }))
    }

    console.log("[Direct Email Renderer] Enhanced template data:", {
      subject: enhancedTemplateData.subject,
      containerWidth: enhancedTemplateData.globalStyles.contentWidth,
      backgroundColor: enhancedTemplateData.globalStyles.backgroundColor,
      blocksCount: enhancedTemplateData.blocks.length
    })

    // Generate HTML directly with table-based layout for Gmail compatibility
    const emailHTML = generateDirectHTML(enhancedTemplateData)

    console.log("[Direct Email Renderer] Generated HTML length:", emailHTML.length)
    console.log("[Direct Email Renderer] HTML contains email structure:", emailHTML.includes("<!DOCTYPE html>"))

    // Add tracking pixel for email opens
    const htmlWithTracking = emailHTML.replace(
      '</body>',
      '    <!-- Gmail-compatible tracking pixel for email opens -->\n    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display: none !important; max-height: 1px !important; max-width: 1px !important; opacity: 0.01;" alt="" />\n  </body>'
    )

    return htmlWithTracking

  } catch (error) {
    console.error("[Direct Email Renderer] Error rendering template:", error)
    
    // Return a fallback HTML if rendering fails
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${templateData.subject || "Newsletter"}</title>
        <style>
          body { 
            margin: 0; 
            padding: 20px; 
            font-family: Arial, sans-serif; 
            background-color: #f5f5f5; 
          }
          .container { 
            width: ${templateData.globalStyles?.contentWidth || 600}px; 
            max-width: 100%;
            margin: 0 auto; 
            background-color: ${templateData.globalStyles?.backgroundColor || "#FFFFFF"}; 
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .error-message {
            text-align: center;
            color: #6b7280;
            padding: 40px 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error-message">
            <h2>Erreur de rendu</h2>
            <p>Le contenu de la newsletter n'a pas pu être affiché correctement.</p>
            <p>Veuillez vérifier la configuration du template.</p>
          </div>
        </div>
        <!-- Tracking pixel -->
        <img src="{{trackingPixelUrl}}" width="1" height="1" style="display: none;" alt="" />
      </body>
      </html>
    `
  }
}

/**
 * Generate HTML directly with table-based layout for Gmail compatibility while preserving positioning
 */
function generateDirectHTML(templateData: any): string {
  const { subject, globalStyles, blocks } = templateData
  
  // Sort blocks by Y position to maintain order
  const sortedBlocks = [...blocks].sort((a: any, b: any) => (a.position?.y || 0) - (b.position?.y || 0))
  
  // Group blocks into rows based on Y position with tolerance
  const rowTolerance = 50 // pixels
  const rows: any[][] = []
  
  sortedBlocks.forEach((block: any) => {
    if (!block.position) return
    
    const blockY = block.position.y
    let addedToRow = false
    
    for (const row of rows) {
      const rowY = row[0]?.position?.y || 0
      if (Math.abs(blockY - rowY) <= rowTolerance) {
        row.push(block)
        addedToRow = true
        break
      }
    }
    
    if (!addedToRow) {
      rows.push([block])
    }
  })
  
  // Sort blocks within each row by X position
  rows.forEach(row => {
    row.sort((a: any, b: any) => (a.position?.x || 0) - (b.position?.x || 0))
  })
  
  let html = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Email client resets */
    body, table, td, p, a, li, blockquote { 
      -webkit-text-size-adjust: 100% !important; 
      -ms-text-size-adjust: 100% !important; 
    }
    table, td { 
      mso-table-lspace: 0pt !important; 
      mso-table-rspace: 0pt !important; 
      border-collapse: collapse !important;
    }
    img { 
      -ms-interpolation-mode: bicubic !important; 
      border: 0 !important; 
      outline: none !important; 
      text-decoration: none !important; 
      max-width: 100% !important;
      height: auto !important;
      display: block !important;
    }
    
    /* Main styles */
    body { 
      margin: 0 !important; 
      padding: 20px !important; 
      font-family: ${globalStyles.fontFamily} !important; 
      background-color: #f5f5f5 !important; 
    }
    .email-container { 
      width: ${globalStyles.contentWidth}px !important; 
      max-width: ${globalStyles.contentWidth}px !important;
      margin: 0 auto !important; 
      background-color: ${globalStyles.backgroundColor} !important; 
      border-radius: 8px !important;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
      overflow: hidden !important;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .email-container { 
        width: 100% !important; 
        margin: 10px !important; 
      }
      .block-cell {
        display: block !important;
        width: 100% !important;
        padding: 10px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
      <tbody>
`

  // Generate rows with proper positioning
  rows.forEach((row, rowIndex) => {
    const rowY = row[0]?.position?.y || 0
    const prevRowY = rowIndex > 0 ? rows[rowIndex - 1][0]?.position?.y || 0 : 0
    const prevRowHeight = rowIndex > 0 ? Math.max(...rows[rowIndex - 1].map((b: any) => b.position?.height || 0)) : 0
    
    // Add spacing between rows
    const spacing = rowY - (prevRowY + prevRowHeight)
    if (spacing > 20) {
      html += `
        <tr>
          <td style="height: ${spacing}px; font-size: 1px; line-height: 1px;">&nbsp;</td>
        </tr>
`
    }
    
    // Generate the row
    html += `
        <tr>
`
    
    // Calculate column widths for this row
    const totalRowWidth = globalStyles.contentWidth
    const columnWidths = row.map((block: any) => {
      const blockWidth = block.position?.width || 200
      return Math.round((blockWidth / totalRowWidth) * 100)
    })
    
    // Ensure total width is 100%
    const totalColumnWidth = columnWidths.reduce((sum, width) => sum + width, 0)
    if (totalColumnWidth !== 100) {
      const adjustment = 100 - totalColumnWidth
      columnWidths[0] += adjustment
    }
    
    // Generate columns for this row
    row.forEach((block: any, colIndex: number) => {
      const blockHTML = generateBlockHTML(block, globalStyles)
      const columnWidth = columnWidths[colIndex]
      
      html += `
          <td class="block-cell" style="width: ${columnWidth}%; vertical-align: top; padding: 0;">
            <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 24px; box-sizing: border-box;">
                  ${blockHTML}
                </td>
              </tr>
            </table>
          </td>
`
    })
    
    html += `
        </tr>
`
  })

  html += `
      </tbody>
    </table>
  </div>
</body>
</html>
`

  return html
}

/**
 * Generate HTML for individual blocks with exact styling
 */
function generateBlockHTML(block: any, globalStyles: any): string {
  const blockStyles = block.styles || {}
  
  switch (block.type) {
    case "header":
      return `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: ${blockStyles.textAlign === 'left' ? 'flex-start' : 
                           blockStyles.textAlign === 'right' ? 'flex-end' : 'center'};
          color: ${blockStyles.color || globalStyles.primaryColor};
          font-family: ${globalStyles.fontFamily};
          font-size: ${blockStyles.fontSize || '32px'};
          font-weight: bold;
          line-height: 1.2;
          text-align: ${blockStyles.textAlign || 'center'};
          word-wrap: break-word;
          white-space: pre-wrap;
        ">
          ${block.content?.text || "Titre de votre newsletter"}
        </div>
      `
    
    case "text":
      return `
        <div style="
          width: 100%;
          height: 100%;
          color: ${blockStyles.color || '#374151'};
          font-family: ${globalStyles.fontFamily};
          font-size: ${blockStyles.fontSize || '16px'};
          text-align: ${blockStyles.textAlign || 'left'};
          line-height: 1.6;
          word-wrap: break-word;
          overflow-wrap: break-word;
        ">
          ${block.content?.html || '<p>Votre contenu texte ici.</p>'}
        </div>
      `
    
    case "image":
      if (block.content?.src) {
        const imageElement = `
          <img
            src="${block.content.src}"
            alt="${block.content.alt || ""}"
            style="
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: ${blockStyles.borderRadius || '8px'};
              display: block;
            "
          />
        `
        
        return block.content.href ? `
          <a href="${block.content.href}" style="display: block; width: 100%; height: 100%;">
            ${imageElement}
          </a>
        ` : imageElement
      } else {
        return `
          <div style="
            width: 100%;
            height: 100%;
            background-color: #f3f4f6;
            border: 2px dashed #d1d5db;
            border-radius: ${blockStyles.borderRadius || '8px'};
            display: flex;
            align-items: center;
            justify-content: center;
            color: #9ca3af;
            font-size: 14px;
          ">
            Image placeholder
          </div>
        `
      }
    
    case "button":
      const buttonText = block.content?.text || "Bouton"
      const buttonHref = block.content?.href || "#"
      const backgroundColor = blockStyles.backgroundColor || globalStyles.primaryColor
      const textColor = blockStyles.color || "#FFFFFF"
      const borderRadius = blockStyles.borderRadius || "8px"
      const paddingY = blockStyles.paddingY || 16
      const paddingX = blockStyles.paddingX || 32
      const fontSize = blockStyles.fontSize || "16px"
      const textAlign = blockStyles.textAlign || "center"
      
      const justifyContent = textAlign === "left" ? "flex-start" : 
                           textAlign === "right" ? "flex-end" : "center"
      
      return `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: ${justifyContent};
        ">
          <a
            href="${buttonHref}"
            style="
              background-color: ${backgroundColor};
              color: ${textColor};
              border-radius: ${borderRadius};
              padding: ${paddingY}px ${paddingX}px;
              font-size: ${fontSize};
              font-family: ${globalStyles.fontFamily};
              text-decoration: none;
              display: inline-block;
              font-weight: 600;
              text-align: ${textAlign};
              white-space: nowrap;
              box-sizing: border-box;
            "
          >
            ${buttonText}
          </a>
        </div>
      `
    
    case "divider":
      return `
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <hr style="
            border: none;
            border-top: ${blockStyles.thickness || '1px'} solid ${blockStyles.color || '#E5E7EB'};
            width: 80%;
            margin: 0;
          " />
        </div>
      `
    
    default:
      return `
        <div style="
          width: 100%;
          height: 100%;
          background-color: #f3f4f6;
          border: 2px dashed #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 14px;
        ">
          Bloc non reconnu
        </div>
      `
  }
}

/**
 * Generate text-only version of the newsletter for email clients that don't support HTML
 */
export function generateTextContent(templateData: any): string {
  if (!templateData?.blocks || !Array.isArray(templateData.blocks)) {
    return "Contenu non disponible"
  }

  return templateData.blocks
    .map((block: any) => {
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


