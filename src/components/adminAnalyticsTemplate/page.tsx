"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Users,
  Eye,
  MousePointer,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Smartphone,
  Monitor,
  Search,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  MoreVertical,
  Plus,
  ArrowUpDown,
  Target,
  Zap,
  BarChart,
  PieChart,
  LineChart,
  MapPin,
  AlertCircle,
  Settings,
  CheckCircle,
  XCircle
} from "lucide-react";

interface AdminAnalyticsTemplateProps {
  siteId?: string;
  editableElements?: {
    [key: string]: string;
  };
}

interface AnalyticsData {
  realtime: {
    currentVisitors: number;
    pageViews: number;
    sessions: number;
    bounceRate: number;
  };
  overview: {
    totalVisitors: number;
    totalPageViews: number;
    totalSessions: number;
    averageSessionDuration: number;
  };
  visitors: {
    new: number;
    returning: number;
    total: number;
  };
  devices: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  topPages: Array<{
    path: string;
    views: number;
    uniqueViews: number;
    bounceRate: number;
  }>;
  trafficSources: Array<{
    source: string;
    sessions: number;
    percentage: number;
  }>;
  hourlyData: Array<{
    hour: string;
    visitors: number;
    pageViews: number;
  }>;
  dailyData: Array<{
    date: string;
    visitors: number;
    pageViews: number;
    sessions: number;
  }>;
}

interface AnalyticsStats {
  totalVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
}

interface PostHogConfig {
  isConfigured: boolean;
  publicKey?: string | null;
  projectId?: string | null;
  host?: string;
}

