import * as LucideIcons from "lucide-react"
import * as FaIcons from "react-icons/fa"
import * as Fa6Icons from "react-icons/fa6"
import * as FiIcons from "react-icons/fi"
import * as AiIcons from "react-icons/ai"
import * as MdIcons from "react-icons/md"
import * as BsIcons from "react-icons/bs"
import * as BiIcons from "react-icons/bi"
import * as IoIcons from "react-icons/io5"
import * as Io4Icons from "react-icons/io"
import * as PiIcons from "react-icons/pi"
import * as RiIcons from "react-icons/ri"
import * as TbIcons from "react-icons/tb"
import React from "react"

/**
 * Récupère un composant d'icône depuis Lucide ou React Icons
 * @param iconName - Le nom de l'icône à récupérer
 * @returns Le composant d'icône ou Home par défaut si non trouvé
 */
export function getIconComponent(iconName: string) {
  if (!iconName) return LucideIcons.Home

  // Essayer Lucide d'abord
  const LucideComponent = (LucideIcons as any)[iconName]
  if (LucideComponent) return LucideComponent

  // Essayer les packs React Icons
  const packs = [
    FaIcons,
    Fa6Icons,
    FiIcons,
    AiIcons,
    MdIcons,
    BsIcons,
    BiIcons,
    Io4Icons,
    IoIcons,
    PiIcons,
    RiIcons,
    TbIcons,
  ]

  for (const pack of packs) {
    const Comp = (pack as any)[iconName]
    if (Comp) return Comp
  }

  // Icône par défaut si non trouvée
  console.warn(`Icône "${iconName}" non trouvée, utilisation de Home par défaut`)
  return LucideIcons.Home
}

/**
 * Crée un élément React pour une icône avec des props par défaut
 * @param iconName - Le nom de l'icône
 * @param props - Props supplémentaires à passer au composant d'icône
 * @returns Un élément React de l'icône
 */
export function createIconElement(
  iconName: string,
  props: React.ComponentProps<"svg"> = {}
) {
  const IconComponent = getIconComponent(iconName)
  return React.createElement(IconComponent, {
    size: 19,
    stroke: "white",
    strokeWidth: 1.45833,
    fill: "none",
    ...props,
  })
}



