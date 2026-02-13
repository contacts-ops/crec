import React from "react"
import { getIconComponent } from "@/lib/utils/icon-loader"

interface IconProps extends React.ComponentProps<"svg"> {
  name: string
  size?: number | string
  stroke?: string
  strokeWidth?: number | string
  fill?: string
  className?: string
}

/**
 * Composant wrapper pour afficher des icônes depuis Lucide ou React Icons
 * @example
 * <Icon name="Camera" size={24} stroke="white" />
 */
export function Icon({
  name,
  size = 24,
  stroke = "currentColor",
  strokeWidth = 2,
  fill = "none",
  className = "",
  ...props
}: IconProps) {
  const IconComponent = getIconComponent(name)

  return React.createElement(IconComponent, {
    size,
    stroke,
    strokeWidth,
    fill,
    className,
    ...props,
  })
}



