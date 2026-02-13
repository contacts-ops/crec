// Email-compatible image generation utilities
// Addresses Gmail, Outlook, and other email client rendering issues
type ImageBlock = {
  content?: { src: string; alt?: string; href?: string }
  position?: { width?: number; height?: number; x: number; y: number }
  styles?: { borderRadius?: string }
}

type EmailTemplate = {
  blocks: any[]
  globalStyles: {
    contentWidth: number
    contentHeight?: number
    fontFamily: string
    backgroundColor: string
    primaryColor?: string
  }
  subject: string
}

function generateImagePlaceholder(block: ImageBlock, containerWidth?: number, containerHeight?: number): string {
  const width = containerWidth || 600
  const height = containerHeight || 300

  return `<table cellpadding="0" cellspacing="0" border="0" style="width: ${width}px !important; height: ${height}px !important; margin: 0 auto !important; border-collapse: collapse !important;">
    <tr>
      <td style="width: ${width}px !important; height: ${height}px !important; background-color: #f3f4f6 !important; text-align: center !important; vertical-align: middle !important; border: 2px dashed #d1d5db !important; font-family: Arial, sans-serif !important; font-size: 14px !important; color: #6b7280 !important;">
        <div style="padding: 20px !important;">
          <div style="font-size: 16px !important; font-weight: bold !important; margin-bottom: 8px !important;">Image non disponible</div>
          <div style="font-size: 12px !important;">L'image ne peut pas être affichée dans cet email</div>
        </div>
      </td>
    </tr>
  </table>`
}

function generateEmailCompatibleBlockHTML(block: any, template: EmailTemplate): string {
  let textAlign,
    fontSize,
    fontFamily,
    color,
    bgColor,
    textColor,
    borderRadius,
    paddingY,
    paddingX,
    buttonText,
    buttonHref
  switch (block.type) {
    case "text":
      textAlign = block.styles?.textAlign || "left"
      fontSize = block.styles?.fontSize || "16px"
      color = block.styles?.color || "#000000"
      fontFamily = template.globalStyles.fontFamily || "Arial, sans-serif"

      const textContent = block.content?.html || block.content?.text || ""
      if (!textContent) {
        console.log("[DEBUG] Warning: Empty text content in block:", block)
        return `<div style="width: 100% !important; height: 100% !important;"></div>`
      }

      return `<div style="width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: ${textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"} !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${color} !important; line-height: 1.4 !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important;">${textContent}</div>`

    case "header":
      const headerContent = block.content?.text || "Titre"
      const headerAlign = block.styles?.textAlign || "center"
      const headerColor = block.styles?.color || template.globalStyles.primaryColor || "#1F2937"

      return `<div style="width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: ${headerAlign === "center" ? "center" : headerAlign === "right" ? "flex-end" : "flex-start"} !important; font-family: ${template.globalStyles.fontFamily || "Arial, sans-serif"} !important; font-size: 28px !important; font-weight: bold !important; color: ${headerColor} !important; line-height: 1.2 !important; word-wrap: break-word !important; text-align: ${headerAlign} !important;">${headerContent}</div>`

    case "image":
      return generateEmailCompatibleImageHTML(block, template)

    case "button":
      buttonHref = block.content?.href || "#"
      bgColor = block.styles?.backgroundColor || template.globalStyles.primaryColor || "#007bff"
      textColor = "#ffffff" // Always use white text for buttons
      borderRadius = block.styles?.borderRadius || "8px"
      paddingY = block.styles?.paddingY || 16
      paddingX = block.styles?.paddingX || 32
      fontSize = block.styles?.fontSize || "16px"
      fontFamily = template.globalStyles.fontFamily || "Arial, sans-serif"
      textAlign = block.styles?.textAlign || "center"
      buttonText = block.content?.text || "Button"

      return `<div style="width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: ${textAlign === "center" ? "center" : textAlign === "right" ? "flex-end" : "flex-start"} !important;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonHref}" style="height:${paddingY * 2 + 20}px;v-text-anchor:middle;width:auto;" arcsize="${Math.min(50, Number.parseInt(borderRadius))}%" fillcolor="${bgColor}">
<w:anchorlock/>
<center style="color:${textColor};font-family:${fontFamily};font-size:${fontSize};font-weight:600;">${buttonText}</center>
</v:roundrect>
<![endif]-->
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important;">
  <tr>
    <td style="background-color: ${bgColor} !important; border: 1px solid ${bgColor} !important; border-radius: ${borderRadius} !important; padding: ${paddingY}px ${paddingX}px !important; text-align: center !important;">
      <a href="${buttonHref}" style="color: ${textColor} !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; font-weight: 600 !important; line-height: 1.4 !important; text-decoration: none !important; display: inline-block !important; -webkit-text-size-adjust: none !important;">${buttonText}</a>
    </td>
  </tr>
</table>
</div>`

    case "divider":
      const dividerColor = block.styles?.color || "#E5E7EB"
      const thickness = block.styles?.thickness || "1px"

      return `<div style="width: 100% !important; height: 100% !important; display: flex !important; align-items: center !important; justify-content: center !important;"><hr style="border: none !important; border-top: ${thickness} solid ${dividerColor} !important; width: 80% !important; margin: 0 !important;" /></div>`

    default:
      return `<div style="width: 100% !important; height: 100% !important;"></div>`
  }
}

