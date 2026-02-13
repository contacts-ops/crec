"use client";

import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, MessageCircle, Phone, Eye } from "lucide-react";
import Chatbot from "../chatbot/page";

type ChatbotOption = {
  id: string;
  text: string;
  nextId?: string;
  reply?: string;
};

type ChatbotQuestion = {
  id: string;
  text: string;
  options: ChatbotOption[];
};

interface AdminChatbotTemplateProps {
  siteId?: string;
  editableElements?: { [key: string]: string };
}

export default function AdminChatbotTemplate({
  siteId,
}: AdminChatbotTemplateProps) {
  const [welcomeTitle, setWelcomeTitle] = useState("");
  const [welcomeText, setWelcomeText] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [questions, setQuestions] = useState<ChatbotQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  // Charger la configuration depuis l'API
  useEffect(() => {
    const loadConfig = async () => {
      if (!siteId) {
        console.log("❌ Pas de siteId fourni pour l'admin chatbot");
        setIsLoading(false);
        return;
      }

      try {
        console.log(
          "🔄 Chargement configuration admin chatbot pour siteId:",
          siteId
        );
        const timestamp = Date.now();
        const response = await fetch(
          `/api/sharedServices/chatbot?siteId=${siteId}&t=${timestamp}`
        );
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("📦 Configuration admin chatbot reçue:", data);
        if (data.success && data.config) {
          setWelcomeTitle(data.config.welcomeTitle || "");
          setWelcomeText(data.config.welcomeText || "");
          setContactPhone(data.config.contactPhone || "");
          setQuestions(data.config.initialQuestions || []);
        } else {
          console.error("❌ Configuration admin chatbot invalide:", data);
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors du chargement de la configuration admin chatbot:",
          error
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [siteId]);
  // Composant d'aperçu qui utilise le vrai Chatbot avec des données en temps réel
  const ChatbotPreview = ({
    primaryColor,
    secondaryColor,
    titleColor,
    subTitleColor,
    fontFamily,
    secondaryFontFamily,
    siteId,
    welcomeTitle,
    welcomeText,
    contactPhone,
    questions,
  }: {
    primaryColor: string;
    secondaryColor: string;
    titleColor: string;
    subTitleColor: string;
    fontFamily: string;
    secondaryFontFamily: string;
    siteId?: string;
    welcomeTitle: string;
    welcomeText: string;
    contactPhone: string;
    questions: ChatbotQuestion[];
  }) => {
    return (
      <div className="relative w-full h-full">
        <Chatbot
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          titleColor={titleColor}
          subTitleColor={subTitleColor}
          fontFamily={fontFamily}
          secondaryFontFamily={secondaryFontFamily}
          siteId={siteId}
          previewConfig={{
            welcomeTitle,
            welcomeText,
            contactPhone,
            initialQuestions: questions,
          }}
          forceOpen={true}
        />
      </div>
    );
  };

  const questionsIds = useMemo(
    () => new Set(questions.map((q) => q.id)),
    [questions]
  );
  const addQuestion = () => {
    const newId = `q${questions.length + 1}`;
    setQuestions((prev) => [
      ...prev,
      { id: newId, text: "Nouvelle question", options: [] },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: `o${q.options.length + 1}`, text: "Nouvelle option" },
              ],
            }
          : q
      )
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q
      )
    );
  };

  const updateQuestionField = (
    id: string,
    field: keyof ChatbotQuestion,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const updateOptionField = (
    questionId: string,
    optionId: string,
    field: keyof ChatbotOption,
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, [field]: value } : o
              ),
            }
          : q
      )
    );
  };

  const saveConfig = async () => {
    const payload = {
      siteId: siteId || "default-site",
      welcomeTitle,
      welcomeText,
      contactPhone,
      initialQuestions: questions,
    };

    try {
      console.log("💾 Sauvegarde configuration chatbot:", payload);
      const response = await fetch("/api/sharedServices/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Erreur ${response.status}: ${errorData.error || response.statusText}`
        );
      }

      const data = await response.json();
      console.log("✅ Configuration sauvegardée:", data);
      alert("Configuration sauvegardée avec succès !");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde:", error);
      alert(
        `Erreur lors de la sauvegarde: ${
          error instanceof Error ? error.message : "Erreur inconnue"
        }`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">Chargement de la configuration...</div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header moderne comme adminTemplate */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Chatbot</h2>
                <p className="text-gray-600 text-sm">
                  Configuration de l'assistant virtuel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="border-gray-300 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showPreview ? "Masquer l'aperçu" : "Aperçu"}
              </Button>
              <Button
                onClick={saveConfig}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Save className="w-4 h-4 mr-2" /> Enregistrer
              </Button>
            </div>
          </div>
        </div>

        {/* Paramètres généraux */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Paramètres généraux
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titre d&apos;accueil
              </label>
              <input
                value={welcomeTitle}
                onChange={(e) => setWelcomeTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Texte d&apos;accueil
              </label>
              <input
                value={welcomeText}
                onChange={(e) => setWelcomeText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Numéro de téléphone de contact
              </label>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                  placeholder="01 23 45 67 89"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Aperçu du chatbot */}
        {showPreview && (
          <ChatbotPreview
            primaryColor="#1f2937"
            secondaryColor="#3b82f6"
            titleColor="#111827"
            subTitleColor="#6b7280"
            fontFamily="Inter"
            secondaryFontFamily="Inter"
            siteId={siteId}
            welcomeTitle={welcomeTitle}
            welcomeText={welcomeText}
            contactPhone={contactPhone}
            questions={questions}
          />
        )}

        {/* Questions / Options */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Arborescence des questions
            </h3>
            <Button
              onClick={addQuestion}
              variant="outline"
              className="border-gray-300 hover:bg-gray-50"
            >
              <Plus className="w-4 h-4 mr-2" /> Ajouter une question
            </Button>
          </div>

          <div className="space-y-6">
            {questions.map((q) => (
              <div
                key={q.id}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm"
              >
                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded">
                      {q.id}
                    </span>
                    <input
                      value={q.text}
                      onChange={(e) =>
                        updateQuestionField(q.id, "text", e.target.value)
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md w-[400px] focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                    />
                  </div>
                  <Button
                    onClick={() => removeQuestion(q.id)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                  </Button>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700">
                      Options de réponse
                    </h4>
                    <Button
                      onClick={() => addOption(q.id)}
                      size="sm"
                      variant="outline"
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Ajouter une option
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {q.options.map((o) => (
                      <div
                        key={o.id}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="lg:col-span-4">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Texte de l&apos;option
                          </label>
                          <input
                            value={o.text}
                            onChange={(e) =>
                              updateOptionField(
                                q.id,
                                o.id,
                                "text",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                          />
                        </div>
                        <div className="lg:col-span-5">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Réponse du bot
                          </label>
                          <input
                            value={o.reply || ""}
                            onChange={(e) =>
                              updateOptionField(
                                q.id,
                                o.id,
                                "reply",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                            placeholder="Réponse automatique (facultatif)"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-2">
                            Question suivante
                          </label>
                          <input
                            list="question-ids"
                            value={o.nextId || ""}
                            onChange={(e) =>
                              updateOptionField(
                                q.id,
                                o.id,
                                "nextId",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                            placeholder="ex: q2"
                          />
                        </div>
                        <div className="lg:col-span-1 flex justify-end">
                          <Button
                            onClick={() => removeOption(q.id, o.id)}
                            variant="destructive"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <datalist id="question-ids">
        {[...questionsIds].map((qid) => (
          <option key={qid} value={qid} />
        ))}
      </datalist>
    </div>
  );
}
