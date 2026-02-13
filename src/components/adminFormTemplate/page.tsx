"use client";

import React from "react";
import FormulairesAdmin from "../admin-formulaires/page";

interface AdminFormTemplateProps {
  siteId?: string;
}

export default function AdminFormTemplate({ siteId }: AdminFormTemplateProps) {
  return (
    <div className="p-6">
      <FormulairesAdmin 
        primaryColor="#E7461E"
        secondaryColor="#FF6B35"
        textColor="#222222"
        fontFamily="Inter, system-ui, sans-serif"
        title="Gestion des Formulaires"
        subtitle="Consultez et gérez tous les formulaires soumis"
        enableSearch={true}
        enablePagination={true}
        enableStatusFilter={true}
        itemsPerPage={10}
      />
    </div>
  );
} 