/**
 * Generate email-compatible image HTML that works across all major email clients
 * Specifically addresses Gmail's CSS stripping and Outlook's rendering quirks
 */
export function generateEmailCompatibleImageHTML(
  block: ImageBlock,
  template: EmailTemplate,
  containerWidth?: number,
  containerHeight?: number,
): string {
  if (!block.content?.src) {
    return generateImagePlaceholder(block, containerWidth, containerHeight)
  }

  const explicitWidth = block.position?.width ? block.position.width - 48 : containerWidth || 600 // Subtract padding
  const explicitHeight = block.position?.height ? block.position.height - 48 : containerHeight || 300 // Subtract padding

  console.log(`[DEBUG] Generating image with exact dimensions: ${explicitWidth}x${explicitHeight}`)

  const emailSafeImageStyles = [
    `width: ${explicitWidth}px !important`,
    `height: ${explicitHeight}px !important`,
    `max-width: ${explicitWidth}px !important`,
    `max-height: ${explicitHeight}px !important`,
    `display: block !important`,
    `margin: 0 auto !important`,
    `padding: 0 !important`,
    `border: 0 !important`,
    `outline: none !important`,
    `text-decoration: none !important`,
    `object-fit: cover !important`,
    // Use border-radius only if supported
    block.styles?.borderRadius
      ? `border-radius: ${block.styles.borderRadius} !important`
      : "border-radius: 8px !important",
    // Outlook-specific fixes
    `mso-line-height-rule: exactly !important`,
    `-ms-interpolation-mode: bicubic !important`,
  ]
    .filter(Boolean)
    .join("; ")

  const containerStyles = [
    `width: 100% !important`,
    `height: 100% !important`,
    `display: block !important`,
    `margin: 0 !important`,
    `padding: 0 !important`,
    `line-height: 0 !important`, // Removes unwanted spacing in Gmail
    `font-size: 0 !important`, // Removes unwanted spacing in Outlook
    `text-align: center !important`, // Center images
    `overflow: visible !important`, // Allow proper scaling instead of cropping
  ].join("; ")

  const imageElement = `<img src="${block.content.src}" alt="${block.content?.alt || ""}" style="${emailSafeImageStyles}" width="${explicitWidth}" height="${explicitHeight}" />`

  // Wrap in link if href is provided
  const finalImageElement = block.content?.href
    ? `<a href="${block.content.href}" style="display: block !important; text-decoration: none !important; border: 0 !important; outline: none !important; width: ${explicitWidth}px !important; height: ${explicitHeight}px !important;">${imageElement}</a>`
    : imageElement

  return `<div style="${containerStyles}">${finalImageElement}</div>`
}

/**
 * Generate complete email-compatible HTML template
 */
export async function generateEmailCompatibleCampaignHTML(campaign: any): Promise<string> {
  if (!campaign.templateData) {
    return campaign.htmlContent || ""
  }

  try {
    const { transformNewsletterToEmailHTML } = require("./email-html-transformer")
    return await transformNewsletterToEmailHTML(campaign.templateData)
  } catch (error) {
    console.error("Error generating email compatible HTML:", error)
    return campaign.htmlContent || ""
  }
}

