import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatbot extends Document {
  siteId: string;
  welcomeTitle: string;
  welcomeText: string;
  contactPhone: string;
  initialQuestions: Array<{
    id: string;
    text: string;
    options: Array<{
      id: string;
      text: string;
      nextId?: string;
      reply?: string;
    }>;
  }>;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
  updateConfig: (config: Partial<IChatbot>) => Promise<IChatbot>;
}

export interface IChatbotModel extends Model<IChatbot> {
  findOrCreateBySiteId: (siteId: string) => Promise<IChatbot>;
}

const ChatbotOptionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  nextId: { type: String, required: false },
  reply: { type: String, required: false },
}, { _id: false });

const ChatbotQuestionSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  options: [ChatbotOptionSchema],
}, { _id: false });

const ChatbotSchema = new Schema<IChatbot>({
  siteId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  welcomeTitle: {
    type: String,
    required: true,
    default: "Bonjour ! Comment pouvons-nous vous aider ?",
  },
  welcomeText: {
    type: String,
    required: true,
    default: "Choisissez une question ci-dessous pour démarrer.",
  },
  contactPhone: {
    type: String,
    required: true,
    default: "01 23 45 67 89",
  },
  initialQuestions: {
    type: [ChatbotQuestionSchema],
    required: true,
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index pour optimiser les requêtes
ChatbotSchema.index({ siteId: 1 });
ChatbotSchema.index({ lastUpdated: -1 });

// Méthode pour mettre à jour la configuration
ChatbotSchema.methods.updateConfig = function(config: Partial<IChatbot>) {
  Object.assign(this, config);
  this.lastUpdated = new Date();
  return this.save();
};

// Méthode statique pour récupérer ou créer une configuration
ChatbotSchema.statics.findOrCreateBySiteId = async function(siteId: string) {
  let chatbot = await this.findOne({ siteId });

  if (!chatbot) {
    // Configuration par défaut
    const defaultConfig = {
      siteId,
      welcomeTitle: "Bonjour ! Comment pouvons-nous vous aider ?",
      welcomeText: "Choisissez une question ci-dessous pour démarrer.",
      contactPhone: "01 23 45 67 89",
      initialQuestions: [
        {
          id: "q1",
          text: "De quoi avez-vous besoin aujourd'hui ?",
          options: [
            {
              id: "o1",
              text: "Informations sur nos services",
              reply: "Parfait ! Je vais vous présenter nos différents services.",
              nextId: "q2",
            },
            {
              id: "o2",
              text: "Prendre un rendez-vous",
              reply: "Excellent choix ! Je vais vous aider à organiser votre rendez-vous.",
              nextId: "q3",
            },
            {
              id: "o3",
              text: "Demander un devis",
              reply: "Très bien ! Je vais vous guider pour obtenir un devis personnalisé.",
              nextId: "q4",
            },
            {
              id: "o4",
              text: "Signaler un problème",
              reply: "Je suis désolé d'entendre cela. Je vais vous aider à résoudre votre problème.",
              nextId: "q5",
            },
          ],
        },
        {
          id: "q2",
          text: "Quel type de service vous intéresse ?",
          options: [
            {
              id: "o21",
              text: "Services juridiques",
              reply: "Nos services juridiques comprennent la consultation, la rédaction de contrats, et la représentation en justice.",
            },
            {
              id: "o22",
              text: "Services de conseil",
              reply: "Nous proposons des services de conseil stratégique, organisationnel et opérationnel.",
            },
            {
              id: "o23",
              text: "Formation et accompagnement",
              reply: "Nous organisons des formations sur mesure et un accompagnement personnalisé.",
            },
          ],
        },
        {
          id: "q3",
          text: "Quel type de rendez-vous souhaitez-vous ?",
          options: [
            {
              id: "o31",
              text: "Consultation initiale",
              reply: "Une consultation initiale dure environ 1 heure et permet d'évaluer vos besoins.",
            },
            {
              id: "o32",
              text: "Suivi de dossier",
              reply: "Pour un suivi de dossier, nous aurons besoin de votre numéro de dossier.",
            },
            {
              id: "o33",
              text: "Urgence",
              reply: "Pour les urgences, nous essayons de vous recevoir dans les 24h.",
            },
          ],
        },
        {
          id: "q4",
          text: "Pour quel type de projet avez-vous besoin d'un devis ?",
          options: [
            {
              id: "o41",
              text: "Projet personnel",
              reply: "Pour un projet personnel, nous proposons des tarifs adaptés et des facilités de paiement.",
            },
            {
              id: "o42",
              text: "Projet professionnel",
              reply: "Pour un projet professionnel, nous établissons un devis détaillé avec planning.",
            },
            {
              id: "o43",
              text: "Projet associatif",
              reply: "Nous proposons des tarifs préférentiels pour les associations.",
            },
          ],
        },
        {
          id: "q5",
          text: "Quel type de problème rencontrez-vous ?",
          options: [
            {
              id: "o51",
              text: "Problème technique",
              reply: "Pour un problème technique, nous vous mettons en relation avec notre équipe technique.",
            },
            {
              id: "o52",
              text: "Problème de facturation",
              reply: "Pour un problème de facturation, nous vous transférons vers notre service comptabilité.",
            },
            {
              id: "o53",
              text: "Autre problème",
              reply: "Pour tout autre problème, nous vous mettons en relation avec le service approprié.",
            },
          ],
        },
      ],
    };

    chatbot = new this(defaultConfig);
    await chatbot.save();
  }

  return chatbot;
};

export const Chatbot = mongoose.models.Chatbot || mongoose.model<IChatbot, IChatbotModel>('Chatbot', ChatbotSchema);
