import { render } from '@react-email/render'
import { NewsletterEmailTemplate } from './react-email-templates'

/**
 * Render a newsletter template to email-compatible HTML
 * This eliminates the style transformation pipeline issues by directly generating HTML
 */
export async function renderNewsletterToEmailHTML(templateData: any): Promise<string> {
  try {
    console.log("[React Email Renderer] Rendering newsletter template with", templateData.blocks?.length || 0, "blocks")
    
    // Validate template data
    if (!templateData?.blocks || !Array.isArray(templateData.blocks)) {
      console.warn("[React Email Renderer] Invalid template data, returning fallback")
      return "<div>No content available</div>"
    }

    // Filter out blocks without valid positions
    const validBlocks = templateData.blocks.filter((block: any) => {
      if (!block.position) {
        console.warn("[React Email Renderer] Block missing position:", block.id, block.type)
        return false
      }
      
      // Validate block dimensions
      const { width, height } = block.position
      if (width < 150 || height < 60 || width > 500 || height > 400) {
        console.warn("[React Email Renderer] Block dimensions out of email-safe range:", {
          id: block.id,
          type: block.type,
          width,
          height
        })
        return false
      }
      
      return true
    })

    console.log("[React Email Renderer] Valid blocks for rendering:", validBlocks.length)

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

    console.log("[React Email Renderer] Enhanced template data:", {
      subject: enhancedTemplateData.subject,
      containerWidth: enhancedTemplateData.globalStyles.contentWidth,
      backgroundColor: enhancedTemplateData.globalStyles.backgroundColor,
      blocksCount: enhancedTemplateData.blocks.length
    })

    // Render the React Email template to HTML
    const emailHTML = await render(
      NewsletterEmailTemplate({ templateData: enhancedTemplateData })
    )

    console.log("[React Email Renderer] Generated HTML length:", emailHTML.length)
    console.log("[React Email Renderer] HTML contains email structure:", emailHTML.includes("<!DOCTYPE html>"))

    // Add tracking pixel for email opens
    const htmlWithTracking = emailHTML.replace(
      '</body>',
      '    <!-- Gmail-compatible tracking pixel for email opens -->\n    <img src="{{trackingPixelUrl}}" width="1" height="1" style="display: none !important; max-height: 1px !important; max-width: 1px !important; opacity: 0.01;" alt="" />\n  </body>'
    )

    return htmlWithTracking

  } catch (error) {
    console.error("[React Email Renderer] Error rendering template:", error)
    
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
 * Generate text-only version of the newsletter for email clients that don't support HTML
 */
export function generateTextContent(templateData: any): string {
  if (!templateData?.blocks || !Array.isArray(templateData.blocks)) {
    return "Newsletter content not available"
  }

  // Sort blocks by Y position
  const sortedBlocks = [...templateData.blocks].sort((a, b) => {
    const aY = a.position?.y || 0
    const bY = b.position?.y || 0
    return aY - bY
  })

  return sortedBlocks
    .map((block) => {
      switch (block.type) {
        case "header":
          return block.content?.text || "Titre"
        case "text":
          // Strip HTML tags for text version
          return (block.content?.html || block.content?.text || "Texte")
            .replace(/<[^>]*>/g, "")
            .replace(/&nbsp;/g, " ")
            .trim()
        case "button":
          return `${block.content?.text || "Bouton"}: ${block.content?.href || "#"}`
        case "image":
          return block.content?.alt || "Image"
        case "divider":
          return "---"
        default:
          return ""
      }
    })
    .filter(Boolean)
    .join("\n\n")
} 