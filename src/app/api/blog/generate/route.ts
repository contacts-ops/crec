import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Entreprise } from '@/lib/models/Entreprise';
import { uploadImageToS3 } from '@/lib/s3';

// Interface pour la requête de génération
interface GenerateBlogRequest {
  keywords: string[];
  siteId: string;
  tone?: 'professional' | 'casual' | 'formal';
  length?: 'short' | 'medium' | 'long';
}

// Interface pour la réponse de génération
interface GenerateBlogResponse {
  success: boolean;
  article?: {
    title: string;
    content: string;
    imagePrompt: string;
    imageUrl: string;
    keywords: string[];
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Début de la génération d\'article de blog');
    
    const { keywords, siteId, tone = 'professional', length = 'medium' }: GenerateBlogRequest = await request.json();
    
    console.log('📋 Données reçues:', { keywords, siteId, tone, length });
    
    // Validation des données
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Les mots-clés sont requis et doivent être un tableau non vide' },
        { status: 400 }
      );
    }
    
    if (!siteId) {
      return NextResponse.json(
        { error: 'Le siteId est requis' },
        { status: 400 }
      );
    }
    
    // Connexion à la base de données
    await connectToDatabase();
    
    // Récupérer les informations de l'entreprise
    console.log('🏢 Récupération des informations de l\'entreprise...');
    const entreprise = await Entreprise.findOne({ siteId });
    
    if (!entreprise) {
      console.log('⚠️ Aucune entreprise trouvée pour ce site');
    } else {
      console.log('✅ Informations entreprise récupérées:', {
        nom: entreprise.nom,
        description: entreprise.description,
        ville: entreprise.adresseCentreAffaires?.ville
      });
    }
    
    // Générer le contenu de l'article basé sur les mots-clés et l'entreprise
    console.log('✍️ Génération du contenu de l\'article...');
    const generatedArticle = await generateBlogArticle(keywords, entreprise, tone, length);
    
    // Générer et uploader l'image
    console.log('🖼️ Génération et upload de l\'image...');
    const imageUrl = await generateAndUploadImage(generatedArticle.imagePrompt, siteId);
    
    // Ajouter l'URL de l'image à l'article
    generatedArticle.imageUrl = imageUrl;
    
    console.log('✅ Article et image générés avec succès');
    
    return NextResponse.json({
      success: true,
      article: generatedArticle
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la génération de l\'article',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Fonction pour générer l'article de blog
async function generateBlogArticle(
  keywords: string[], 
  entreprise: any, 
  tone: string, 
  length: string
) {
  // Déterminer la longueur du contenu
  const contentLength = {
    short: { minWords: 200, maxWords: 400 },
    medium: { minWords: 800, maxWords: 1200 },
    long: { minWords: 1200, maxWords: 2000 }
  }[length] || { minWords: 800, maxWords: 1200 };
  
  // Créer le titre basé sur les mots-clés principaux avec variabilité
  const mainKeyword = keywords[0];
  const secondaryKeywords = keywords.slice(1, 3);
  
  // Générer un ID unique pour cet article avec plus de randomisation
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000000);
  const keywordHash = keywords.join('').split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const articleId = Math.abs(timestamp + randomSeed + keywordHash);
  
  // Variantes de titres selon le ton - BEAUCOUP plus de variantes
  const titleVariants = {
    professional: [
      `Guide complet sur ${mainKeyword}`,
      `Maîtriser ${mainKeyword} : Stratégies et bonnes pratiques`,
      `${mainKeyword} : Guide pratique pour professionnels`,
      `Optimiser ${mainKeyword} : Méthodes et techniques`,
      `${mainKeyword} : Approche stratégique et méthodologique`,
      `Excellence en ${mainKeyword} : Méthodes avancées`,
      `${mainKeyword} : Expertise et maîtrise professionnelle`,
      `Développer ${mainKeyword} : Approches innovantes`,
      `${mainKeyword} : Stratégies d'excellence opérationnelle`,
      `Perfectionner ${mainKeyword} : Techniques éprouvées`,
      `Innovation dans ${mainKeyword} : Nouvelles perspectives`,
      `${mainKeyword} : Leadership et performance`,
      `Transformation par ${mainKeyword} : Vision stratégique`,
      `${mainKeyword} : Compétences clés du succès`,
      `Excellence opérationnelle en ${mainKeyword}`,
      `${mainKeyword} : Méthodologies de pointe`,
      `Optimisation avancée de ${mainKeyword}`,
      `${mainKeyword} : Approches systémiques`,
      `Maîtrise experte de ${mainKeyword}`,
      `${mainKeyword} : Stratégies différenciantes`
    ],
    casual: [
      `Tout ce que vous devez savoir sur ${mainKeyword}`,
      `${mainKeyword} : Le guide ultime pour débutants`,
      `Découvrir ${mainKeyword} : Conseils et astuces`,
      `${mainKeyword} : Guide simple et efficace`,
      `Apprendre ${mainKeyword} : Trucs et conseils pratiques`,
      `${mainKeyword} : Les secrets révélés`,
      `Comprendre ${mainKeyword} : Guide pas à pas`,
      `${mainKeyword} : Tout ce qu'il faut savoir`,
      `Explorer ${mainKeyword} : Aventures et découvertes`,
      `${mainKeyword} : Guide pratique et accessible`,
      `Décoder ${mainKeyword} : Les clés du succès`,
      `${mainKeyword} : Conseils d'experts simplifiés`,
      `Maîtriser ${mainKeyword} : Guide complet`,
      `${mainKeyword} : Les bases essentielles`,
      `Réussir avec ${mainKeyword} : Stratégies simples`,
      `${mainKeyword} : Guide pratique et concret`,
      `Progresser en ${mainKeyword} : Étapes claires`,
      `${mainKeyword} : Les fondamentaux expliqués`,
      `Exceller en ${mainKeyword} : Méthodes accessibles`,
      `${mainKeyword} : Guide complet et détaillé`
    ],
    formal: [
      `Analyse approfondie : ${mainKeyword} et ses implications`,
      `Étude stratégique de ${mainKeyword} : Approches et méthodologies`,
      `${mainKeyword} : Analyse critique et perspectives`,
      `Évaluation stratégique de ${mainKeyword} : Méthodes et résultats`,
      `${mainKeyword} : Approche analytique et méthodologique`,
      `Recherche approfondie sur ${mainKeyword} : Cadre théorique`,
      `${mainKeyword} : Étude comparative et analyse`,
      `Investigation méthodologique de ${mainKeyword}`,
      `${mainKeyword} : Cadre conceptuel et applications`,
      `Analyse systémique de ${mainKeyword} : Approches intégrées`,
      `${mainKeyword} : Étude empirique et validation`,
      `Recherche appliquée en ${mainKeyword} : Méthodologies`,
      `${mainKeyword} : Analyse prospective et tendances`,
      `Étude longitudinale de ${mainKeyword} : Évolutions`,
      `${mainKeyword} : Cadre d'analyse et implications`,
      `Investigation scientifique de ${mainKeyword}`,
      `${mainKeyword} : Méthodologie de recherche appliquée`,
      `Analyse critique de ${mainKeyword} : Perspectives`,
      `${mainKeyword} : Étude de cas et généralisations`,
      `Recherche-action sur ${mainKeyword} : Applications`
    ]
  };
  
  // Sélectionner un titre aléatoire selon le ton
  const selectedTitles = titleVariants[tone as keyof typeof titleVariants];
  let title = selectedTitles[articleId % selectedTitles.length];
  
  // Ajouter des sous-titres variés si des mots-clés secondaires existent
  if (secondaryKeywords.length > 0) {
    const subtitleVariants = [
      ` : ${secondaryKeywords.join(', ')}`,
      ` - Focus sur ${secondaryKeywords.join(' et ')}`,
      ` : Approche ${secondaryKeywords.join('-')}`,
      ` - Stratégies ${secondaryKeywords.join(' et ')}`,
      ` : Méthodes ${secondaryKeywords.join(' et ')}`,
      ` - Perspectives ${secondaryKeywords.join(' et ')}`,
      ` : Techniques ${secondaryKeywords.join(' et ')}`,
      ` - Applications ${secondaryKeywords.join(' et ')}`,
      ` : Concepts ${secondaryKeywords.join(' et ')}`,
      ` - Innovations ${secondaryKeywords.join(' et ')}`,
      ` : Solutions ${secondaryKeywords.join(' et ')}`,
      ` - Développements ${secondaryKeywords.join(' et ')}`,
      ` : Optimisations ${secondaryKeywords.join(' et ')}`,
      ` - Transformations ${secondaryKeywords.join(' et ')}`,
      ` : Intégrations ${secondaryKeywords.join(' et ')}`,
      ` - Synergies ${secondaryKeywords.join(' et ')}`,
      ` : Évolutions ${secondaryKeywords.join(' et ')}`,
      ` - Tendances ${secondaryKeywords.join(' et ')}`,
      ` : Avancées ${secondaryKeywords.join(' et ')}`,
      ` - Révolutions ${secondaryKeywords.join(' et ')}`
    ];
    title += subtitleVariants[articleId % subtitleVariants.length];
  }
  
  // Générer le contenu de l'article
  let content = generateArticleContent(keywords, entreprise, tone, contentLength);
  
  // Ajuster la longueur du contenu selon les besoins
  content = adjustContentLength(content, contentLength);
  
  // Générer une description d'image pertinente
  const imagePrompt = generateImagePrompt(keywords, entreprise);
  
  return {
    title,
    content,
    imagePrompt,
    imageUrl: "", // Sera rempli après la génération de l'image
    keywords: keywords.slice(0, 5) // Limiter à 5 mots-clés
  };
}

// Fonction pour générer le contenu de l'article avec variabilité
function generateArticleContent(keywords: string[], entreprise: any, tone: string, length: any) {
  const mainKeyword = keywords[0];
  const companyName = entreprise?.nom || 'notre entreprise';
  const companyDescription = entreprise?.description || 'spécialisée dans son domaine';
  const companyCity = entreprise?.adresseCentreAffaires?.ville || 'votre région';
  
  // Générer un ID unique pour cet article avec plus de randomisation
  const timestamp = Date.now();
  const randomSeed = Math.floor(Math.random() * 1000000);
  const keywordHash = keywords.join('').split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  const articleId = Math.abs(timestamp + randomSeed + keywordHash);
  
  // Sélectionner des variantes aléatoires pour la structure - BEAUCOUP plus de variantes
  const introVariants = [
    `Dans cet article, nous allons explorer en détail le sujet de <strong>${mainKeyword}</strong>.`,
    `Découvrons ensemble les secrets de <strong>${mainKeyword}</strong> et comment l'optimiser.`,
    `Plongeons dans l'univers fascinant de <strong>${mainKeyword}</strong> et ses applications.`,
    `Explorons les subtilités de <strong>${mainKeyword}</strong> pour maximiser votre réussite.`,
    `Analysons en profondeur <strong>${mainKeyword}</strong> et ses implications stratégiques.`,
    `Approfondissons notre compréhension de <strong>${mainKeyword}</strong> et ses enjeux.`,
    `Examinons les aspects cruciaux de <strong>${mainKeyword}</strong> pour votre développement.`,
    `Investiguons les mécanismes de <strong>${mainKeyword}</strong> et leur impact.`,
    `Décortiquons les éléments clés de <strong>${mainKeyword}</strong> et leurs applications.`,
    `Étudions les fondements de <strong>${mainKeyword}</strong> et leurs implications.`,
    `Décomposons les principes de <strong>${mainKeyword}</strong> pour une maîtrise optimale.`,
    `Revisons les concepts essentiels de <strong>${mainKeyword}</strong> et leurs bénéfices.`,
    `Démystifions les aspects complexes de <strong>${mainKeyword}</strong> et leurs solutions.`,
    `Décryptons les stratégies de <strong>${mainKeyword}</strong> et leurs résultats.`,
    `Dévoilons les techniques avancées de <strong>${mainKeyword}</strong> et leurs avantages.`,
    `Révélons les méthodes éprouvées de <strong>${mainKeyword}</strong> et leurs applications.`,
    `Exposons les approches innovantes de <strong>${mainKeyword}</strong> et leurs perspectives.`,
    `Présentons les solutions modernes de <strong>${mainKeyword}</strong> et leurs impacts.`,
    `Détaillons les processus optimisés de <strong>${mainKeyword}</strong> et leurs bénéfices.`,
    `Illustrons les pratiques exemplaires de <strong>${mainKeyword}</strong> et leurs résultats.`
  ];
  
  const contextVariants = [
    `La maîtrise de <strong>${mainKeyword}</strong> est devenue essentielle dans le paysage professionnel actuel.`,
    `L'expertise en <strong>${mainKeyword}</strong> constitue un avantage concurrentiel majeur aujourd'hui.`,
    `La compréhension approfondie de <strong>${mainKeyword}</strong> ouvre de nouvelles perspectives.`,
    `L'optimisation de <strong>${mainKeyword}</strong> représente un levier de croissance significatif.`,
    `L'innovation dans le domaine de <strong>${mainKeyword}</strong> redéfinit les standards du secteur.`,
    `La spécialisation en <strong>${mainKeyword}</strong> devient un facteur différenciant crucial.`,
    `L'adoption de <strong>${mainKeyword}</strong> transforme les pratiques professionnelles.`,
    `La connaissance experte de <strong>${mainKeyword}</strong> génère des opportunités uniques.`,
    `L'application stratégique de <strong>${mainKeyword}</strong> révolutionne les approches traditionnelles.`,
    `La maîtrise avancée de <strong>${mainKeyword}</strong> crée des avantages durables.`,
    `L'intégration de <strong>${mainKeyword}</strong> dans les processus optimise les performances.`,
    `La compréhension fine de <strong>${mainKeyword}</strong> permet des décisions éclairées.`,
    `L'exploitation optimale de <strong>${mainKeyword}</strong> maximise les retours sur investissement.`,
    `La mise en œuvre de <strong>${mainKeyword}</strong> accélère la transformation digitale.`,
    `L'appropriation de <strong>${mainKeyword}</strong> renforce la position concurrentielle.`,
    `Le développement de <strong>${mainKeyword}</strong> stimule l'innovation organisationnelle.`,
    `L'évolution de <strong>${mainKeyword}</strong> redessine les modèles économiques.`,
    `La progression dans <strong>${mainKeyword}</strong> ouvre de nouveaux horizons stratégiques.`,
    `L'adaptation à <strong>${mainKeyword}</strong> assure la pérennité des organisations.`,
    `La transformation par <strong>${mainKeyword}</strong> génère de la valeur ajoutée.`
  ];
  
  const benefitVariants = [
    `Les entreprises qui comprennent et appliquent correctement ces principes obtiennent des résultats significativement supérieurs.`,
    `Les organisations maîtrisant ces concepts enregistrent des performances exceptionnelles.`,
    `Les professionnels formés à ces méthodes dépassent systématiquement leurs objectifs.`,
    `Les équipes appliquant ces stratégies créent une valeur ajoutée remarquable.`,
    `Les projets intégrant ces approches génèrent des retours sur investissement impressionnants.`,
    `Les structures adoptant ces pratiques réalisent des gains de productivité substantiels.`,
    `Les dirigeants implémentant ces solutions transforment leur organisation.`,
    `Les collaborateurs maîtrisant ces techniques accroissent leur efficacité.`,
    `Les départements intégrant ces méthodologies optimisent leurs processus.`,
    `Les secteurs appliquant ces innovations révolutionnent leurs pratiques.`,
    `Les marchés adoptant ces approches créent de nouveaux standards.`,
    `Les communautés utilisant ces outils développent leur potentiel.`,
    `Les écosystèmes intégrant ces solutions génèrent des synergies.`,
    `Les réseaux appliquant ces stratégies multiplient leurs opportunités.`,
    `Les partenaires maîtrisant ces concepts renforcent leur collaboration.`,
    `Les clients bénéficiant de ces méthodes améliorent leur satisfaction.`,
    `Les utilisateurs adoptant ces technologies accroissent leur performance.`,
    `Les acteurs implémentant ces solutions créent de la valeur durable.`,
    `Les intervenants appliquant ces approches génèrent des impacts positifs.`,
    `Les participants maîtrisant ces techniques optimisent leurs résultats.`
  ];
  
  // Introduction variée
  let content = `<h2>Introduction</h2>`;
  content += `<p>${introVariants[articleId % introVariants.length]} `;
  
  if (entreprise?.description) {
    content += `En tant qu'entreprise ${companyDescription}, nous avons développé une expertise particulière dans ce domaine. `;
  }
  
  content += `Que vous soyez un professionnel expérimenté ou un débutant, cet article vous apportera des informations précieuses et des conseils pratiques.</p>`;
  
  // Paragraphe d'introduction varié
  content += `<p>${contextVariants[articleId % contextVariants.length]} `;
  content += `${benefitVariants[articleId % benefitVariants.length]} `;
  content += `Notre objectif est de vous fournir une compréhension approfondie et des stratégies concrètes pour réussir.</p>`;
  
  // Sections principales avec variabilité
  keywords.forEach((keyword, index) => {
    if (index < 3) {
      const sectionTitles = [
        `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} : Aspects essentiels`,
        `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} : Fondamentaux à maîtriser`,
        `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} : Clés du succès`,
        `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} : Stratégies gagnantes`,
        `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} : Méthodes éprouvées`
      ];
      
      const sectionTitle = sectionTitles[articleId % sectionTitles.length];
      content += `<h2>${sectionTitle}</h2>`;
      
      const sectionIntros = [
        `La compréhension de <strong>${keyword}</strong> est fondamentale pour réussir dans ce domaine.`,
        `Maîtriser <strong>${keyword}</strong> constitue un pilier de votre stratégie.`,
        `L'expertise en <strong>${keyword}</strong> différencie les leaders du secteur.`,
        `L'approche de <strong>${keyword}</strong> détermine votre niveau de performance.`,
        `La vision de <strong>${keyword}</strong> influence directement vos résultats.`
      ];
      
      content += `<p>${sectionIntros[articleId % sectionIntros.length]} `;
      
      if (entreprise?.nom) {
        content += `Chez ${companyName}, nous accordons une importance particulière à cet aspect dans notre approche professionnelle. `;
      }
      
      content += `Voici les points clés à retenir :</p>`;
      
      // Listes variées selon l'article
      const listItems = [
        ['Définition et contexte d\'utilisation', 'Avantages et bénéfices', 'Points d\'attention et bonnes pratiques', 'Méthodes d\'implémentation', 'Outils et ressources nécessaires'],
        ['Concepts fondamentaux', 'Applications pratiques', 'Risques et opportunités', 'Stratégies d\'optimisation', 'Indicateurs de performance'],
        ['Principes de base', 'Cas d\'usage concrets', 'Bonnes pratiques', 'Méthodologies avancées', 'Ressources complémentaires'],
        ['Fondements théoriques', 'Exemples pratiques', 'Recommandations', 'Processus d\'implémentation', 'Métriques de suivi'],
        ['Bases conceptuelles', 'Applications réelles', 'Conseils d\'experts', 'Approches innovantes', 'Outils de mesure']
      ];
      
      const selectedItems = listItems[articleId % listItems.length];
      content += `<ul>`;
      selectedItems.forEach(item => {
        content += `<li>${item}</li>`;
      });
      content += `</ul>`;
      
      // Paragraphes détaillés variés
      const detailParagraphs = [
        `L'implémentation de <strong>${keyword}</strong> nécessite une approche structurée et méthodique. Il est crucial de comprendre que chaque aspect de ce processus contribue à l'ensemble de votre stratégie. Une approche fragmentée peut entraîner des résultats décevants et des ressources gaspillées.`,
        `La mise en œuvre de <strong>${keyword}</strong> exige une vision holistique et une planification rigoureuse. Chaque composant de cette démarche s'inscrit dans une logique d'ensemble cohérente. Une approche partielle peut compromettre l'efficacité globale et limiter les bénéfices attendus.`,
        `L'adoption de <strong>${keyword}</strong> implique une transformation progressive et une adaptation continue. Chaque étape de ce parcours contribue à la construction d'un écosystème performant. Une approche linéaire peut ralentir l'évolution et réduire l'impact sur vos performances.`
      ];
      
      content += `<p>${detailParagraphs[articleId % detailParagraphs.length]}</p>`;
      
      const impactParagraphs = [
        `De plus, il est important de considérer l'impact de <strong>${keyword}</strong> sur vos autres processus métier. L'intégration harmonieuse avec vos systèmes existants est essentielle pour maximiser l'efficacité et minimiser les perturbations. Cette synergie vous permettra d'obtenir des résultats supérieurs à la somme des parties individuelles.`,
        `Par ailleurs, l'influence de <strong>${keyword}</strong> sur votre écosystème opérationnel mérite une attention particulière. L'articulation cohérente avec vos processus actuels est cruciale pour optimiser la performance et réduire les frictions. Cette cohérence génère des effets de levier qui amplifient significativement vos résultats.`,
        `Enfin, la portée de <strong>${keyword}</strong> sur votre architecture organisationnelle doit être évaluée avec précision. L'harmonisation avec vos structures existantes est déterminante pour accroître la productivité et faciliter les transitions. Cette intégration crée des synergies qui démultiplient la valeur de vos initiatives.`
      ];
      
      content += `<p>${impactParagraphs[articleId % impactParagraphs.length]}</p>`;
    }
  });
  
  // Section analyse approfondie variée
  const analysisTitles = [
    'Analyse approfondie et études de cas',
    'Études de cas et retours d\'expérience',
    'Scénarios concrets et analyses détaillées',
    'Exemples pratiques et analyses approfondies',
    'Cas d\'usage et analyses stratégiques'
  ];
  
  content += `<h2>${analysisTitles[articleId % analysisTitles.length]}</h2>`;
  content += `<p>Pour mieux comprendre l'impact de <strong>${mainKeyword}</strong>, analysons quelques scénarios concrets :</p>`;
  
  const scenario1Titles = [
    'Scénario 1 : Implémentation progressive',
    'Cas 1 : Approche par étapes',
    'Exemple 1 : Déploiement graduel',
    'Situation 1 : Mise en place progressive',
    'Étude 1 : Intégration séquentielle'
  ];
  
  const scenario2Titles = [
    'Scénario 2 : Transformation complète',
    'Cas 2 : Changement radical',
    'Exemple 2 : Révolution organisationnelle',
    'Situation 2 : Métamorphose totale',
    'Étude 2 : Refonte intégrale'
  ];
  
  content += `<h3>${scenario1Titles[articleId % scenario1Titles.length]}</h3>`;
  
  const scenario1Descriptions = [
    `Une approche progressive permet de minimiser les risques tout en maximisant les bénéfices. En commençant par des projets pilotes, vous pouvez identifier les défis potentiels et ajuster votre stratégie en conséquence. Cette méthode vous donne également l'opportunité de former votre équipe et d'optimiser vos processus.`,
    `Une démarche par étapes facilite la gestion des risques et l'optimisation des résultats. En initiant des expérimentations ciblées, vous pouvez détecter les obstacles potentiels et affiner votre approche progressivement. Cette stratégie vous permet aussi de développer les compétences de votre équipe et d'améliorer vos méthodes.`,
    `Une intégration séquentielle réduit les incertitudes tout en amplifiant les gains. En lançant des tests contrôlés, vous pouvez anticiper les difficultés éventuelles et perfectionner votre méthodologie étape par étape. Cette approche vous offre également la possibilité d'éduquer votre équipe et de raffiner vos procédures.`
  ];
  
  content += `<p>${scenario1Descriptions[articleId % scenario1Descriptions.length]}</p>`;
  
  content += `<h3>${scenario2Titles[articleId % scenario2Titles.length]}</h3>`;
  
  const scenario2Descriptions = [
    `Pour les organisations prêtes à un changement majeur, une transformation complète peut offrir des avantages significatifs. Cette approche nécessite une planification minutieuse et un engagement total de la direction. Les résultats peuvent être spectaculaires, mais les risques sont également plus élevés.`,
    `Pour les entreprises déterminées à opérer une révolution, une refonte intégrale peut générer des bénéfices exceptionnels. Cette stratégie exige une préparation rigoureuse et une mobilisation complète des dirigeants. Les performances peuvent être remarquables, mais les enjeux sont aussi plus importants.`,
    `Pour les structures motivées par une métamorphose, une évolution radicale peut produire des avantages considérables. Cette méthode requiert une organisation méticuleuse et une implication totale de la gouvernance. Les retombées peuvent être impressionnantes, mais les défis sont aussi plus conséquents.`
  ];
  
  content += `<p>${scenario2Descriptions[articleId % scenario2Descriptions.length]}</p>`;
  
  // Section conseils pratiques variée
  const conseilsTitles = [
    'Conseils pratiques et recommandations détaillées',
    'Recommandations pratiques et conseils d\'experts',
    'Bonnes pratiques et conseils stratégiques',
    'Conseils d\'implémentation et bonnes pratiques',
    'Recommandations stratégiques et conseils pratiques'
  ];
  
  content += `<h2>${conseilsTitles[articleId % conseilsTitles.length]}</h2>`;
  content += `<p>Basé sur notre expérience et notre expertise, voici nos recommandations pour optimiser votre approche de <strong>${mainKeyword}</strong> :</p>`;
  
  // Listes de conseils variées
  const conseilsLists = [
    [
      '<strong>Planifiez votre stratégie</strong> : Définissez des objectifs clairs et mesurables. Établissez des jalons intermédiaires pour suivre vos progrès et ajuster votre approche si nécessaire.',
      '<strong>Formez-vous continuellement</strong> : Restez à jour avec les dernières tendances et innovations. Participez à des formations, webinaires et conférences pour maintenir votre expertise à jour.',
      '<strong>Mesurez vos résultats</strong> : Suivez vos performances et ajustez votre approche. Utilisez des métriques claires pour évaluer l\'efficacité de vos initiatives.',
      '<strong>Collaborez avec des experts</strong> : N\'hésitez pas à faire appel à des consultants externes ou à des partenaires spécialisés pour vous accompagner dans votre démarche.',
      '<strong>Documentez vos processus</strong> : Créez une base de connaissances qui servira de référence pour votre équipe et facilitera la formation de nouveaux membres.'
    ],
    [
      '<strong>Élaborez votre feuille de route</strong> : Construisez un plan d\'action structuré et évolutif. Définissez des étapes intermédiaires pour évaluer vos avancées et adapter votre stratégie.',
      '<strong>Développez vos compétences</strong> : Investissez dans votre formation et celle de votre équipe. Suivez les évolutions du secteur et participez à des événements professionnels.',
      '<strong>Surveillez vos indicateurs</strong> : Mettez en place un système de suivi de vos performances. Utilisez des KPIs pertinents pour mesurer l\'impact de vos actions.',
      '<strong>Partagez avec des spécialistes</strong> : Bénéficiez de l\'expertise de professionnels qualifiés. Collaborez avec des partenaires expérimentés pour enrichir votre approche.',
      '<strong>Capitalisez sur vos expériences</strong> : Construisez un référentiel de bonnes pratiques. Documentez vos réussites et vos apprentissages pour optimiser vos futurs projets.'
    ],
    [
      '<strong>Concevez votre stratégie</strong> : Établissez une vision claire et des objectifs quantifiables. Créez des étapes de validation pour mesurer vos progrès et ajuster votre méthode.',
      '<strong>Enrichissez vos connaissances</strong> : Maintenez votre niveau d\'expertise à la pointe. Engagez-vous dans des programmes de formation et des échanges professionnels.',
      '<strong>Analysez vos performances</strong> : Implémentez un suivi rigoureux de vos résultats. Développez des indicateurs de performance pour évaluer l\'efficacité de vos actions.',
      '<strong>Associez des professionnels</strong> : Faites appel à des experts reconnus dans votre domaine. Partenarisez avec des spécialistes pour renforcer votre approche.',
      '<strong>Organisez votre savoir</strong> : Développez une base documentaire structurée. Centralisez vos connaissances pour faciliter la transmission et l\'apprentissage.'
    ]
  ];
  
  const selectedConseils = conseilsLists[articleId % conseilsLists.length];
  content += `<ol>`;
  selectedConseils.forEach(conseil => {
    content += `<li>${conseil}</li>`;
  });
  content += `</ol>`;
  
  // Section défis variée
  const defisTitles = [
    'Défis courants et solutions',
    'Obstacles fréquents et parades',
    'Difficultés typiques et remèdes',
    'Challenges habituels et solutions',
    'Problématiques courantes et résolutions'
  ];
  
  content += `<h2>${defisTitles[articleId % defisTitles.length]}</h2>`;
  content += `<p>L'implémentation de <strong>${mainKeyword}</strong> peut présenter plusieurs défis :</p>`;
  
  // Listes de défis variées
  const defisLists = [
    [
      '<strong>Résistance au changement</strong> : La communication et la formation sont essentielles pour surmonter la résistance naturelle au changement.',
      '<strong>Ressources limitées</strong> : Priorisez vos initiatives et commencez par les projets qui offrent le meilleur retour sur investissement.',
      '<strong>Complexité technique</strong> : Simplifiez vos processus et utilisez des outils appropriés pour réduire la complexité.',
      '<strong>Mesure du succès</strong> : Définissez des indicateurs de performance clairs et suivez-les régulièrement.'
    ],
    [
      '<strong>Opposition au changement</strong> : L\'accompagnement et le développement des compétences sont cruciaux pour dépasser les réticences naturelles.',
      '<strong>Contraintes budgétaires</strong> : Hiérarchisez vos actions et privilégiez les initiatives à fort potentiel de rentabilité.',
      '<strong>Sophistication technique</strong> : Rationalisez vos procédures et adoptez des solutions adaptées pour minimiser la complexité.',
      '<strong>Évaluation des performances</strong> : Établissez des métriques de réussite précises et assurez leur suivi continu.'
    ],
    [
      '<strong>Réticence à l\'évolution</strong> : La sensibilisation et l\'acquisition de nouvelles compétences sont fondamentales pour vaincre les appréhensions.',
      '<strong>Limitations de ressources</strong> : Sélectionnez vos priorités et concentrez-vous sur les projets générant le meilleur ROI.',
      '<strong>Intrication technique</strong> : Optimisez vos workflows et intégrez des technologies appropriées pour simplifier l\'ensemble.',
      '<strong>Suivi des résultats</strong> : Créez des indicateurs de performance pertinents et maintenez leur surveillance.'
    ]
  ];
  
  const selectedDefis = defisLists[articleId % defisLists.length];
  content += `<ul>`;
  selectedDefis.forEach(defi => {
    content += `<li>${defi}</li>`;
  });
  content += `</ul>`;
  
  // Section conclusion variée
  const conclusionTitles = [
    'Conclusion et perspectives d\'avenir',
    'Synthèse et vision prospective',
    'Bilan et orientations futures',
    'Récapitulatif et perspectives',
    'Résumé et vision d\'avenir'
  ];
  
  content += `<h2>${conclusionTitles[articleId % conclusionTitles.length]}</h2>`;
  
  const conclusionIntros = [
    `En conclusion, <strong>${mainKeyword}</strong> représente un enjeu majeur dans votre domaine d'activité.`,
    `Pour résumer, <strong>${mainKeyword}</strong> constitue un défi essentiel dans votre secteur d'activité.`,
    `En définitive, <strong>${mainKeyword}</strong> s'avère être un enjeu critique dans votre domaine professionnel.`,
    `Finalement, <strong>${mainKeyword}</strong> se révèle être un défi fondamental dans votre secteur d'activité.`,
    `En substance, <strong>${mainKeyword}</strong> apparaît comme un enjeu déterminant dans votre domaine professionnel.`
  ];
  
  content += `<p>${conclusionIntros[articleId % conclusionIntros.length]} `;
  
  if (entreprise?.nom) {
    content += `Chez ${companyName}, nous sommes là pour vous accompagner dans cette démarche et vous fournir l'expertise nécessaire. `;
  }
  
  const conclusionPerspectives = [
    `L'importance de cette approche ne fera que croître dans les années à venir, rendant essentiel de commencer votre transformation dès maintenant.`,
    `La pertinence de cette stratégie continuera de s'accroître dans le futur, nécessitant d'initier votre évolution sans délai.`,
    `La valeur de cette méthode ne cessera d'augmenter dans les prochaines années, exigeant de lancer votre transformation immédiatement.`,
    `L'impact de cette approche ne fera que s'amplifier dans les temps à venir, imposant de débuter votre mutation dès à présent.`,
    `La portée de cette stratégie ne fera que s'étendre dans les années futures, demandant d'engager votre transformation sans attendre.`
  ];
  
  content += `${conclusionPerspectives[articleId % conclusionPerspectives.length]}</p>`;
  
  const conclusionBenefits = [
    `Les organisations qui adoptent ces principes aujourd'hui se positionnent pour un succès durable. L'investissement dans la compréhension et l'implémentation de <strong>${mainKeyword}</strong> est un investissement dans l'avenir de votre entreprise. Les bénéfices à long terme dépassent largement les efforts initiaux requis.`,
    `Les entreprises qui intègrent ces concepts dès maintenant s'assurent une position avantageuse pour l'avenir. L'engagement dans la maîtrise et la mise en œuvre de <strong>${mainKeyword}</strong> constitue un investissement dans la pérennité de votre organisation. Les retombées futures compensent amplement les investissements présents.`,
    `Les structures qui adoptent ces méthodes aujourd'hui se préparent à une réussite pérenne. L'engagement dans l'apprentissage et l'application de <strong>${mainKeyword}</strong> représente un investissement dans la durabilité de votre entreprise. Les avantages futurs justifient pleinement les efforts actuels.`
  ];
  
  content += `<p>${conclusionBenefits[articleId % conclusionBenefits.length]}</p>`;
  
  // Call-to-action varié
  const ctaTitles = [
    'Prêt à commencer votre transformation ?',
    'Envie de lancer votre évolution ?',
    'Déterminé à initier votre mutation ?',
    'Motivé pour engager votre transformation ?',
    'Préparé à démarrer votre révolution ?'
  ];
  
  const ctaIntros = [
    `Notre équipe d'experts est disponible pour répondre à vos questions et vous accompagner dans vos projets.`,
    `Nos spécialistes qualifiés sont à votre disposition pour éclairer vos interrogations et vous guider dans vos initiatives.`,
    `Notre équipe expérimentée est prête à répondre à vos demandes et à vous soutenir dans vos démarches.`,
    `Nos consultants experts sont disponibles pour clarifier vos questions et vous accompagner dans vos projets.`,
    `Notre équipe compétente est là pour répondre à vos besoins et vous épauler dans vos réalisations.`
  ];
  
  const ctaOffers = [
    `Nous proposons des consultations gratuites pour évaluer votre situation actuelle et vous proposer un plan d'action adapté à vos objectifs et contraintes.`,
    `Nous offrons des évaluations sans engagement pour analyser votre contexte présent et vous suggérer une stratégie personnalisée selon vos ambitions et vos limites.`,
    `Nous mettons à disposition des analyses préliminaires pour examiner votre environnement actuel et vous recommander une approche sur mesure en fonction de vos aspirations et de vos contraintes.`,
    `Nous fournissons des diagnostics gratuits pour appréhender votre situation présente et vous proposer une méthodologie adaptée à vos objectifs et à vos contraintes.`,
    `Nous dispensons des évaluations préliminaires pour comprendre votre contexte actuel et vous suggérer une démarche personnalisée selon vos ambitions et vos limites.`
  ];
  
  content += `<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">`;
  content += `<h3>${ctaTitles[articleId % ctaTitles.length]}</h3>`;
  content += `<p>${ctaIntros[articleId % ctaIntros.length]} `;
  
  if (entreprise?.telephone) {
    content += `Contactez-nous au <strong>${entreprise.telephone}</strong> `;
  }
  
  if (entreprise?.email) {
    content += `ou par email à <strong>${entreprise.email}</strong>`;
  }
  
  content += ` pour un accompagnement personnalisé et une évaluation de vos besoins spécifiques.</p>`;
  content += `<p>${ctaOffers[articleId % ctaOffers.length]}</p>`;
  content += `</div>`;
  
  return content;
}

// Fonction pour ajuster la longueur du contenu selon les besoins
function adjustContentLength(content: string, contentLength: { minWords: number; maxWords: number }): string {
  // Compter les mots actuels (enlever les balises HTML)
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const currentWordCount = textContent.split(' ').length;
  
  console.log(`📊 Longueur actuelle: ${currentWordCount} mots, cible: ${contentLength.minWords}-${contentLength.maxWords} mots`);
  
  // Si le contenu est trop court, l'étendre
  if (currentWordCount < contentLength.minWords) {
    const additionalContent = generateAdditionalContent(content, contentLength.minWords - currentWordCount);
    content += additionalContent;
    console.log(`📈 Contenu étendu de ${currentWordCount} à ${content.split(' ').filter(word => word.length > 0).length} mots`);
  }
  
  // Si le contenu est trop long, le raccourcir
  if (currentWordCount > contentLength.maxWords) {
    content = truncateContent(content, contentLength.maxWords);
    console.log(`📉 Contenu raccourci à ${content.split(' ').filter(word => word.length > 0).length} mots`);
  }
  
  return content;
}

// Fonction pour générer du contenu supplémentaire
function generateAdditionalContent(existingContent: string, additionalWords: number): string {
  let additionalContent = '';
  
  // Ajouter des sections supplémentaires
  additionalContent += `<h2>Considérations supplémentaires</h2>`;
  additionalContent += `<p>Pour approfondir votre compréhension, considérez également les aspects suivants :</p>`;
  additionalContent += `<ul>`;
  additionalContent += `<li>L'impact sur la culture d'entreprise et l'engagement des employés</li>`;
  additionalContent += `<li>Les implications légales et réglementaires à prendre en compte</li>`;
  additionalContent += `<li>L'optimisation des processus et l'amélioration continue</li>`;
  additionalContent += `<li>La formation et le développement des compétences de votre équipe</li>`;
  additionalContent += `<li>L'évaluation des risques et la mise en place de mesures de mitigation</li>`;
  additionalContent += `</ul>`;
  
  additionalContent += `<h2>Métriques et indicateurs de performance</h2>`;
  additionalContent += `<p>Pour mesurer efficacement le succès de votre initiative, suivez ces indicateurs clés :</p>`;
  additionalContent += `<ul>`;
  additionalContent += `<li>Réduction des coûts opérationnels et amélioration de l'efficacité</li>`;
  additionalContent += `<li>Augmentation de la satisfaction client et de la rétention</li>`;
  additionalContent += `<li>Amélioration de la qualité des produits ou services</li>`;
  additionalContent += `<li>Réduction des erreurs et des temps de traitement</li>`;
  additionalContent += `<li>Amélioration de la collaboration et de la communication interne</li>`;
  additionalContent += `</ul>`;
  
  // Ajouter plus de contenu pour atteindre la longueur cible
  additionalContent += `<h2>Analyse approfondie des tendances du marché</h2>`;
  additionalContent += `<p>Le paysage professionnel évolue constamment, et il est crucial de rester à la pointe des dernières tendances. Les organisations qui anticipent ces changements et s'adaptent rapidement obtiennent un avantage concurrentiel significatif. Cette section explore les tendances émergentes et leur impact potentiel sur votre stratégie.</p>`;
  additionalContent += `<p>L'analyse des tendances du marché nécessite une approche systématique et continue. Il ne s'agit pas seulement de suivre les actualités, mais de comprendre les forces sous-jacentes qui façonnent votre secteur d'activité. Cette compréhension vous permettra de prendre des décisions éclairées et de positionner votre organisation pour le succès à long terme.</p>`;
  
  additionalContent += `<h2>Stratégies d'implémentation avancées</h2>`;
  additionalContent += `<p>L'implémentation réussie de nouvelles stratégies requiert une planification minutieuse et une exécution rigoureuse. Cette section présente des méthodologies avancées et des bonnes pratiques éprouvées pour maximiser vos chances de succès. Nous explorerons également les pièges courants et comment les éviter.</p>`;
  additionalContent += `<p>Chaque organisation est unique, et il n'existe pas d'approche universelle. Cependant, en adaptant ces méthodologies à votre contexte spécifique et en tirant les leçons des expériences d'autres organisations, vous pouvez développer une approche sur mesure qui maximise vos chances de réussite.</p>`;
  
  additionalContent += `<h2>Études de cas et retours d'expérience</h2>`;
  additionalContent += `<p>Les études de cas et retours d'expérience offrent des insights précieux sur ce qui fonctionne et ce qui ne fonctionne pas. Cette section présente plusieurs exemples concrets d'organisations qui ont réussi à implémenter des stratégies similaires, ainsi que les leçons apprises de ces expériences.</p>`;
  additionalContent += `<p>En analysant ces exemples, vous pourrez identifier les facteurs clés de succès et les obstacles potentiels. Cette connaissance vous aidera à affiner votre approche et à éviter les erreurs courantes. N'oubliez pas que chaque situation est unique, et il est important d'adapter ces leçons à votre contexte spécifique.</p>`;
  
  additionalContent += `<h2>Outils et ressources recommandés</h2>`;
  additionalContent += `<p>La réussite de votre initiative dépendra en grande partie des outils et ressources que vous utiliserez. Cette section présente une sélection d'outils, de plateformes et de ressources qui peuvent vous aider à atteindre vos objectifs. Nous explorerons également comment intégrer ces outils dans votre workflow existant.</p>`;
  additionalContent += `<p>Il est important de choisir des outils qui s'alignent avec vos objectifs et votre culture organisationnelle. Prenez le temps d'évaluer différentes options et de tester les solutions avant de faire un engagement à long terme. La bonne combinaison d'outils peut faire une différence significative dans votre succès.</p>`;
  
  additionalContent += `<h2>Plan d'action et feuille de route</h2>`;
  additionalContent += `<p>Un plan d'action clair et une feuille de route détaillée sont essentiels pour transformer votre vision en réalité. Cette section vous guide à travers le processus de création d'un plan d'action structuré et d'une feuille de route réaliste. Nous couvrirons également la gestion des risques et la planification des contingences.</p>`;
  additionalContent += `<p>Votre plan d'action doit être suffisamment détaillé pour guider l'exécution, mais suffisamment flexible pour s'adapter aux changements et aux défis inattendus. Une approche itérative qui permet l'apprentissage et l'ajustement continu est souvent plus efficace qu'un plan rigide et détaillé.</p>`;
  
  return additionalContent;
}

// Fonction pour raccourcir le contenu
function truncateContent(content: string, maxWords: number): string {
  const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = textContent.split(' ');
  
  if (words.length <= maxWords) {
    return content;
  }
  
  // Garder les premiers mots et ajouter une conclusion
  const truncatedWords = words.slice(0, maxWords - 50); // Laisser de la place pour la conclusion
  let truncatedContent = truncatedWords.join(' ');
  
  // Ajouter une conclusion
  truncatedContent += `... [Contenu tronqué pour respecter la longueur demandée] `;
  truncatedContent += `Pour plus d'informations détaillées, n'hésitez pas à nous contacter.`;
  
  return truncatedContent;
}

// Fonction pour générer une description d'image
function generateImagePrompt(keywords: string[], entreprise: any) {
  const mainKeyword = keywords[0];
  const companyName = entreprise?.nom || 'entreprise professionnelle';
  
  return `Image professionnelle représentant ${mainKeyword}, style moderne et épuré, couleurs d'entreprise, design minimaliste, haute qualité, adaptée pour un blog professionnel sur ${companyName}`;
}

// Fonction pour générer et uploader une image
async function generateAndUploadImage(imagePrompt: string, siteId: string): Promise<string> {
  try {
    console.log('🎨 Génération de l\'image avec le prompt:', imagePrompt);
    
    // Pour l'instant, nous allons créer une image SVG basée sur le prompt
    // Dans une vraie implémentation, vous pourriez utiliser une API d'IA comme DALL-E, Midjourney, ou Stable Diffusion
    
    const svgImage = generateSVGImage(imagePrompt);
    
    // Convertir le SVG en buffer
    const imageBuffer = Buffer.from(svgImage, 'utf-8');
    
    // Générer un nom de fichier unique
    const timestamp = Date.now();
    const fileName = `generated-blog-image-${timestamp}.svg`;
    
    // Vérifier si les variables S3 sont configurées
    if (process.env.S3_BUCKET_NAME && process.env.S3_REGION) {
      try {
        // Upload vers S3
        console.log('📤 Upload de l\'image vers S3...');
        const uploadResult = await uploadImageToS3(imageBuffer, fileName, 'image/svg+xml');
        
        if (uploadResult.success && uploadResult.imageUrl) {
          console.log('✅ Image uploadée avec succès:', uploadResult.imageUrl);
          return uploadResult.imageUrl;
        } else {
          console.log('⚠️ Échec de l\'upload S3, utilisation de l\'image par défaut');
        }
      } catch (s3Error) {
        console.log('⚠️ Erreur S3, utilisation de l\'image par défaut:', s3Error);
      }
    } else {
      console.log('⚠️ Variables S3 non configurées, utilisation de l\'image par défaut');
    }
    
    // En cas d'erreur ou de configuration manquante, retourner une image par défaut
    return 'https://via.placeholder.com/800x400/6366f1/ffffff?text=Image+Blog+Générée';
    
  } catch (error) {
    console.error('❌ Erreur lors de la génération de l\'image:', error);
    
    // En cas d'erreur, retourner une image par défaut
    return 'https://via.placeholder.com/800x400/6366f1/ffffff?text=Image+Blog+Générée';
  }
}

// Fonction pour générer une image SVG basée sur le prompt avec variabilité
function generateSVGImage(prompt: string): string {
  // Extraire les mots-clés principaux du prompt
  const keywords = prompt.toLowerCase().split(' ').filter(word => 
    word.length > 3 && !['image', 'professionnelle', 'représentant', 'style', 'moderne', 'épuré', 'couleurs', 'entreprise', 'design', 'minimaliste', 'haute', 'qualité', 'adaptée', 'pour', 'blog', 'professionnel', 'sur'].includes(word)
  );
  
  const mainKeyword = keywords[0] || 'concept';
  
  // Générer un ID unique pour cette image
  const imageId = Math.floor(Date.now() + Math.random() * 1000);
  
  // Palettes de couleurs variées et sophistiquées
  const colorPalettes = [
    ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'], // Bleu-Violet-Magenta
    ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#06b6d4'], // Rouge-Orange-Vert
    ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'], // Violet-Rose-Orange
    ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#0c4a6e'], // Bleu profond
    ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#022c22'], // Vert profond
    ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#451a03'], // Orange profond
    ['#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#500724'], // Rose profond
    ['#a855f7', '#9333ea', '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95']  // Violet profond
  ];
  
  const selectedPalette = colorPalettes[imageId % colorPalettes.length];
  const color1 = selectedPalette[Math.floor(Math.random() * selectedPalette.length)];
  const color2 = selectedPalette[Math.floor(Math.random() * selectedPalette.length)];
  
  // Styles d'arrière-plan variés et sophistiqués
  const backgroundStyles = [
    // Style 1: Gradient linéaire diagonal
    `<defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="50%" style="stop-color:${color2};stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${color1};stop-opacity:0.6" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#grad1)" rx="20"/>`,
    
    // Style 2: Gradient radial centré
    `<defs>
      <radialGradient id="grad1" cx="50%" cy="50%" r="70%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="70%" style="stop-color:${color2};stop-opacity:0.7" />
        <stop offset="100%" style="stop-color:${color1};stop-opacity:0.3" />
      </radialGradient>
    </defs>
    <rect width="800" height="400" fill="url(#grad1)" rx="20"/>`,
    
    // Style 3: Motif géométrique sophistiqué
    `<defs>
      <pattern id="pattern1" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
        <circle cx="30" cy="30" r="3" fill="${color1}" opacity="0.4"/>
        <rect x="25" y="25" width="10" height="10" fill="${color2}" opacity="0.3" rx="2"/>
        <circle cx="15" cy="15" r="2" fill="${color1}" opacity="0.2"/>
        <circle cx="45" cy="45" r="2" fill="${color2}" opacity="0.2"/>
      </pattern>
    </defs>
    <rect width="800" height="400" fill="${color1}" rx="20"/>
    <rect width="800" height="400" fill="url(#pattern1)" rx="20"/>`,
    
    // Style 4: Gradient multi-couleurs
    `<defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="33%" style="stop-color:${color2};stop-opacity:0.8" />
        <stop offset="66%" style="stop-color:${color1};stop-opacity:0.6" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:0.4" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#grad1)" rx="20"/>`,
    
    // Style 5: Motif hexagonal
    `<defs>
      <pattern id="pattern1" x="0" y="0" width="50" height="43.4" patternUnits="userSpaceOnUse">
        <polygon points="25,0 50,21.7 50,43.4 25,65.1 0,43.4 0,21.7" fill="${color1}" opacity="0.2"/>
        <polygon points="25,10 45,28.4 45,45.1 25,62.5 5,45.1 5,28.4" fill="${color2}" opacity="0.3"/>
      </pattern>
    </defs>
    <rect width="800" height="400" fill="${color1}" rx="20"/>
    <rect width="800" height="400" fill="url(#pattern1)" rx="20"/>`,
    
    // Style 6: Gradient angulaire
    `<defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="25%" style="stop-color:${color2};stop-opacity:0.9" />
        <stop offset="50%" style="stop-color:${color1};stop-opacity:0.7" />
        <stop offset="75%" style="stop-color:${color2};stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${color1};stop-opacity:0.5" />
      </linearGradient>
    </defs>
    <rect width="800" height="400" fill="url(#grad1)" rx="20"/>`,
    
    // Style 7: Motif de points et lignes
    `<defs>
      <pattern id="pattern1" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <circle cx="40" cy="40" r="4" fill="${color1}" opacity="0.4"/>
        <line x1="0" y1="40" x2="80" y2="40" stroke="${color2}" stroke-width="1" opacity="0.3"/>
        <line x1="40" y1="0" x2="40" y2="80" stroke="${color1}" stroke-width="1" opacity="0.3"/>
        <circle cx="20" cy="20" r="2" fill="${color2}" opacity="0.2"/>
        <circle cx="60" cy="60" r="2" fill="${color1}" opacity="0.2"/>
      </pattern>
    </defs>
    <rect width="800" height="400" fill="${color1}" rx="20"/>
    <rect width="800" height="400" fill="url(#pattern1)" rx="20"/>`,
    
    // Style 8: Gradient circulaire complexe
    `<defs>
      <radialGradient id="grad1" cx="30%" cy="30%" r="80%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="40%" style="stop-color:${color2};stop-opacity:0.8" />
        <stop offset="70%" style="stop-color:${color1};stop-opacity:0.5" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:0.2" />
      </radialGradient>
    </defs>
    <rect width="800" height="400" fill="url(#grad1)" rx="20"/>`
  ];
  
  const selectedBackground = backgroundStyles[imageId % backgroundStyles.length];
  
  // Formes décoratives variées et sophistiquées
  const decorativeShapes = [
    // Style 1: Cercles et rectangles élégants
    `<circle cx="700" cy="100" r="60" fill="rgba(255,255,255,0.1)"/>
     <circle cx="750" cy="300" r="40" fill="rgba(255,255,255,0.1)"/>
     <rect x="650" y="200" width="80" height="80" fill="rgba(255,255,255,0.1)" rx="10"/>
     <circle cx="680" cy="150" r="15" fill="rgba(255,255,255,0.05)"/>`,
    
    // Style 2: Triangles et hexagones géométriques
    `<polygon points="700,100 730,60 760,100 730,140" fill="rgba(255,255,255,0.1)"/>
     <polygon points="750,300 770,280 790,300 770,320" fill="rgba(255,255,255,0.1)"/>
     <polygon points="650,200 670,180 690,200 670,220" fill="rgba(255,255,255,0.1)"/>
     <polygon points="720,80 740,70 750,80 740,90" fill="rgba(255,255,255,0.05)"/>`,
    
    // Style 3: Lignes et points connectés
    `<line x1="700" y1="100" x2="760" y2="100" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
     <line x1="750" y1="300" x2="790" y2="300" stroke="rgba(255,255,255,0.2)" stroke-width="4"/>
     <circle cx="650" cy="200" r="20" fill="rgba(255,255,255,0.1)"/>
     <line x1="680" y1="150" x2="720" y2="150" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>`,
    
    // Style 4: Formes organiques et fluides
    `<ellipse cx="700" cy="100" rx="50" ry="30" fill="rgba(255,255,255,0.1)"/>
     <ellipse cx="750" cy="300" rx="35" ry="25" fill="rgba(255,255,255,0.1)"/>
     <polygon points="650,200 690,180 690,220 650,240" fill="rgba(255,255,255,0.1)"/>
     <circle cx="670" cy="210" r="8" fill="rgba(255,255,255,0.05)"/>`,
    
    // Style 5: Étoiles et polygones
    `<polygon points="700,100 710,80 720,100 710,120" fill="rgba(255,255,255,0.1)"/>
     <polygon points="750,300 760,280 770,300 760,320" fill="rgba(255,255,255,0.1)"/>
     <polygon points="650,200 660,180 670,200 660,220" fill="rgba(255,255,255,0.1)"/>
     <polygon points="720,90 725,85 730,90 725,95" fill="rgba(255,255,255,0.05)"/>`,
    
    // Style 6: Formes abstraites modernes
    `<path d="M700,100 Q730,80 760,100 T820,100" stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none"/>
     <path d="M750,300 Q770,280 790,300 T830,300" stroke="rgba(255,255,255,0.1)" stroke-width="3" fill="none"/>
     <rect x="650" y="200" width="40" height="40" fill="rgba(255,255,255,0.1)" rx="20"/>
     <circle cx="670" cy="220" r="5" fill="rgba(255,255,255,0.05)"/>`
  ];
  
  const selectedDecorations = decorativeShapes[imageId % decorativeShapes.length];
  
  // Styles d'icône variés et sophistiqués
  const iconStyles = [
    // Style 1: Rectangle moderne avec lettre
    `<g transform="translate(200, 120)">
      <rect x="0" y="0" width="120" height="120" fill="rgba(255,255,255,0.95)" rx="20" filter="url(#shadow)"/>
      <rect x="10" y="10" width="100" height="100" fill="rgba(255,255,255,0.8)" rx="15"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color1}">${mainKeyword.charAt(0).toUpperCase()}</text>
    </g>`,
    
    // Style 2: Cercle élégant avec lettre
    `<g transform="translate(200, 120)">
      <circle cx="60" cy="60" r="60" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
      <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.8)"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color1}">${mainKeyword.charAt(0).toUpperCase()}</text>
    </g>`,
    
    // Style 3: Hexagone sophistiqué avec lettre
    `<g transform="translate(200, 120)">
      <polygon points="60,20 100,20 120,60 100,100 60,100 40,60" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
      <polygon points="60,25 95,25 110,60 95,95 60,95 45,60" fill="rgba(255,255,255,0.8)"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color1}">${mainKeyword.charAt(0).toUpperCase()}</text>
    </g>`,
    
    // Style 4: Diamant avec lettre
    `<g transform="translate(200, 120)">
      <polygon points="60,10 110,60 60,110 10,60" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
      <polygon points="60,20 100,60 60,100 20,60" fill="rgba(255,255,255,0.8)"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color1}">${mainKeyword.charAt(0).toUpperCase()}</text>
    </g>`,
    
    // Style 5: Étoile avec lettre
    `<g transform="translate(200, 120)">
      <polygon points="60,10 70,40 100,40 75,60 85,90 60,70 35,90 45,60 20,40 50,40" fill="rgba(255,255,255,0.95)" filter="url(#shadow)"/>
      <polygon points="60,20 68,40 90,40 72,55 78,80 60,65 42,80 48,55 30,40 52,40" fill="rgba(255,255,255,0.8)"/>
      <text x="60" y="75" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="${color1}">${mainKeyword.charAt(0).toUpperCase()}</text>
    </g>`
  ];
  
  const selectedIcon = iconStyles[imageId % iconStyles.length];
  
  // Sous-titres variés
  const subtitles = [
    'Article de blog généré automatiquement',
    'Contenu optimisé et personnalisé',
    'Ressource créée intelligemment',
    'Article généré avec expertise',
    'Contenu adapté à vos besoins'
  ];
  
  const selectedSubtitle = subtitles[imageId % subtitles.length];
  
  // Éléments décoratifs de bas variés
  const bottomDecorations = [
    // Style 1: Ligne avec point central
    `<line x1="150" y1="350" x2="650" y2="350" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
     <circle cx="400" cy="350" r="4" fill="rgba(255,255,255,0.6)"/>`,
    
    // Style 2: Points multiples
    `<circle cx="200" cy="350" r="3" fill="rgba(255,255,255,0.4)"/>
     <circle cx="400" cy="350" r="4" fill="rgba(255,255,255,0.6)"/>
     <circle cx="600" cy="350" r="3" fill="rgba(255,255,255,0.4)"/>`,
    
    // Style 3: Lignes parallèles
    `<line x1="150" y1="345" x2="650" y2="345" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
     <line x1="150" y1="355" x2="650" y2="355" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>`
  ];
  
  const selectedBottomDecoration = bottomDecorations[imageId % bottomDecorations.length];
  
  // Créer un SVG avec un design varié
  const svg = `
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.1"/>
        </filter>
      </defs>
      
      <!-- Arrière-plan avec style varié -->
      ${selectedBackground}
      
      <!-- Formes décoratives variées -->
      ${selectedDecorations}
      
      <!-- Icône principale stylisée -->
      ${selectedIcon}
      
      <!-- Texte principal -->
      <text x="400" y="280" font-family="Arial, sans-serif" font-size="32" font-weight="bold" text-anchor="middle" fill="white" filter="url(#shadow)">
        ${mainKeyword.charAt(0).toUpperCase() + mainKeyword.slice(1)}
      </text>
      
      <!-- Sous-titre varié -->
      <text x="400" y="320" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="rgba(255,255,255,0.8)">
        ${selectedSubtitle}
      </text>
      
      <!-- Éléments décoratifs de bas variés -->
      ${selectedBottomDecoration}
    </svg>
  `;
  
  return svg;
}
