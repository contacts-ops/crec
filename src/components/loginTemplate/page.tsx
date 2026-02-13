"use client";

import { useState } from "react";
import {
  User,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  Key,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Shield,
  Smartphone,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSiteLink } from "@/hooks/use-site-link";

// Fonction de validation email
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface LoginTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

interface ForgotPasswordForm {
  email: string;
}

export default function LoginTemplate({
  siteId,
  editableElements = {},
}: LoginTemplateProps) {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get("redirect") || null;
  const [activeTab, setActiveTab] = useState<"login" | "register" | "forgot">("login");
  const [isLoading, setIsLoading] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Card principale avec animation d'entrée */}
        <div className="bg-white rounded-2xl shadow-xl p-8 transform transition-all duration-500 hover:scale-105">
          {/* Header simple */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 transform transition-transform duration-300 hover:rotate-12">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {activeTab === "login" && "Connexion"}
              {activeTab === "register" && "Inscription"}
              {activeTab === "forgot" && "Mot de passe oublié"}
            </h1>
            <p className="text-gray-600">
              {activeTab === "login" && "Connectez-vous à votre compte"}
              {activeTab === "register" && "Créez votre compte"}
              {activeTab === "forgot" &&
                "Entrez votre email pour réinitialiser votre mot de passe"}
            </p>
          </div>

          {/* Tabs avec animation */}
          {activeTab !== "forgot" && (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setActiveTab("login")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${
                  activeTab === "login"
                    ? "bg-white text-gray-900 shadow-md scale-105"
                    : "text-gray-600 hover:text-gray-900 hover:scale-105"
                }`}
              >
                <LogIn className="w-4 h-4 inline mr-2" />
                Connexion
              </button>
              <button
                onClick={() => setActiveTab("register")}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 transform ${
                  activeTab === "register"
                    ? "bg-white text-gray-900 shadow-md scale-105"
                    : "text-gray-600 hover:text-gray-900 hover:scale-105"
                }`}
              >
                <UserPlus className="w-4 h-4 inline mr-2" />
                Inscription
              </button>
            </div>
          )}

          {/* Formulaire de connexion */}
          {activeTab === "login" && (
            <LoginSection
              siteId={siteId}
              isLoading={isLoading}
              setActiveTab={setActiveTab}
              setIsLoading={setIsLoading}
              redirectUrl={redirectUrl}
            />
          )}

          {/* Formulaire d'inscription */}
          {activeTab === "register" && (
            <RegisterSection
              siteId={siteId}
              isLoading={isLoading}
              setActiveTab={setActiveTab}
              setIsLoading={setIsLoading}
            />
          )}

          {/* Formulaire mot de passe oublié */}
          {activeTab === "forgot" && (
            <ForgotPasswordSection
              siteId={siteId}
              isLoading={isLoading}
              setActiveTab={setActiveTab}
              setIsLoading={setIsLoading}
            />
          )}
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shake {
            0%,
            100% {
              transform: translateX(0);
            }
            25% {
              transform: translateX(-5px);
            }
            75% {
              transform: translateX(5px);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out;
          }

          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
      </div>
    </div>
  );
}

const ShowSuccess = ({ success }: { success: string }) => {
  if (!success) return null;
  return (
    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center">
        <CheckCircle className="h-5 w-5 text-green-400 mr-2 animate-bounce" />
        <span className="text-green-800">{success}</span>
      </div>
    </div>
  );
};

const ShowError = ({ error }: { error: string }) => {
  if (!error) return null;
  return (
    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in">
      <div className="flex items-center">
        {/* <AlertCircle className="h-5 w-5 text-red-400 mr-2 animate-pulse" /> */}
        <span className="text-red-800">{error}</span>
      </div>
    </div>
  );
};

