"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, Check, X, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteId } from "@/hooks/use-site-id";
import { useSiteLink } from "@/hooks/use-site-link";

const requirements = [
  { regex: /.{8,}/, text: "Au moins 8 caractères" },
  { regex: /[0-9]/, text: "Au moins 1 chiffre" },
  { regex: /[a-z]/, text: "Au moins 1 lettre minuscule" },
  { regex: /[A-Z]/, text: "Au moins 1 lettre majuscule" },
  { regex: /[^A-Za-z0-9]/, text: "Au moins 1 caractère spécial" },
];

interface ResetPasswordTemplateProps {
  editableElements?: Record<string, string>;
}

export default function ResetPasswordTemplate({ editableElements = {} }: ResetPasswordTemplateProps) {
  const siteId = useSiteId();
  const searchParams = useSearchParams();
  const { transformLink } = useSiteLink();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [showPasswordErrors, setShowPasswordErrors] = useState(false);
  const strength = useMemo(() => requirements.map((req) => ({
    met: req.regex.test(newPassword),
    text: req.text,
  })), [newPassword, requirements]);
  const confirmStrength = useMemo(() => requirements.map((req) => ({
    met: req.regex.test(confirmPassword),
    text: req.text,
  })), [confirmPassword, requirements]);
  const strengthScore = strength.filter((r) => r.met).length;
  const confirmStrengthScore = confirmStrength.filter((r) => r.met).length;

  const getStrengthColor = (score: number) => {
    const ratio = score / requirements.length;
    if (ratio === 0) return "bg-border";
    if (ratio <= 0.25) return "bg-red-500";
    if (ratio <= 0.5) return "bg-[#EA580C]";
    if (ratio < 1) return "bg-amber-500";
    return "bg-emerald-500";
  };

  useEffect(() => {
    const tokenFromUrl = searchParams.get("token");
    setToken(tokenFromUrl);
  }, [searchParams]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordErrors(true);
    setError(null);
    setSuccess(null);
    if (!token) {
      setError("Token de réinitialisation manquant ou invalide.");
      return;
    }

    if (strengthScore < requirements.length || confirmStrengthScore < requirements.length) {
      setError("Veuillez respecter les critères du mot de passe.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/sharedServices/auth/reset-password-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword, siteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de réinitialiser le mot de passe.");
      setSuccess("Mot de passe réinitialisé avec succès. Vous pouvez vous connecter.");
      // Redirection vers la page de login correspondante (avec /sites/{siteId} si présent)
      setTimeout(() => {
        const loginPath = transformLink("/login");
        router.push(loginPath);
      }, 2000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {editableElements["reset-title"] || "Réinitialiser votre mot de passe"}
          </h1>
          <p className="text-gray-600">
            {editableElements["reset-subtitle"] || "Choisissez un nouveau mot de passe sécurisé"}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-emerald-500 mr-2" />
              <span className="text-emerald-700">{success}</span>
            </div>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nouveau mot de passe */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Nouveau mot de passe <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={isPasswordVisible ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••"
                  disabled={isLoading}
                  required
                  className="w-full h-12 rounded-lg border border-gray-200 bg-white px-4 pr-12 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsPasswordVisible((v) => !v)}
                  tabIndex={-1}
                  aria-label="Afficher/masquer le mot de passe"
                >
                  {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
                  style={{ width: `${(strengthScore / requirements.length) * 100}%` }}
                />
              </div>
              {showPasswordErrors && strengthScore < requirements.length && (
                <ul className="mt-2 space-y-1 text-sm text-gray-600">
                  {strength.map((req, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {req.met ? <Check size={14} className="text-emerald-500" /> : <X size={14} className="text-gray-400" />}
                      <span>{req.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirmer le mot de passe */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                Confirmer le mot de passe <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={isConfirmPasswordVisible ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••"
                  disabled={isLoading}
                  required
                  className="w-full h-12 rounded-lg border border-gray-200 bg-white px-4 pr-12 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-700"
                  onClick={() => setIsConfirmPasswordVisible((v) => !v)}
                  tabIndex={-1}
                  aria-label="Afficher/masquer la confirmation"
                >
                  {isConfirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {showPasswordErrors && confirmPassword.length > 0 && confirmPassword !== newPassword && (
                <p className="mt-2 text-sm text-rose-600">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className={cn(
                "w-full h-12 inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium",
                "bg-gray-900 text-white hover:bg-black transition-colors disabled:opacity-50"
              )}
            >
              {isLoading ? "Modification en cours..." : "Réinitialiser le mot de passe"}
              {!isLoading && <ArrowRight size={18} />}
            </button>
          </form>
        )}

        {/* Champs éditables cachés */}
        <div data-editable="true" data-id="reset-title" data-label="Titre page reset" style={{ display: "none" }}>
          {editableElements["reset-title"] || "Réinitialiser votre mot de passe"}
        </div>
        <div data-editable="true" data-id="reset-subtitle" data-label="Sous-titre page reset" style={{ display: "none" }}>
          {editableElements["reset-subtitle"] || "Choisissez un nouveau mot de passe sécurisé"}
        </div>
      </div>
    </div>
  );
}


