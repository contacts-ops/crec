import { Metadata } from 'next';
import { Suspense } from 'react';


export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: "",
};

export default function PolitiquedeconfidentialitPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        
      </Suspense>
    </div>
  );
}