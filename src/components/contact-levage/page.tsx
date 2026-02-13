"use client";

import { useEffect } from "react";
import React, { useState, useRef } from "react";
import { useSiteLink } from "@/hooks/use-site-link";
import * as LucideIcons from 'lucide-react';
import * as FaIcons from 'react-icons/fa';
import * as Fa6Icons from 'react-icons/fa6';
import * as FiIcons from 'react-icons/fi';
import * as AiIcons from 'react-icons/ai';
import * as MdIcons from 'react-icons/md';
import * as BsIcons from 'react-icons/bs';
import * as BiIcons from 'react-icons/bi';
import * as IoIcons from 'react-icons/io5';
import * as RiIcons from 'react-icons/ri';
import * as TbIcons from 'react-icons/tb';

// Fonction pour créer une icône dynamiquement (taille configurable)
const createIcon = (iconType: string, textColor: string, size: number = 48) => {
  const LucideComponent = (LucideIcons as any)[iconType];
  const reactIconPacks = [
    FaIcons,
    Fa6Icons,
    FiIcons,
    AiIcons,
    MdIcons,
    BsIcons,
    BiIcons,
    IoIcons,
    RiIcons,
    TbIcons,
  ];
  const ReactIconComponent = reactIconPacks.reduce<any>((found, pack) => {
    return found || (pack as any)[iconType];
  }, null);
  const IconComponent = LucideComponent || ReactIconComponent;
  if (IconComponent) {
    return React.createElement(IconComponent, {
      size,
      style: { color: textColor }
    });
  }
  // Fallback si l'icône n'existe pas
  return React.createElement(LucideIcons.Home, {
    size,
    style: { color: textColor }
  });
};

interface ContactLevageProps {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  backgroundColor: string;
  fontFamily?: string;
  secondaryFontFamily?: string;

  title: string;
  submitButtonText: string;
  nameLabel: string;
  phoneLabel: string;
  emailLabel: string;
  messageLabel: string;

  phone: string;
  email: string;
  addressLine1: string;
  addressLine2: string;

  // Icon types for contact cards
  contact1IconType?: string;
  contact2IconType?: string;
  contact3IconType?: string;
  iconColor?: string;
  // Map configuration
  mapUrl?: string;
  mapTitle?: string;
  // Fallback values
  fallbackIcon1?: string;
  fallbackIcon2?: string;
  fallbackIcon3?: string;
  placeholderImage?: string;
}

