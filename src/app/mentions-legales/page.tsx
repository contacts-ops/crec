import { Metadata } from 'next';
import { Suspense } from 'react';


export const metadata: Metadata = {
  title: 'Mentions Légales',
  description: "",
};

export default function MentionsLgalesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        
      </Suspense>
    </div>
  );
}