const RegisterSection = ({
  siteId,
  isLoading,
  setActiveTab,
  setIsLoading,
}: {
  siteId: string;
  isLoading: boolean;
  setActiveTab: (activeTab: "login" | "register" | "forgot") => void;
  setIsLoading: (isLoading: boolean) => void;
}) => {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });
  const [registerErrors, setRegisterErrors] = useState<Partial<RegisterForm>>(
    {}
  );
  // Fonction de validation mot de passe
  const validatePassword = (password: string) => {
    return password.length >= 6; // Changé de 8 à 6 pour correspondre au modèle
  };

  const validateRegisterForm = () => {
    const errors: Partial<RegisterForm> = {};

    if (!registerForm.firstName) {
      errors.firstName = "Le prénom est requis";
    }

    if (!registerForm.lastName) {
      errors.lastName = "Le nom est requis";
    }

    if (!registerForm.email) {
      errors.email = "L'email est requis";
    } else if (!validateEmail(registerForm.email)) {
      errors.email = "Format d'email invalide";
    }

    if (!registerForm.password) {
      errors.password = "Le mot de passe est requis";
    } else if (!validatePassword(registerForm.password)) {
      errors.password = "Le mot de passe doit contenir au moins 6 caractères";
    }

    if (!registerForm.confirmPassword) {
      errors.confirmPassword = "La confirmation du mot de passe est requise";
    } else if (registerForm.password !== registerForm.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    // Validation du numéro de téléphone si fourni
    if (registerForm.phone && registerForm.phone.trim()) {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
      if (!phoneRegex.test(registerForm.phone.trim())) {
        errors.phone = "Format de numéro de téléphone invalide";
      }
    }

    setRegisterErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateRegisterForm()) return;

    if (!siteId) {
      setError("SiteId manquant pour l'inscription");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sharedServices/utilisateurs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: registerForm.firstName,
          lastName: registerForm.lastName,
          email: registerForm.email,
          password: registerForm.password,
          phone: registerForm.phone || undefined,
          siteId: siteId,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(
          "Inscription réussie ! Vous pouvez maintenant vous connecter."
        );
        setRegisterForm({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          phone: "",
        });
        // Basculer vers l'onglet connexion
        setTimeout(() => {
          setActiveTab("login");
        }, 100);
      } else {
        setError(data.error || "Erreur lors de l'inscription");
      }
    } catch (error) {
      setError("Erreur lors de l'inscription, veuillez vérifier vos informations");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ShowError error={error} />
      <ShowSuccess success={success} />
            <form onSubmit={handleRegister} className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Prénom
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                    <input
                      type="text"
                      value={registerForm.firstName}
                onChange={(e) =>
                  setRegisterForm({
                    ...registerForm,
                    firstName: e.target.value,
                  })
                }
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                  registerErrors.firstName
                    ? "border-red-300"
                    : "border-gray-300"
                      }`}
                      placeholder="Prénom"
                    />
                  </div>
                  {registerErrors.firstName && (
              <p className="text-red-600 text-sm animate-shake">
                {registerErrors.firstName}
              </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Nom
                  </label>
                  <div className="relative group">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                    <input
                      type="text"
                      value={registerForm.lastName}
                onChange={(e) =>
                  setRegisterForm({ ...registerForm, lastName: e.target.value })
                }
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                  registerErrors.lastName ? "border-red-300" : "border-gray-300"
                      }`}
                      placeholder="Nom"
                    />
                  </div>
                  {registerErrors.lastName && (
              <p className="text-red-600 text-sm animate-shake">
                {registerErrors.lastName}
              </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                  <input
                    type="email"
                    value={registerForm.email}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, email: e.target.value })
              }
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                registerErrors.email ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="votre@email.com"
                  />
                </div>
                {registerErrors.email && (
            <p className="text-red-600 text-sm animate-shake">
              {registerErrors.email}
            </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Téléphone (optionnel)
                </label>
                <div className="relative group">
                  <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                  <input
                    type="tel"
                    value={registerForm.phone}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, phone: e.target.value })
              }
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                registerErrors.phone ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>
                {registerErrors.phone && (
            <p className="text-red-600 text-sm animate-shake">
              {registerErrors.phone}
            </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={registerForm.password}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, password: e.target.value })
              }
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                registerErrors.password ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                  >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
                  </button>
                </div>
                {registerErrors.password && (
            <p className="text-red-600 text-sm animate-shake">
              {registerErrors.password}
            </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerForm.confirmPassword}
              onChange={(e) =>
                setRegisterForm({
                  ...registerForm,
                  confirmPassword: e.target.value,
                })
              }
                    className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                registerErrors.confirmPassword
                  ? "border-red-300"
                  : "border-gray-300"
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
                  >
              {showConfirmPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
                  </button>
                </div>
                {registerErrors.confirmPassword && (
            <p className="text-red-600 text-sm animate-shake">
              {registerErrors.confirmPassword}
            </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <UserPlus className="w-5 h-5" />
                )}
                {isLoading ? "Inscription..." : "S'inscrire"}
              </button>
            </form>
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-600">
          {"Déjà un compte ?"}{" "}
          <button
            onClick={() => setActiveTab("login")}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors duration-300"
          >
            Se connecter
          </button>
        </p>
      </div>
    </>
  );
};