const GoogleFontLoader = ({ fontName }: { fontName?: string }) => {
  useEffect(() => {
    if (!fontName) return;
    const family = fontName.trim().replace(/\s+/g, "+");
    const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [fontName]);
  return null;
};

const isVideoFile = (url?: string) =>
  !!url && [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv", ".gif"].some((ext) => url.toLowerCase().includes(ext));
// Country dial codes (wide coverage)
const countryDialCodes: { code: string; name: string }[] = [
  { code: "+93", name: "Afghanistan" }, { code: "+355", name: "Albanie" }, { code: "+213", name: "Algérie" },
  { code: "+376", name: "Andorre" }, { code: "+244", name: "Angola" },
  { code: "+54", name: "Argentine" }, { code: "+374", name: "Arménie" }, { code: "+297", name: "Aruba" },
  { code: "+61", name: "Australie" }, { code: "+43", name: "Autriche" }, { code: "+994", name: "Azerbaïdjan" },
  { code: "+973", name: "Bahreïn" }, { code: "+880", name: "Bangladesh" }, { code: "+375", name: "Biélorussie" },
  { code: "+32", name: "Belgique" }, { code: "+501", name: "Belize" }, { code: "+229", name: "Bénin" },
  { code: "+975", name: "Bhoutan" }, { code: "+591", name: "Bolivie" }, { code: "+387", name: "Bosnie-Herzégovine" },
  { code: "+267", name: "Botswana" }, { code: "+55", name: "Brésil" }, { code: "+359", name: "Bulgarie" },
  { code: "+226", name: "Burkina Faso" }, { code: "+257", name: "Burundi" }, { code: "+855", name: "Cambodge" },
  { code: "+237", name: "Cameroun" }, { code: "+1", name: "Canada" }, { code: "+238", name: "Cap-Vert" },
  { code: "+236", name: "Centrafrique" }, { code: "+235", name: "Tchad" }, { code: "+56", name: "Chili" },
  { code: "+86", name: "Chine" }, { code: "+57", name: "Colombie" }, { code: "+269", name: "Comores" },
  { code: "+242", name: "Congo (Brazzaville)" }, { code: "+243", name: "RDC" }, { code: "+506", name: "Costa Rica" },
  { code: "+225", name: "Côte d'Ivoire" }, { code: "+385", name: "Croatie" }, { code: "+53", name: "Cuba" },
  { code: "+357", name: "Chypre" }, { code: "+420", name: "Tchéquie" }, { code: "+45", name: "Danemark" },
  { code: "+253", name: "Djibouti" }, { code: "+1", name: "Dominique" }, { code: "+1", name: "République dominicaine" },
  { code: "+593", name: "Équateur" }, { code: "+20", name: "Égypte" }, { code: "+503", name: "Salvador" },
  { code: "+240", name: "Guinée équatoriale" }, { code: "+291", name: "Érythrée" }, { code: "+372", name: "Estonie" },
  { code: "+251", name: "Éthiopie" }, { code: "+679", name: "Fidji" }, { code: "+358", name: "Finlande" },
  { code: "+33", name: "France" }, { code: "+594", name: "Guyane française" }, { code: "+241", name: "Gabon" },
  { code: "+220", name: "Gambie" }, { code: "+995", name: "Géorgie" }, { code: "+49", name: "Allemagne" },
  { code: "+233", name: "Ghana" }, { code: "+350", name: "Gibraltar" }, { code: "+30", name: "Grèce" },
  { code: "+299", name: "Groenland" }, { code: "+502", name: "Guatemala" }, { code: "+224", name: "Guinée" },
  { code: "+245", name: "Guinée-Bissau" }, { code: "+592", name: "Guyana" }, { code: "+509", name: "Haïti" },
  { code: "+504", name: "Honduras" }, { code: "+852", name: "Hong Kong" }, { code: "+36", name: "Hongrie" },
  { code: "+354", name: "Islande" }, { code: "+91", name: "Inde" }, { code: "+62", name: "Indonésie" },
  { code: "+98", name: "Iran" }, { code: "+964", name: "Irak" }, { code: "+353", name: "Irlande" },
  { code: "+972", name: "Israël" }, { code: "+39", name: "Italie" }, { code: "+81", name: "Japon" },
  { code: "+962", name: "Jordanie" }, { code: "+7", name: "Kazakhstan" }, { code: "+254", name: "Kenya" },
  { code: "+383", name: "Kosovo" }, { code: "+965", name: "Koweït" }, { code: "+996", name: "Kirghizistan" },
  { code: "+856", name: "Laos" }, { code: "+371", name: "Lettonie" }, { code: "+961", name: "Liban" },
  { code: "+266", name: "Lesotho" }, { code: "+231", name: "Libéria" }, { code: "+218", name: "Libye" },
  { code: "+423", name: "Liechtenstein" }, { code: "+370", name: "Lituanie" }, { code: "+352", name: "Luxembourg" },
  { code: "+853", name: "Macao" }, { code: "+389", name: "Macédoine du Nord" }, { code: "+261", name: "Madagascar" },
  { code: "+265", name: "Malawi" }, { code: "+60", name: "Malaisie" }, { code: "+960", name: "Maldives" },
  { code: "+223", name: "Mali" }, { code: "+356", name: "Malte" }, { code: "+692", name: "Îles Marshall" },
  { code: "+596", name: "Martinique" }, { code: "+222", name: "Mauritanie" }, { code: "+230", name: "Maurice" },
  { code: "+262", name: "La Réunion / Mayotte" }, { code: "+52", name: "Mexique" }, { code: "+691", name: "Micronésie" },
  { code: "+373", name: "Moldavie" }, { code: "+377", name: "Monaco" }, { code: "+976", name: "Mongolie" },
  { code: "+382", name: "Monténégro" }, { code: "+212", name: "Maroc" }, { code: "+258", name: "Mozambique" },
  { code: "+95", name: "Myanmar" }, { code: "+264", name: "Namibie" }, { code: "+977", name: "Népal" },
  { code: "+31", name: "Pays-Bas" }, { code: "+687", name: "Nouvelle-Calédonie" }, { code: "+64", name: "Nouvelle-Zélande" },
  { code: "+505", name: "Nicaragua" }, { code: "+227", name: "Niger" }, { code: "+234", name: "Nigeria" },
  { code: "+47", name: "Norvège" }, { code: "+968", name: "Oman" }, { code: "+92", name: "Pakistan" },
  { code: "+970", name: "Palestine" }, { code: "+507", name: "Panama" }, { code: "+675", name: "Papouasie-Nouvelle-Guinée" },
  { code: "+595", name: "Paraguay" }, { code: "+51", name: "Pérou" }, { code: "+63", name: "Philippines" },
  { code: "+48", name: "Pologne" }, { code: "+351", name: "Portugal" }, { code: "+974", name: "Qatar" },
  { code: "+40", name: "Roumanie" }, { code: "+7", name: "Russie" }, { code: "+250", name: "Rwanda" },
  { code: "+685", name: "Samoa" }, { code: "+378", name: "Saint-Marin" }, { code: "+239", name: "Sao Tomé-et-Principe" },
  { code: "+966", name: "Arabie saoudite" }, { code: "+221", name: "Sénégal" }, { code: "+381", name: "Serbie" },
  { code: "+248", name: "Seychelles" }, { code: "+232", name: "Sierra Leone" }, { code: "+65", name: "Singapour" },
  { code: "+421", name: "Slovaquie" }, { code: "+386", name: "Slovénie" }, { code: "+677", name: "Îles Salomon" },
  { code: "+252", name: "Somalie" }, { code: "+27", name: "Afrique du Sud" }, { code: "+82", name: "Corée du Sud" },
  { code: "+211", name: "Soudan du Sud" }, { code: "+34", name: "Espagne" }, { code: "+94", name: "Sri Lanka" },
  { code: "+249", name: "Soudan" }, { code: "+597", name: "Suriname" }, { code: "+46", name: "Suède" },
  { code: "+41", name: "Suisse" }, { code: "+963", name: "Syrie" }, { code: "+886", name: "Taïwan" },
  { code: "+992", name: "Tadjikistan" }, { code: "+255", name: "Tanzanie" }, { code: "+66", name: "Thaïlande" },
  { code: "+228", name: "Togo" }, { code: "+676", name: "Tonga" }, { code: "+216", name: "Tunisie" },
  { code: "+90", name: "Turquie" }, { code: "+993", name: "Turkménistan" }, { code: "+688", name: "Tuvalu" },
  { code: "+256", name: "Ouganda" }, { code: "+380", name: "Ukraine" }, { code: "+971", name: "EAU" },
  { code: "+44", name: "Royaume-Uni" }, { code: "+1", name: "États-Unis" }, { code: "+598", name: "Uruguay" },
  { code: "+998", name: "Ouzbékistan" }, { code: "+678", name: "Vanuatu" }, { code: "+39", name: "Vatican" },
  { code: "+58", name: "Venezuela" }, { code: "+84", name: "Viêt Nam" }, { code: "+681", name: "Wallis-et-Futuna" },
  { code: "+967", name: "Yémen" }, { code: "+260", name: "Zambie" }, { code: "+263", name: "Zimbabwe" }
];

// Minimal country name -> ISO2 mapping to fetch real flag icons
const nameToIso: Record<string, string> = {
  "Afghanistan":"AF","Albanie":"AL","Algérie":"DZ","Andorre":"AD","Angola":"AO","Antigua-et-Barbuda":"AG",
  "Argentine":"AR","Arménie":"AM","Aruba":"AW","Australie":"AU","Autriche":"AT","Azerbaïdjan":"AZ",
  "Bahreïn":"BH","Bangladesh":"BD","Biélorussie":"BY","Belgique":"BE","Belize":"BZ","Bénin":"BJ",
  "Bhoutan":"BT","Bolivie":"BO","Bosnie-Herzégovine":"BA","Botswana":"BW","Brésil":"BR","Bulgarie":"BG",
  "Burkina Faso":"BF","Burundi":"BI","Cambodge":"KH","Cameroun":"CM","Canada":"CA","Cap-Vert":"CV",
  "Centrafrique":"CF","Tchad":"TD","Chili":"CL","Chine":"CN","Colombie":"CO","Comores":"KM",
  "Congo (Brazzaville)":"CG","RDC":"CD","Costa Rica":"CR","Côte d'Ivoire":"CI","Croatie":"HR","Cuba":"CU",
  "Chypre":"CY","Tchéquie":"CZ","Danemark":"DK","Djibouti":"DJ","Dominique":"DM","République dominicaine":"DO",
  "Équateur":"EC","Égypte":"EG","Salvador":"SV","Guinée équatoriale":"GQ","Érythrée":"ER","Estonie":"EE",
  "Éthiopie":"ET","Fidji":"FJ","Finlande":"FI","France":"FR","Guyane française":"GF","Gabon":"GA",
  "Gambie":"GM","Géorgie":"GE","Allemagne":"DE","Ghana":"GH","Gibraltar":"GI","Grèce":"GR","Groenland":"GL",
  "Guatemala":"GT","Guinée":"GN","Guinée-Bissau":"GW","Guyana":"GY","Haïti":"HT","Honduras":"HN",
  "Hong Kong":"HK","Hongrie":"HU","Islande":"IS","Inde":"IN","Indonésie":"ID","Iran":"IR","Irak":"IQ",
  "Irlande":"IE","Israël":"IL","Italie":"IT","Japon":"JP","Jordanie":"JO","Kazakhstan":"KZ","Kenya":"KE",
  "Kosovo":"XK","Koweït":"KW","Kirghizistan":"KG","Laos":"LA","Lettonie":"LV","Liban":"LB","Lesotho":"LS",
  "Libéria":"LR","Libye":"LY","Liechtenstein":"LI","Lituanie":"LT","Luxembourg":"LU","Macao":"MO",
  "Macédoine du Nord":"MK","Madagascar":"MG","Malawi":"MW","Malaisie":"MY","Maldives":"MV","Mali":"ML",
  "Malte":"MT","Îles Marshall":"MH","Martinique":"MQ","Mauritanie":"MR","Maurice":"MU","La Réunion / Mayotte":"RE",
  "Mexique":"MX","Micronésie":"FM","Moldavie":"MD","Monaco":"MC","Mongolie":"MN","Monténégro":"ME",
  "Maroc":"MA","Mozambique":"MZ","Myanmar":"MM","Namibie":"NA","Népal":"NP","Pays-Bas":"NL",
  "Nouvelle-Calédonie":"NC","Nouvelle-Zélande":"NZ","Nicaragua":"NI","Niger":"NE","Nigeria":"NG","Norvège":"NO",
  "Oman":"OM","Pakistan":"PK","Palestine":"PS","Panama":"PA","Papouasie-Nouvelle-Guinée":"PG","Paraguay":"PY",
  "Pérou":"PE","Philippines":"PH","Pologne":"PL","Portugal":"PT","Qatar":"QA","Roumanie":"RO","Russie":"RU",
  "Rwanda":"RW","Samoa":"WS","Saint-Marin":"SM","Sao Tomé-et-Principe":"ST","Arabie saoudite":"SA","Sénégal":"SN",
  "Serbie":"RS","Seychelles":"SC","Sierra Leone":"SL","Singapour":"SG","Slovaquie":"SK","Slovénie":"SI",
  "Îles Salomon":"SB","Somalie":"SO","Afrique du Sud":"ZA","Corée du Sud":"KR","Soudan du Sud":"SS","Espagne":"ES",
  "Sri Lanka":"LK","Soudan":"SD","Suriname":"SR","Suède":"SE","Suisse":"CH","Syrie":"SY","Taïwan":"TW",
  "Tadjikistan":"TJ","Tanzanie":"TZ","Thaïlande":"TH","Togo":"TG","Tonga":"TO","Tunisie":"TN","Turquie":"TR",
  "Turkménistan":"TM","Tuvalu":"TV","Ouganda":"UG","Ukraine":"UA","EAU":"AE","Royaume-Uni":"GB","États-Unis":"US",
  "Uruguay":"UY","Ouzbékistan":"UZ","Vanuatu":"VU","Vatican":"VA","Venezuela":"VE","Viêt Nam":"VN",
  "Wallis-et-Futuna":"WF","Yémen":"YE","Zambie":"ZM","Zimbabwe":"ZW"
};

const isoToFlagImg = (iso?: string) => iso ? `https://flagcdn.com/24x18/${iso.toLowerCase()}.png` : "";

export default function ContactLevage(props: ContactLevageProps) {
  const { transformLink, siteId } = useSiteLink();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    message: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Le nom doit contenir au moins 2 caractères";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Le téléphone est requis";
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone.trim())) {
      newErrors.phone = "Format de téléphone invalide";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Format d'email invalide";
    }

    // Message validation
    if (!formData.message.trim()) {
      newErrors.message = "Le message est requis";
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Le message doit contenir au moins 10 caractères";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      // Envoi réel au backend (comme form-coach)
      const trimmedName = formData.name.trim();
      const nameParts = trimmedName.split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const trimmedPhone = formData.phone.trim();
      const payload = {
        // Compat: différentes clés supportées côté backend/templates
        name: trimmedName,
        fullName: trimmedName,
        firstName,
        lastName,
        prenom: firstName,
        nom: lastName,
        email: formData.email.trim(),
        phone: trimmedPhone,
        telephone: trimmedPhone,
        message: formData.message.trim(),
        source: "contact-levage",
        siteId: siteId || undefined,
      } as any;

      const urlWithQuery = siteId
        ? `/api/sharedServices/contact-send?siteId=${encodeURIComponent(siteId)}`
        : `/api/sharedServices/contact-send`;

      const res = await fetch(urlWithQuery, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(siteId ? { "x-site-id": siteId } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let errorMessage = `Erreur ${res.status}: ${res.statusText || "Erreur serveur"}`;
        try {
          const err = await res.json();
          console.error("API Error Response:", err);
          errorMessage = err?.error || errorMessage;
          // Ajouter les détails si disponibles
          if (err?.details) {
            const detailsStr = Array.isArray(err.details)
              ? err.details.map((d: any) => d.message || d.field || JSON.stringify(d)).join(", ")
              : typeof err.details === "string"
              ? err.details
              : JSON.stringify(err.details);
            if (detailsStr) {
              errorMessage += ` (${detailsStr})`;
            }
          }
        } catch (parseError) {
          // Impossible de parser la réponse JSON - on garde le message avec le status
          console.error("Failed to parse error response:", parseError);
        }
        throw new Error(errorMessage);
      }

      // Inscription silencieuse à la newsletter (non bloquante)
      try {
        await fetch("/api/services/newsletter/subscribe" + (siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(siteId ? { "x-site-id": siteId } : {}),
          },
          body: JSON.stringify({
            email: formData.email.trim(),
            fullName: formData.name.trim(),
            source: "website",
            siteId: siteId || undefined,
          }),
        });
      } catch {}

      // Reset form on success
      setFormData({ name: "", phone: "", email: "", message: "" });
      setErrors({});
      setStatusMessage({ type: "success", text: "Message envoyé avec succès !" });
    } catch (error) {
      console.error("Error submitting form:", error);
      const errorText = error instanceof Error && error.message 
        ? error.message 
        : "Erreur lors de l'envoi du message. Veuillez réessayer.";
      setStatusMessage({ type: "error", text: errorText });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Masquer automatiquement le message après 5 secondes
  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => setStatusMessage(null), 5000);
    return () => clearTimeout(t);
  }, [statusMessage]);
  const {
    primaryColor,
    secondaryColor,
    textColor,
    backgroundColor,
    fontFamily,
    secondaryFontFamily,
    title,
    submitButtonText,
    nameLabel,
    phoneLabel,
    emailLabel,
    messageLabel,
    phone,
    email,
    addressLine1,
    addressLine2,
    contact1IconType,
    contact2IconType,
    contact3IconType,
    iconColor,
    mapUrl,
    mapTitle,
    fallbackIcon1,
    fallbackIcon2,
    fallbackIcon3,
  } = props;


  const addressQuery = `${(addressLine1 || "").trim()} ${(addressLine2 || "").trim()}`.trim();
  return (
    <section className="w-full" style={{ backgroundColor }} data-name="Contact Levage">
      {/* Fonts */}
      <GoogleFontLoader fontName={fontFamily} />
      <GoogleFontLoader fontName={secondaryFontFamily} />

      {/* Hidden props for CMS */}
      <div style={{ display: "none" }} data-editable="true" data-id="-primaryColor" data-label="Couleur principale">{primaryColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-secondaryColor" data-label="Couleur secondaire">{secondaryColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-textColor" data-label="Couleur du texte">{textColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-backgroundColor" data-label="Couleur de fond">{backgroundColor}</div>
      <div style={{ display: "none" }} data-editable="true" data-type="font" data-id="-fontFamily" data-label="Police principale">{fontFamily}</div>
      <div style={{ display: "none" }} data-editable="true" data-type="font" data-id="-secondaryFontFamily" data-label="Police secondaire">{secondaryFontFamily}</div>
      
      {/* Icon types for contact cards */}
      <div style={{ display: "none" }} data-editable="true" data-id="-contact1IconType" data-label="Type d'icône Email" data-type="icon">{contact1IconType}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-contact2IconType" data-label="Type d'icône Téléphone" data-type="icon">{contact2IconType}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-contact3IconType" data-label="Type d'icône Adresse" data-type="icon">{contact3IconType}</div>
      <div style={{ display: "none" }} data-editable="true" data-id="-iconColor" data-label="Couleur des icônes">{iconColor}</div>

      <div className="max-w-[1330px] mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14">
        <h2
          className="text-[28px] md:text-[28px] lg:text-[32px] leading-none mb-10 font-semibold"
          style={{ color: secondaryColor, fontFamily }}
          data-editable="true"
          data-id="-title"
          data-label="Titre"
        >
          {title}
        </h2> 

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start">
          {/* Left: form */}
          <div>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm mb-2" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }}>{nameLabel}</label>
                  <input
                    type="text"
                    placeholder="Nom"
                    className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 drop-shadow-md ${
                      errors.name ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                    }`}
                    style={{ fontFamily: secondaryFontFamily, color: secondaryColor, boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600" style={{ fontFamily: secondaryFontFamily }}>
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-2" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }}>{phoneLabel}</label>
                  <div className="flex items-stretch gap-2">
                    {/* Custom phone code dropdown with real flag icons */}
                    {(() => {
                      const allCodes = Array.from(new Set(countryDialCodes.map((c) => c.code)));
                      const defaultCode = "+33";
                      const [open, setOpen] = useState(false);
                      const [value, setValue] = useState<string>(defaultCode);
                      const ref = useRef<HTMLDivElement>(null);
                      useEffect(() => {
                        const onClick = (e: MouseEvent) => {
                          if (!ref.current) return;
                          if (!ref.current.contains(e.target as Node)) setOpen(false);
                        };
                        document.addEventListener("mousedown", onClick);
                        return () => document.removeEventListener("mousedown", onClick);
                      }, []);
                      const current = countryDialCodes.find((c) => c.code === value);
                      const iso = nameToIso[current?.name || ""];
                      return (
                        <div ref={ref} className="relative flex">
                          <button type="button" onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 h-full text-sm drop-shadow-md" style={{ fontFamily: secondaryFontFamily, color: secondaryColor, backgroundColor: 'white', boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}>
                            {iso && <img src={isoToFlagImg(iso)} alt="" className="h-[2vh] w-[16px]" />}
                            <span>{value}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 9l6 6 6-6" strokeWidth="2"/></svg>
                          </button>
                          {open && (
                            <div className="absolute z-20 mt-2 max-h-60 w-44 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
                              {countryDialCodes.map(({ code, name }) => {
                                const iso2 = nameToIso[name];
                                return (
                                  <button key={`${code}-${name}`} type="button" className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-gray-100" style={{ color: secondaryColor }} onClick={() => { setValue(code); setOpen(false); }}>
                                    {iso2 && <img src={isoToFlagImg(iso2)} alt="" className="h-[12px] w-[16px]" />}
                                    <span>{code}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* Hidden input to preserve value for forms if needed */}
                          <input type="hidden" name="phoneCode" value={value} />
                        </div>
                      );
                    })()}
                    <input
                      type="tel"
                      placeholder="Téléphone"
                      className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 drop-shadow-md ${
                        errors.phone ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                      }`}
                      style={{ fontFamily: secondaryFontFamily, color: secondaryColor, boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600" style={{ fontFamily: secondaryFontFamily }}>
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }}>{emailLabel}</label>
                <input
                  type="email"
                  placeholder="E-mail"
                  className={`w-full rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 drop-shadow-md ${
                    errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                  }`}
                  style={{ fontFamily: secondaryFontFamily, color: secondaryColor, boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600" style={{ fontFamily: secondaryFontFamily }}>
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }}>{messageLabel}</label>
                <textarea
                  placeholder="Message"
                  className={`w-full min-h-[160px] rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 drop-shadow-md ${
                    errors.message ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-blue-500"
                  }`}
                  style={{ fontFamily: secondaryFontFamily, color: secondaryColor, boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                />
                {errors.message && (
                  <p className="mt-1 text-sm text-red-600" style={{ fontFamily: secondaryFontFamily }}>
                    {errors.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className={`inline-flex items-center justify-center rounded-full px-6 py-3 font-semibold transition-transform duration-200 ease-out hover:scale-[1.03] md:hover:scale-105 will-change-transform ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                style={{ backgroundColor: primaryColor, color: textColor, fontFamily: secondaryFontFamily, boxShadow: "0 1px 2px rgba(16,24,40,0.05)" }}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Envoi en cours..." : submitButtonText}
              </button>
              {statusMessage && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm font-medium ${
                    statusMessage.type === "success"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                  role="status"
                  aria-live="polite"
                >
                  {statusMessage.text}
                </div>
              )}
            </form>
          </div>

          {/* Right: info cards + map */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              <a 
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl p-4 md:p-5 lg:p-4 shadow-[0_10px_24px_rgba(0,0,0,0.15)] max-w-[220px] sm:max-w-none mx-auto w-full hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-200 cursor-pointer h-full flex flex-col items-center justify-center text-center min-h-[140px]"
              >
                <div className="mx-auto mb-2 h-8 w-8 lg:h-7 lg:w-7 rounded-full overflow-hidden flex items-center justify-center drop-shadow-md">
                  {createIcon(contact1IconType || fallbackIcon1 || "Mail", iconColor || primaryColor, 24)}
                </div>
                <p className="text-center text-sm" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }} data-editable="true" data-id="-email" data-label="Email">
                  {email}
                </p>
              </a>
              <a 
                href={`tel:${phone.replace(/[^\d+]/g, '')}`}
                className="rounded-xl p-4 md:p-5 lg:p-4 shadow-[0_10px_24px_rgba(0,0,0,0.15)] max-w-[220px] sm:max-w-none mx-auto w-full hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-200 cursor-pointer h-full flex flex-col items-center justify-center text-center min-h-[140px]"
              >
                <div className="mx-auto mb-2 h-8 w-8 lg:h-7 lg:w-7 rounded-full overflow-hidden flex items-center justify-center drop-shadow-md">
                  {createIcon(contact2IconType || fallbackIcon2 || "Phone", iconColor || primaryColor, 24)}
                </div>
                <p className="text-center text-sm" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }} data-editable="true" data-id="-phone" data-label="Téléphone">
                  {phone}
                </p>
              </a>
              <a 
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl p-4 md:p-5 lg:p-4 shadow-[0_10px_24px_rgba(0,0,0,0.15)] max-w-[220px] sm:max-w-none mx-auto w-full hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-200 cursor-pointer h-full flex flex-col items-center justify-center text-center min-h-[140px]"
              >
                <div className="mx-auto mb-2 h-8 w-8 lg:h-7 lg:w-7 rounded-full overflow-hidden flex items-center justify-center drop-shadow-md">
                  {createIcon(contact3IconType || fallbackIcon3 || "MapPin", iconColor || primaryColor, 24)}
                </div>
                <div className="text-center text-sm" style={{ color: secondaryColor, fontFamily: secondaryFontFamily }}>
                  <p data-editable="true" data-id="-addressLine1" data-label="Adresse 1">{addressLine1}</p>
                  <p data-editable="true" data-id="-addressLine2" data-label="Adresse 2">{addressLine2}</p>
                </div>
              </a>
            </div>

            <div className="relative w-full h-[260px] md:h-[320px] lg:h-[320px] rounded-xl overflow-hidden">
              {addressQuery ? (
                <iframe
                  title={mapTitle || "Carte de localisation"}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={mapUrl ? mapUrl.replace('{address}', encodeURIComponent(addressQuery)) : `https://www.google.com/maps?q=${encodeURIComponent(addressQuery)}&output=embed`}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



