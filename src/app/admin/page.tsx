import { Metadata } from 'next';
import { Suspense } from 'react';
import AdminTemplateWrapper from '@/components/adminTemplate/AdminTemplateWrapper';

export const metadata: Metadata = {
  title: 'Administration – CREC Experts Comptables',
  description: "Espace réservé à l'administration du site CREC Experts Comptables.",
};

export default function AdministrationPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <AdminTemplateWrapper {...{ "siteId": "e64668ea-2a54-4a8d-8fd0-0744e429c51a" }} />
      </Suspense>
    </div>
  );
}