export default function AdminAnalyticsTemplate({
  siteId,
  editableElements = {}
}: AdminAnalyticsTemplateProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<AnalyticsStats>({
    totalVisitors: 0,
    totalPageViews: 0,
    totalSessions: 0,
    averageSessionDuration: 0,
    bounceRate: 0,
    conversionRate: 0
  });
  const [error, setError] = useState<string>("");
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [selectedMetric, setSelectedMetric] = useState<string>("visitors");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [phConfig, setPhConfig] = useState<PostHogConfig>({
    isConfigured: false,
    publicKey: null,
    projectId: null,
    host: undefined
  });
  const itemsPerPage = 10;

  // Charger la configuration PostHog
  useEffect(() => {
    const loadPHConfig = async () => {
      try {
        const response = await fetch(`/api/analytics/${siteId}/posthog/config`);
        if (response.ok) {
          const config = await response.json();
          setPhConfig(config);
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la configuration:", error);
      }
    };

    if (siteId) {
      loadPHConfig();
    }
  }, [siteId]);
  // Fonction pour récupérer les données d'analytics (PostHog)
  const fetchAnalyticsData = async () => {
    if (!siteId || !phConfig.isConfigured) return;
    
    setIsLoading(true);
    setError("");
    try {
      const phResponse = await fetch(`/api/analytics/${siteId}/posthog/insights?timeRange=${timeRange}`, { cache: 'no-store' as RequestCache, headers: { 'Cache-Control': 'no-store' } as any });
      if (phResponse.ok) {
        const phData = await phResponse.json();
        if (phData.success && phData.data) {
          const d = phData.data;
          const combinedData: AnalyticsData = {
            realtime: d.realtime || { currentVisitors: NaN as any, pageViews: NaN as any, sessions: NaN as any, bounceRate: NaN as any },
            overview: d.overview || { totalVisitors: NaN as any, totalPageViews: NaN as any, totalSessions: NaN as any, averageSessionDuration: NaN as any },
            visitors: {
              new: (d.visitors?.new as any) ?? (NaN as any),
              returning: (d.visitors?.returning as any) ?? (NaN as any),
              total: (d.overview?.totalVisitors as any) ?? (d.visitors?.total as any) ?? (NaN as any),
            },
            devices: (d.devices as any) || ({ desktop: NaN as any, mobile: NaN as any, tablet: NaN as any } as any),
            topPages: (d.topPages || []).map((p: any) => ({
              path: p.path,
              views: p.views,
              uniqueViews: p.uniqueViews ?? p.views,
              bounceRate: p.bounceRate ?? 0,
            })),
            trafficSources: d.trafficSources || [],
            hourlyData: d.hourlyData || [],
            dailyData: d.dailyData || [],
          };
          setAnalyticsData(combinedData);
          setStats({
            totalVisitors: combinedData.overview.totalVisitors as any,
            totalPageViews: combinedData.overview.totalPageViews as any,
            totalSessions: combinedData.overview.totalSessions as any,
            averageSessionDuration: combinedData.overview.averageSessionDuration as any,
            bounceRate: combinedData.realtime.bounceRate as any,
            conversionRate: 0,
          });
        } else {
          setError(phData.error || 'Erreur lors du chargement des données');
        }
      } else {
        // Gestion des erreurs HTTP
        const errorData = await phResponse.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || `Erreur HTTP ${phResponse.status}`;
        setError(`Erreur serveur: ${errorMessage}`);
        console.error("Erreur API PostHog:", {
          status: phResponse.status,
          statusText: phResponse.statusText,
          error: errorData
        });
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Erreur lors de la récupération des données:", error);
      setError(`Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // plus de données simulées; on ne charge que PostHog

  // Fonction pour activer PostHog (création du projet)
  const enablePostHog = async () => {
    if (!siteId) return;
    setIsLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/analytics/${siteId}/posthog/project`, { method: 'POST' });
      const j = await r.json();
      if (j.success) {
        setPhConfig({ isConfigured: true, publicKey: j.publicKey, projectId: j.projectId, host: phConfig.host });
        setShowConfigModal(false);
        await fetchAnalyticsData();
      } else {
        setError(j.error || 'Échec de l\'activation');
      }
    } catch (e) {
      setError('Erreur lors de l\'activation');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour formater la durée
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fonction pour formater les nombres
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) {
      return '???';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Fonction pour formater le pourcentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Générer un sparkline SVG path (0..W x 0..H)
  const buildSparklinePath = (points: number[], width: number, height: number) => {
    if (!points || points.length === 0) return '';
    const max = Math.max(...points);
    const min = Math.min(...points);
    const range = Math.max(1, max - min);
    const stepX = points.length > 1 ? width / (points.length - 1) : width;
    const path: string[] = [];
    points.forEach((v, i) => {
      const x = Math.round(i * stepX);
      const y = Math.round(height - ((v - min) / range) * height);
      path.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
    });
    return path.join(' ');
  };

  // Fonction pour obtenir la couleur selon la tendance
  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return "text-green-600";
    if (current < previous) return "text-red-600";
    return "text-gray-600";
  };

  // Fonction pour obtenir l'icône selon la tendance
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4" />;
    if (current < previous) return <TrendingDown className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  // Rafraîchissement périodique (désactivé si non configuré)
  useEffect(() => {
    fetchAnalyticsData();
    if (autoRefresh && phConfig.isConfigured) {
      const interval = setInterval(() => {
        fetchAnalyticsData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [siteId, timeRange, autoRefresh, phConfig.isConfigured]);
  // Fonction pour rafraîchir manuellement
  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  // Fonction pour exporter les données
  const handleExport = () => {
    if (!analyticsData) return;
    
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${siteId}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filtrer les données selon le terme de recherche
  const filteredTopPages = analyticsData?.topPages?.filter(page =>
    page.path.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredTrafficSources = analyticsData?.trafficSources?.filter(source =>
    source.source.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Pagination
  const totalPages = Math.ceil(filteredTopPages.length / itemsPerPage);
  const startIndex = 0;
  const endIndex = startIndex + itemsPerPage;
  const currentTopPages = filteredTopPages.slice(startIndex, endIndex);
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {editableElements["analytics-title"] || "Analytics en Temps Réel"}
              </h2>
              <p className="text-gray-600">
                {editableElements["analytics-subtitle"] || "Suivez les performances de votre site en temps réel"}
              </p>
            </div>
            
            {/* Configuration PostHog */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                phConfig.isConfigured 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {phConfig.isConfigured ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span>
                  {phConfig.isConfigured ? 'configuré' : 'non configuré'}
                </span>
              </div>
              
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
              >
                <Settings className="w-4 h-4" />
                {phConfig.isConfigured ? 'Configurer' : 'Activer'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-red-800 font-medium mb-1">Erreur lors du chargement des données</h4>
                <p className="text-red-700 text-sm mb-3">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm transition-colors"
                  >
                    Réessayer
                  </button>
                  <button
                    onClick={() => setError("")}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors"
                  >
                    Masquer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Si PostHog non configuré: écran minimal */}
        {!phConfig.isConfigured ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-700 mb-4">L'analyse n'est pas encore configurée pour ce site.</p>
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Activer l'analyse
            </button>
          </div>
        ) : isLoading ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6 text-gray-600 animate-spin mr-2" />
              <span className="text-gray-700">Chargement des données d'analyse...</span>
            </div>
            <p className="text-sm text-gray-500">Cela peut prendre quelques secondes</p>
          </div>
        ) : (
        <>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Visitors (uniques) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Visiteurs (uniques)</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalVisitors)}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Page Views */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pages Vues</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData?.overview?.totalPageViews)}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Remplacement Sessions -> Visiteurs (quotidien total) */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Visiteurs (période)</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(analyticsData?.visitors?.total)}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Bounce Rate */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Taux d'Erreurs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPercentage(analyticsData?.realtime?.bounceRate || 0)}
                </p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Controls allégés
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex items-center gap-3">
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600">Période:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="1d">Dernier jour</option>
              <option value="7d">7 jours</option>
              <option value="30d">30 jours</option>
              <option value="90d">90 jours</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        */}

        {/* Tendances (graphiques) */}
        <div className="space-y-6 mb-6">
          {/* Pages vues par jour */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Pages vues par jour</h3>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Période:</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="1d">Dernier jour</option>
                  <option value="7d">7 jours</option>
                  <option value="30d">30 jours</option>
                  <option value="90d">90 jours</option>
                </select>
              </div>
            </div>
            <div className="p-4">
              {(() => {
                const pv = (analyticsData?.dailyData || []).map(d => d.pageViews || 0);
                const w = 600, h = 120;
                const path = buildSparklinePath(pv, w, h);
                return (
                  <svg width={w} height={h} className="w-full h-32">
                    <path d={path} fill="none" stroke="#2563eb" strokeWidth="2" />
                  </svg>
                );
              })()}
            </div>
          </div>

          {/* Visiteurs par jour */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Visiteurs par jour</h3>
            </div>
            <div className="p-4">
              {(() => {
                const vv = (analyticsData?.dailyData || []).map(d => d.visitors || 0);
                const w = 600, h = 120;
                const path = buildSparklinePath(vv, w, h);
                return (
                  <svg width={w} height={h} className="w-full h-32">
                    <path d={path} fill="none" stroke="#16a34a" strokeWidth="2" />
                  </svg>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="space-y-6">
          {/* Répartition des visiteurs */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Répartition des Visiteurs
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Nouveaux visiteurs</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatNumber(analyticsData?.visitors?.new || 0)}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-gray-600" />
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Visiteurs récurrents</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatNumber(analyticsData?.visitors?.returning || 0)}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {formatNumber(analyticsData?.visitors?.total || 0)}
                      </p>
                    </div>
                    <Globe className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Répartition par appareils */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Répartition par Appareils
              </h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const d = analyticsData?.devices;
                  const total = (d?.desktop || 0) + (d?.mobile || 0) + (d?.tablet || 0);
                  const pct = (n: number | undefined) => {
                    if (!total) return '???';
                    return `${Math.round(((n || 0) / total) * 100)}%`;
                  };
                  return (
                    <>
                      <div className="flex items-center">
                        <Monitor className="h-8 w-8 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Ordinateur</p>
                          <p className="text-xl font-semibold text-gray-900">{pct(d?.desktop)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Smartphone className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Mobile</p>
                          <p className="text-xl font-semibold text-gray-900">{pct(d?.mobile)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Monitor className="h-8 w-8 text-purple-600 mr-3" />
                        <div>
                          <p className="text-sm text-gray-600">Tablette</p>
                          <p className="text-xl font-semibold text-gray-900">{pct(d?.tablet)}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Pages les plus visitées */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Pages les Plus Visitées ({filteredTopPages.length})
                {isLoading && <span className="text-sm text-gray-500 ml-2">- Chargement...</span>}
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {currentTopPages.map((page, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{page.path}</h4>
                          <p className="text-sm text-gray-500">
                            {formatNumber(page.views)} vues
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">&nbsp;</p>
                      <p className="text-xs text-gray-500">&nbsp;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredTopPages.length === 0 && !isLoading && (
              <div className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune page trouvée</p>
              </div>
            )}
          </div>

          {/* Sources de trafic */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Sources de Trafic ({filteredTrafficSources.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredTrafficSources.map((source, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                        <Globe className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{source.source}</h4>
                        <p className="text-sm text-gray-500">
                          {formatNumber(source.sessions)} sessions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatPercentage(source.percentage)}
                      </p>
                      <p className="text-xs text-gray-500">Part du trafic</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredTrafficSources.length === 0 && !isLoading && (
              <div className="p-8 text-center">
                <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucune source de trafic trouvée</p>
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>

      {/* Modal de configuration PostHog */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {phConfig.isConfigured ? 'Configuration' : 'Activer l\'analyse'}
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {phConfig.isConfigured ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-800">
                    Identifiant du projet: <span className="font-medium">{phConfig.projectId || 'inconnu'}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Ce site est déjà correctement configuré.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-800">
                    Cliquez sur "Activer" pour commencer l'enregistrement des données.
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    Le site sera configuré automatiquement.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              {phConfig.isConfigured ? (
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                >
                  Fermer
                </button>
              ) : (
                <button
                  onClick={enablePostHog}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading ? 'Activation...' : 'Activer'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 