const ForgotPasswordSection = ({
  siteId,
  isLoading,
  setActiveTab,
  setIsLoading,
}: {
  siteId: string;
  isLoading: boolean;
  setActiveTab: (activeTab: "login" | "register" | "forgot") => void;
  setIsLoading: (isLoading: boolean) => void;
}) => {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [forgotErrors, setForgotErrors] = useState<Partial<ForgotPasswordForm>>(
    {}
  );
  const [forgotForm, setForgotForm] = useState<ForgotPasswordForm>({
    email: "",
  });
  // Validation du formulaire mot de passe oublié
  const validateForgotForm = () => {
    const errors: Partial<ForgotPasswordForm> = {};

    if (!forgotForm.email) {
      errors.email = "L'email est requis";
    } else if (!validateEmail(forgotForm.email)) {
      errors.email = "Format d'email invalide";
    }

    setForgotErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateForgotForm()) return;

    setIsLoading(true);
    try {
      // Envoi réel via l'API Utilisateur (sharedServices)
      const res = await fetch(`/api/sharedServices/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotForm.email, siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi de l'email");
      }
      setSuccess(
        "Email de réinitialisation envoyé ! Vérifiez votre boîte mail."
      );
      setForgotForm({ email: "" });
      // Retour à l'onglet connexion après 2 secondes
      setTimeout(() => {
        setActiveTab("login");
      }, 2000);
    } catch (error) {
      setError("Erreur lors de l'envoi de l'email");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ShowError error={error} />
      <ShowSuccess success={success} />
      <form
        onSubmit={handleForgotPassword}
        className="space-y-6 animate-fade-in"
      >
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
                  <input
                    type="email"
                    value={forgotForm.email}
              onChange={(e) =>
                setForgotForm({ ...forgotForm, email: e.target.value })
              }
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                forgotErrors.email ? "border-red-300" : "border-gray-300"
                    }`}
                    placeholder="votre@email.com"
                  />
                </div>
                {forgotErrors.email && (
            <p className="text-red-600 text-sm animate-shake">
              {forgotErrors.email}
            </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Key className="w-5 h-5" />
                )}
                {isLoading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-center text-sm text-gray-600">
                <button
            onClick={() => setActiveTab("login")}
                  className="text-gray-900 font-medium hover:text-gray-700 transition-colors duration-300 flex items-center gap-1 mx-auto"
                >
                  <ArrowRight className="w-4 h-4" />
                  Retour à la connexion
                </button>
              </p>
          </div>
    </>
  );
};

const LoginSection = ({
  siteId,
  isLoading,
  setActiveTab,
  setIsLoading,
  redirectUrl,
}: {
  siteId: string;
  isLoading: boolean;
  setActiveTab: (activeTab: "login" | "register" | "forgot") => void;
  setIsLoading: (isLoading: boolean) => void;
  redirectUrl?: string | null;
}) => {
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: "",
  });
  const [loginErrors, setLoginErrors] = useState<Partial<LoginForm>>({});
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { transformLink } = useSiteLink();
  // Validation du formulaire de connexion
  const validateLoginForm = () => {
    const errors: Partial<LoginForm> = {};

    if (!loginForm.email) {
      errors.email = "L'email est requis";
    } else if (!validateEmail(loginForm.email)) {
      errors.email = "Format d'email invalide";
    }

    if (!loginForm.password) {
      errors.password = "Le mot de passe est requis";
    }

    setLoginErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Gestion de la connexion
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!validateLoginForm()) return;

    if (!siteId) {
      setError("SiteId manquant pour la connexion");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/sharedServices/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
          siteId: siteId,
        }),
      });
      const data = await response.json();
      const role = data.user.role;

      if (response.ok) {
        setSuccess("Connexion réussie ! Redirection...");
        setLoginForm({ email: "", password: "" });
        const isAdmin = role && String(role).toLowerCase() === "admin";
        
        // Dispatch custom event to notify header and other components of auth state change
        // This ensures the header updates immediately after login without page refresh
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
          detail: { 
            authenticated: true, 
            role: role,
            userId: data.user?.userId 
          } 
        }));
        // Check for redirect URL from query params (for e-commerce checkout flow)
        if (redirectUrl) {
          // Redirect to the original page (e.g., checkout page)
          window.location.href = decodeURIComponent(redirectUrl);
        } else {
          // Default redirect behavior (existing logic for other sites)
          if (isAdmin) {
            router.push(transformLink("/admin"));
          } else {
            router.push(transformLink("/landing-client"));
          }
        }
      } else {
        setError(data.error || "Erreur lors de la connexion");
      }
    } catch (error) {
      setError("Erreur de connexion, veuillez vérifier votre email et mot de passe");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ShowError error={error} />
      <ShowSuccess success={success} />
      <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm({ ...loginForm, email: e.target.value })
              }
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                loginErrors.email ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="votre@email.com"
            />
          </div>
          {loginErrors.email && (
            <p className="text-red-600 text-sm animate-shake">
              {loginErrors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Mot de passe
          </label>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-gray-900 transition-colors duration-300" />
            <input
              type={showPassword ? "text" : "password"}
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              className={`w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-300 ${
                loginErrors.password ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-300"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {loginErrors.password && (
            <p className="text-red-600 text-sm animate-shake">
              {loginErrors.password}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setActiveTab("forgot")}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors duration-300"
          >
            {"Mot de passe oublié ?"}
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <LogIn className="w-5 h-5" />
          )}
          {isLoading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
      <div className="mt-8 pt-6 border-t border-gray-200">
        <p className="text-center text-sm text-gray-600">
          {"Pas encore de compte ?"}{" "}
          <button
            onClick={() => setActiveTab("register")}
            className="text-gray-900 font-medium hover:text-gray-700 transition-colors duration-300"
          >
            S'inscrire
          </button>
        </p>
      </div>
    </>
  );
};
