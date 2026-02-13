import React from 'react';
import LoginTemplate from './page';

interface WrapperProps {
  [key: string]: any;
}

export default function LoginTemplateWrapper(props: WrapperProps) {
  // Filtrer les props pour ne pas les passer aux éléments DOM
  const {
    primaryColor,
    secondaryColor,
    textColor,
    subTitleColor,
    titleColor,
    textButtonColor,
    fontFamily,
    secondaryFontFamily,
    step1Title,
    step1Description,
    step1ImageUrl,
    step1ImageAlt,
    step2Title,
    step2Description,
    step2ImageUrl,
    step2ImageAlt,
    step3Title,
    step3Description,
    step3ImageUrl,
    step3ImageAlt,
    ctaText,
    ctaUrl,
    ...restProps
  } = props;

  // Props valides pour le composant
  const validProps = {
    primaryColor,
    secondaryColor,
    textColor,
    subTitleColor,
    titleColor,
    textButtonColor,
    fontFamily,
    secondaryFontFamily,
    step1Title,
    step1Description,
    step1ImageUrl,
    step1ImageAlt,
    step2Title,
    step2Description,
    step2ImageUrl,
    step2ImageAlt,
    step3Title,
    step3Description,
    step3ImageUrl,
    step3ImageAlt,
    ctaText,
    ctaUrl,
    ...restProps
  };

  return <LoginTemplate {...validProps} />;
}