function transformNewsletterToEmailHTML(templateData: EmailTemplate): string {
  const positionedBlocks = templateData.blocks.filter((block: any) => block.position)
  const containerWidth = templateData.globalStyles.contentWidth || 600

  // Group blocks into rows for table-based layout with proper alignment
  const rows = groupBlocksIntoTableRowsWithAlignment(positionedBlocks, containerWidth)

  let html = `
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${templateData.subject}</title>
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
      font-family: ${templateData.globalStyles.fontFamily} !important; 
      background-color: #f5f5f5 !important; 
    }
    .email-container { 
      width: ${containerWidth}px !important; 
      max-width: ${containerWidth}px !important;
      margin: 0 auto !important; 
      background-color: ${templateData.globalStyles.backgroundColor} !important; 
      border-radius: 8px !important;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
    }
    
    /* Mobile responsive */
    @media only screen and (max-width: 600px) {
      .email-container { 
        width: 100% !important; 
        margin: 10px !important; 
      }
      .mobile-stack {
        display: block !important;
        width: 100% !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <table cellpadding="0" cellspacing="0" border="0" style="width: 100% !important; border-collapse: collapse !important;">
      <tbody>
`

  // Generate table rows with proper alignment
  rows.forEach((row, rowIndex) => {
    html += generateTableRowFromBlocksWithAlignment(row, templateData, containerWidth)

    // Add spacing between rows
    if (rowIndex < rows.length - 1) {
      html += `<tr><td colspan="10" style="height: 20px !important; font-size: 1px !important; line-height: 1px !important;">&nbsp;</td></tr>`
    }
  })

  html += `
      </tbody>
    </table>
    
    <div class="unsubscribe-footer" style="margin-top: 20px !important; padding: 20px !important; text-align: center !important; font-size: 12px !important; color: #666666 !important; border-top: 1px solid #e5e5e5 !important; font-family: ${templateData.globalStyles.fontFamily} !important;">
      <p style="margin: 0 0 8px 0;">© 2025 {{companyName}}. Tous droits réservés.</p>
      <p style="margin: 0;">
        <a href="{{unsubscribeLink}}" style="color: ${templateData.globalStyles.primaryColor || "#007bff"} !important; text-decoration: none !important;">Se désabonner</a> | 
        <a href="{{webVersionLink}}" style="color: ${templateData.globalStyles.primaryColor || "#007bff"} !important; text-decoration: none !important;">Voir dans le navigateur</a>
      </p>
    </div>
  </div>
</body>
</html>
`

  return html
}

// Group blocks into table rows with proper alignment support
function groupBlocksIntoTableRowsWithAlignment(blocks: any[], containerWidth: number): any[][] {
  if (blocks.length === 0) return []

  const sortedBlocks = [...blocks].sort((a, b) => a.position.y - b.position.y)
  const rows: any[][] = []
  const rowTolerance = 50

  sortedBlocks.forEach((block) => {
    let addedToRow = false

    for (const row of rows) {
      const rowMinY = Math.min(...row.map((b: any) => b.position.y))
      const rowMaxY = Math.max(...row.map((b: any) => b.position.y + b.position.height))

      const blockY = block.position.y
      const blockMaxY = block.position.y + block.position.height

      const verticalOverlap = !(blockMaxY < rowMinY - rowTolerance || blockY > rowMaxY + rowTolerance)

      if (verticalOverlap) {
        const hasHorizontalConflict = row.some((existingBlock: any) => {
          const existingX = existingBlock.position.x
          const existingMaxX = existingBlock.position.x + existingBlock.position.width
          const blockX = block.position.x
          const blockMaxX = block.position.x + block.position.width

          return !(blockMaxX < existingX - 15 || blockX > existingMaxX + 15)
        })

        if (!hasHorizontalConflict) {
          row.push(block)
          addedToRow = true
          break
        }
      }
    }

    if (!addedToRow) {
      rows.push([block])
    }
  })

  return rows
}

