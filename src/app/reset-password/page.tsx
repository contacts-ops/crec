import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordTemplateWrapper from '@/components/resetPasswordTemplate/ResetPasswordTemplateWrapper';

export const metadata: Metadata = {
  title: 'Réinitialisation du Mot de Passe',
  description: "Réinitialisez votre mot de passe pour accéder à votre espace client",
};

export default function ResetpasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <ResetPasswordTemplateWrapper {...{ "siteId": "" }} />
      </Suspense>
    </div>
  );
}