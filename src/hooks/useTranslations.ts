import { useEffect, useState } from 'react';

// Traductions pour toutes les langues
const translations = {
  en: {
    title: "My Sites",
    newSite: "New Site",
    loading: "Loading sites...",
    noSites: "No sites",
    noSitesDesc: "Start by creating your first site",
    createSite: "Create a site",
    searchPlaceholder: "Search a site...",
    noResults: "No results",
    noResultsDesc: "No site matches your search",
    publishedSites: "Published Sites",
    devSites: "Development Sites",
    // Sidebar
    sidebarSites: "Sites",
    sidebarCreateSite: "Create Site",
    sidebarLibrary: "Component Library",
    sidebarTeam: "Team",
    sidebarDomains: "Domains",
    sidebarSettings: "Settings",
    // ProjectCard
    projectCardDeployed: "Deployed",
    projectCardDev: "Development",
    projectCardChecking: "Checking...",
    projectCardClickPreview: "Click for preview",
  },
  es: {
    title: "Mis Sitios",
    newSite: "Nuevo Sitio",
    loading: "Cargando sitios...",
    noSites: "Sin sitios",
    noSitesDesc: "Comienza creando tu primer sitio",
    createSite: "Crear un sitio",
    searchPlaceholder: "Buscar un sitio...",
    noResults: "Sin resultados",
    noResultsDesc: "Ningún sitio coincide con tu búsqueda",
    publishedSites: "Sitios Publicados",
    devSites: "Sitios en Desarrollo",
    // Sidebar
    sidebarSites: "Sitios",
    sidebarCreateSite: "Crear Sitio",
    sidebarLibrary: "Biblioteca de Componentes",
    sidebarTeam: "Equipo",
    sidebarDomains: "Dominios",
    sidebarSettings: "Configuración",
    // ProjectCard
    projectCardDeployed: "Desplegado",
    projectCardDev: "Desarrollo",
    projectCardChecking: "Verificando...",
    projectCardClickPreview: "Hacer clic para vista previa",
  },
  de: {
    title: "Meine Websites",
    newSite: "Neue Website",
    loading: "Websites werden geladen...",
    noSites: "Keine Websites",
    noSitesDesc: "Erstellen Sie Ihre erste Website",
    createSite: "Website erstellen",
    searchPlaceholder: "Website suchen...",
    noResults: "Keine Ergebnisse",
    noResultsDesc: "Keine Website entspricht Ihrer Suche",
    publishedSites: "Veröffentlichte Websites",
    devSites: "Websites in Entwicklung",
    // Sidebar
    sidebarSites: "Websites",
    sidebarCreateSite: "Website erstellen",
    sidebarLibrary: "Komponenten-Bibliothek",
    sidebarTeam: "Team",
    sidebarDomains: "Domains",
    sidebarSettings: "Einstellungen",
    // ProjectCard
    projectCardDeployed: "Veröffentlicht",
    projectCardDev: "Entwicklung",
    projectCardChecking: "Überprüfung...",
    projectCardClickPreview: "Klicken für Vorschau",
  },
  it: {
    title: "I Miei Siti",
    newSite: "Nuovo Sito",
    loading: "Caricamento siti...",
    noSites: "Nessun sito",
    noSitesDesc: "Inizia creando il tuo primo sito",
    createSite: "Crea un sito",
    searchPlaceholder: "Cerca un sito...",
    noResults: "Nessun risultato",
    noResultsDesc: "Nessun sito corrisponde alla tua ricerca",
    publishedSites: "Siti Pubblicati",
    devSites: "Siti in Sviluppo",
    // Sidebar
    sidebarSites: "Siti",
    sidebarCreateSite: "Crea Sito",
    sidebarLibrary: "Libreria Componenti",
    sidebarTeam: "Squadra",
    sidebarDomains: "Domini",
    sidebarSettings: "Impostazioni",
    // ProjectCard
    projectCardDeployed: "Pubblicato",
    projectCardDev: "Sviluppo",
    projectCardChecking: "Verifica...",
    projectCardClickPreview: "Clicca per anteprima",
  },
  pt: {
    title: "Meus Sites",
    newSite: "Novo Site",
    loading: "Carregando sites...",
    noSites: "Nenhum site",
    noSitesDesc: "Comece criando seu primeiro site",
    createSite: "Criar um site",
    searchPlaceholder: "Pesquisar um site...",
    noResults: "Nenhum resultado",
    noResultsDesc: "Nenhum site corresponde à sua pesquisa",
    publishedSites: "Sites Publicados",
    devSites: "Sites em Desenvolvimento",
    // Sidebar
    sidebarSites: "Sites",
    sidebarCreateSite: "Criar Site",
    sidebarLibrary: "Biblioteca de Componentes",
    sidebarTeam: "Equipe",
    sidebarDomains: "Domínios",
    sidebarSettings: "Configurações",
    // ProjectCard
    projectCardDeployed: "Publicado",
    projectCardDev: "Desenvolvimento",
    projectCardChecking: "Verificando...",
    projectCardClickPreview: "Clique para visualizar",
  },
  nl: {
    title: "Mijn Sites",
    newSite: "Nieuwe Site",
    loading: "Sites laden...",
    noSites: "Geen sites",
    noSitesDesc: "Begin met het maken van je eerste site",
    createSite: "Site maken",
    searchPlaceholder: "Zoek een site...",
    noResults: "Geen resultaten",
    noResultsDesc: "Geen site komt overeen met je zoekopdracht",
    publishedSites: "Gepubliceerde Sites",
    devSites: "Sites in Ontwikkeling",
    // Sidebar
    sidebarSites: "Sites",
    sidebarCreateSite: "Site Maken",
    sidebarLibrary: "Componenten Bibliotheek",
    sidebarTeam: "Team",
    sidebarDomains: "Domeinen",
    sidebarSettings: "Instellingen",
    // ProjectCard
    projectCardDeployed: "Gepubliceerd",
    projectCardDev: "Ontwikkeling",
    projectCardChecking: "Controleren...",
    projectCardClickPreview: "Klik voor voorbeeld",
  },
  ru: {
    title: "Мои Сайты",
    newSite: "Новый Сайт",
    loading: "Загрузка сайтов...",
    noSites: "Нет сайтов",
    noSitesDesc: "Начните с создания первого сайта",
    createSite: "Создать сайт",
    searchPlaceholder: "Поиск сайта...",
    noResults: "Нет результатов",
    noResultsDesc: "Ни один сайт не соответствует вашему поиску",
    publishedSites: "Опубликованные Сайты",
    devSites: "Сайты в Разработке",
    // Sidebar
    sidebarSites: "Сайты",
    sidebarCreateSite: "Создать Сайт",
    sidebarLibrary: "Библиотека Компонентов",
    sidebarTeam: "Команда",
    sidebarDomains: "Домены",
    sidebarSettings: "Настройки",
    // ProjectCard
    projectCardDeployed: "Опубликован",
    projectCardDev: "Разработка",
    projectCardChecking: "Проверка...",
    projectCardClickPreview: "Нажмите для предпросмотра",
  },
  ja: {
    title: "マイサイト",
    newSite: "新しいサイト",
    loading: "サイトを読み込み中...",
    noSites: "サイトがありません",
    noSitesDesc: "最初のサイトを作成してください",
    createSite: "サイトを作成",
    searchPlaceholder: "サイトを検索...",
    noResults: "結果がありません",
    noResultsDesc: "検索に一致するサイトがありません",
    publishedSites: "公開済みサイト",
    devSites: "開発中のサイト",
    // Sidebar
    sidebarSites: "サイト",
    sidebarCreateSite: "サイト作成",
    sidebarLibrary: "コンポーネントライブラリ",
    sidebarTeam: "チーム",
    sidebarDomains: "ドメイン",
    sidebarSettings: "設定",
    // ProjectCard
    projectCardDeployed: "公開済み",
    projectCardDev: "開発中",
    projectCardChecking: "確認中...",
    projectCardClickPreview: "プレビューをクリック",
  },
  ko: {
    title: "내 사이트",
    newSite: "새 사이트",
    loading: "사이트 로딩 중...",
    noSites: "사이트 없음",
    noSitesDesc: "첫 번째 사이트를 만들어보세요",
    createSite: "사이트 만들기",
    searchPlaceholder: "사이트 검색...",
    noResults: "결과 없음",
    noResultsDesc: "검색과 일치하는 사이트가 없습니다",
    publishedSites: "게시된 사이트",
    devSites: "개발 중인 사이트",
    // Sidebar
    sidebarSites: "사이트",
    sidebarCreateSite: "사이트 만들기",
    sidebarLibrary: "컴포넌트 라이브러리",
    sidebarTeam: "팀",
    sidebarDomains: "도메인",
    sidebarSettings: "설정",
    // ProjectCard
    projectCardDeployed: "게시됨",
    projectCardDev: "개발 중",
    projectCardChecking: "확인 중...",
    projectCardClickPreview: "미리보기 클릭",
  },
  zh: {
    title: "我的网站",
    newSite: "新网站",
    loading: "正在加载网站...",
    noSites: "没有网站",
    noSitesDesc: "开始创建您的第一个网站",
    createSite: "创建网站",
    searchPlaceholder: "搜索网站...",
    noResults: "没有结果",
    noResultsDesc: "没有网站匹配您的搜索",
    publishedSites: "已发布网站",
    devSites: "开发中网站",
    // Sidebar
    sidebarSites: "网站",
    sidebarCreateSite: "创建网站",
    sidebarLibrary: "组件库",
    sidebarTeam: "团队",
    sidebarDomains: "域名",
    sidebarSettings: "设置",
    // ProjectCard
    projectCardDeployed: "已发布",
    projectCardDev: "开发中",
    projectCardChecking: "检查中...",
    projectCardClickPreview: "点击预览",
  },
  ar: {
    title: "مواقعي",
    newSite: "موقع جديد",
    loading: "جاري تحميل المواقع...",
    noSites: "لا توجد مواقع",
    noSitesDesc: "ابدأ بإنشاء موقعك الأول",
    createSite: "إنشاء موقع",
    searchPlaceholder: "البحث عن موقع...",
    noResults: "لا توجد نتائج",
    noResultsDesc: "لا يوجد موقع يطابق بحثك",
    publishedSites: "المواقع المنشورة",
    devSites: "المواقع قيد التطوير",
    // Sidebar
    sidebarSites: "المواقع",
    sidebarCreateSite: "إنشاء موقع",
    sidebarLibrary: "مكتبة المكونات",
    sidebarTeam: "الفريق",
    sidebarDomains: "النطاقات",
    sidebarSettings: "الإعدادات",
    // ProjectCard
    projectCardDeployed: "منشور",
    projectCardDev: "قيد التطوير",
    projectCardChecking: "جاري التحقق...",
    projectCardClickPreview: "انقر للمعاينة",
  },
  hi: {
    title: "मेरी साइटें",
    newSite: "नई साइट",
    loading: "साइटें लोड हो रही हैं...",
    noSites: "कोई साइट नहीं",
    noSitesDesc: "अपनी पहली साइट बनाकर शुरू करें",
    createSite: "साइट बनाएं",
    searchPlaceholder: "साइट खोजें...",
    noResults: "कोई परिणाम नहीं",
    noResultsDesc: "कोई साइट आपकी खोज से मेल नहीं खाती",
    publishedSites: "प्रकाशित साइटें",
    devSites: "विकास में साइटें",
    // Sidebar
    sidebarSites: "साइटें",
    sidebarCreateSite: "साइट बनाएं",
    sidebarLibrary: "कंपोनेंट लाइब्रेरी",
    sidebarTeam: "टीम",
    sidebarDomains: "डोमेन",
    sidebarSettings: "सेटिंग्स",
    // ProjectCard
    projectCardDeployed: "प्रकाशित",
    projectCardDev: "विकास में",
    projectCardChecking: "जांच रहा है...",
    projectCardClickPreview: "पूर्वावलोकन के लिए क्लिक करें",
  },
  fr: {
    title: "Mes Sites",
    newSite: "Nouveau Site",
    loading: "Chargement des sites...",
    noSites: "Aucun site",
    noSitesDesc: "Commencez par créer votre premier site",
    createSite: "Créer un site",
    searchPlaceholder: "Rechercher un site...",
    noResults: "Aucun résultat",
    noResultsDesc: "Aucun site ne correspond à votre recherche",
    publishedSites: "Sites Publiés",
    devSites: "Sites en Développement",
    // Sidebar
    sidebarSites: "Sites",
    sidebarCreateSite: "Créer un site",
    sidebarLibrary: "Librairie de bandes",
    sidebarTeam: "Équipe",
    sidebarDomains: "Domaines",
    sidebarSettings: "Paramètres",
    // ProjectCard
    projectCardDeployed: "Déployé",
    projectCardDev: "Développement",
    projectCardChecking: "Vérification...",
    projectCardClickPreview: "Cliquer pour aperçu",
  },
};

export const useTranslations = () => {
  const [currentLanguage, setCurrentLanguage] = useState('fr');

  useEffect(() => {
    // Détecter la langue actuelle depuis les classes CSS
    const detectLanguage = () => {
      const bodyClasses = document.body.className;
      for (const langCode of Object.keys(translations)) {
        if (bodyClasses.includes(`language-${langCode}`)) {
          setCurrentLanguage(langCode);
          return;
        }
      }
      setCurrentLanguage('fr'); // Par défaut
    };

    detectLanguage();

    // Observer les changements de classes sur le body
    const observer = new MutationObserver(detectLanguage);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const t = (key: keyof typeof translations.fr) => {
    const langTranslations = translations[currentLanguage as keyof typeof translations];
    return langTranslations?.[key] || translations.fr[key] || key;
  };

  return { t, currentLanguage };
};