// Generate table row from blocks with proper alignment
function generateTableRowFromBlocksWithAlignment(row: any[], template: any, containerWidth: number): string {
  const sortedRowBlocks = [...row].sort((a, b) => a.position.x - b.position.x)

  let html = `<tr style="vertical-align: top !important;">`
  let currentX = 0

  sortedRowBlocks.forEach((block: any) => {
    const { x, width } = block.position

    // Add spacer if needed
    if (x > currentX + 10) {
      const spacerWidth = x - currentX
      const spacerWidthPercent = (spacerWidth / containerWidth) * 100
      html += `<td style="width: ${spacerWidthPercent.toFixed(1)}% !important; font-size: 1px !important; line-height: 1px !important;">&nbsp;</td>`
    }

    // Add content cell with proper alignment
    const cellWidthPercent = (width / containerWidth) * 100
    const blockContent = generateEmailCompatibleBlockHTMLWithAlignment(block, template)

    html += `<td style="width: ${cellWidthPercent.toFixed(1)}% !important; vertical-align: top !important; padding: 10px !important; text-align: ${getBlockTextAlign(block, template.globalStyles)} !important;" class="mobile-stack">
      ${blockContent}
    </td>`

    currentX = x + width
  })

  // Add right spacer if needed
  if (currentX < containerWidth - 10) {
    const rightSpacerPercent = ((containerWidth - currentX) / containerWidth) * 100
    html += `<td style="width: ${rightSpacerPercent.toFixed(1)}% !important; font-size: 1px !important; line-height: 1px !important;">&nbsp;</td>`
  }

  html += `</tr>`
  return html
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

// Generate email-compatible block HTML with proper alignment
function generateEmailCompatibleBlockHTMLWithAlignment(block: any, template: EmailTemplate): string {
  let textAlign,
    fontSize,
    fontFamily,
    color,
    bgColor,
    textColor,
    borderRadius,
    paddingY,
    paddingX,
    buttonText,
    buttonHref
  switch (block.type) {
    case "text":
      textAlign = block.styles?.textAlign || "left"
      fontSize = block.styles?.fontSize || "16px"
      color = block.styles?.color || "#000000"
      fontFamily = template.globalStyles.fontFamily || "Arial, sans-serif"

      const textContent = block.content?.html || block.content?.text || ""
      if (!textContent) {
        console.log("[DEBUG] Warning: Empty text content in block:", block)
        return `<div style="width: 100% !important; height: 100% !important;"></div>`
      }

      return `<div style="width: 100% !important; height: 100% !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; color: ${color} !important; line-height: 1.4 !important; -webkit-text-size-adjust: 100% !important; -ms-text-size-adjust: 100% !important; text-align: ${textAlign} !important;">${textContent}</div>`

    case "header":
      const headerContent = block.content?.text || "Titre"
      const headerAlign = block.styles?.textAlign || "center"
      const headerColor = block.styles?.color || template.globalStyles.primaryColor || "#1F2937"

      return `<div style="width: 100% !important; height: 100% !important; font-family: ${template.globalStyles.fontFamily || "Arial, sans-serif"} !important; font-size: 28px !important; font-weight: bold !important; color: ${headerColor} !important; line-height: 1.2 !important; word-wrap: break-word !important; text-align: ${headerAlign} !important;">${headerContent}</div>`

    case "image":
      return generateEmailCompatibleImageHTML(block, template)

    case "button":
      buttonHref = block.content?.href || "#"
      bgColor = block.styles?.backgroundColor || template.globalStyles.primaryColor || "#007bff"
      textColor = "#ffffff" // Always use white text for buttons
      borderRadius = block.styles?.borderRadius || "8px"
      paddingY = block.styles?.paddingY || 16
      paddingX = block.styles?.paddingX || 32
      fontSize = block.styles?.fontSize || "16px"
      fontFamily = template.globalStyles.fontFamily || "Arial, sans-serif"
      textAlign = block.styles?.textAlign || "center"
      buttonText = block.content?.text || "Button"

      return `<div style="width: 100% !important; height: 100% !important; text-align: ${textAlign} !important;">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonHref}" style="height:${paddingY * 2 + 20}px;v-text-anchor:middle;width:auto;" arcsize="${Math.min(50, Number.parseInt(borderRadius))}%" fillcolor="${bgColor}">
<w:anchorlock/>
<center style="color:${textColor};font-family:${fontFamily};font-size:${fontSize};font-weight:600;">${buttonText}</center>
</v:roundrect>
<![endif]-->
<table cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse !important; mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important;">
  <tr>
    <td style="background-color: ${bgColor} !important; border: 1px solid ${bgColor} !important; border-radius: ${borderRadius} !important; padding: ${paddingY}px ${paddingX}px !important; text-align: ${textAlign} !important;">
      <a href="${buttonHref}" style="color: ${textColor} !important; font-family: ${fontFamily} !important; font-size: ${fontSize} !important; font-weight: 600 !important; line-height: 1.4 !important; text-decoration: none !important; display: inline-block !important; -webkit-text-size-adjust: none !important;">${buttonText}</a>
    </td>
  </tr>
</table>
</div>`

    case "divider":
      const dividerColor = block.styles?.color || "#E5E7EB"
      const thickness = block.styles?.thickness || "1px"

      return `<div style="width: 100% !important; height: 100% !important; text-align: center !important;"><hr style="border: none !important; border-top: ${thickness} solid ${dividerColor} !important; width: 80% !important; margin: 0 !important;" /></div>`

    default:
      return `<div style="width: 100% !important; height: 100% !important;"></div>`
  }
}
