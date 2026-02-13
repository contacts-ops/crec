import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginTemplateWrapper from '@/components/loginTemplate/LoginTemplateWrapper';

export const metadata: Metadata = {
  title: 'Connexion – CREC Experts Comptables',
  description: "Page de connexion du site CREC Experts Comptables.",
};

export default function ConnexionPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <LoginTemplateWrapper {...{ "siteId": "e64668ea-2a54-4a8d-8fd0-0744e429c51a" }} />
      </Suspense>
    </div>
  );
}