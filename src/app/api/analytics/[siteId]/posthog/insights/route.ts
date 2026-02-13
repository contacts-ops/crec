import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ siteId: string }> }
) {
  try {
    // Désactiver tout cache côté edge/server
    (request as any).headers?.set?.('Cache-Control', 'no-store');
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '7d';

    const { siteId } = await context.params;
    const site = await Site.findOne({ siteId });
    if (!site) {
      return NextResponse.json({ error: 'Site non trouvé' }, { status: 404 });
    }

    const cfg = site.analytics?.posthog;
    const globalProjectId = process.env.POSTHOG_PROJECT_ID;
    const globalPublicKey = process.env.POSTHOG_PUBLIC_KEY;
    
    if (!cfg?.isConfigured && (!globalProjectId || !globalPublicKey)) {
      return NextResponse.json({ error: 'PostHog non configuré', fallback: true }, { status: 200 });
    }

    const host = process.env.POSTHOG_HOST;
    const adminKey = process.env.POSTHOG_PERSONAL_API_KEY;
    const projectId = cfg.projectId || process.env.POSTHOG_PROJECT_ID;
    
    if (!host || !adminKey || !projectId) {
      return NextResponse.json({ error: 'Config PostHog manquante (POSTHOG_HOST/POSTHOG_PERSONAL_API_KEY/POSTHOG_PROJECT_ID)' }, { status: 500 });
    }

    // Map timeRange to PostHog date_from
    const days = timeRange === '1d' ? 1 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 7;
    const dateFromAbsolute = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dateFromTrends = timeRange === '1d' ? '-24h' : dateFromAbsolute;

    // Trends: $pageview per day filtré par site_id
    const trendsEndpoint = `${host}/api/projects/${projectId}/insights/trend/`;
    const baseTrendsBody = {
      date_from: dateFromTrends,
      events: [{ 
        id: '$pageview', 
        name: '$pageview', 
        type: 'events',
        properties: [
          {
            key: 'site_id',
            value: siteId,
            operator: 'exact'
          }
        ]
      }],
      interval: 'day',
    };

    // Pageviews series (daily)
    const resp = await fetch(trendsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminKey}`,
      },
      body: JSON.stringify(baseTrendsBody),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return NextResponse.json({ error: 'PostHog insights failed', details: txt }, { status: 500 });
    }

    const data = await resp.json();

    // Basic mapping
    const results = data?.result || data?.results || [];
    let totalPageViews = 0;
    const dailyData: Array<{ date: string; pageViews: number; visitors: number; sessions: number }> = [];
    if (Array.isArray(results) && results[0]?.data && results[0]?.days) {
      const series = results[0];
      series.data.forEach((count: number, idx: number) => {
        totalPageViews += count || 0;
        const date = series.days[idx];
        dailyData.push({ date, pageViews: count || 0, visitors: 0, sessions: 0 });
      });
    }

    // Additional metrics via Trends breakdowns or HogQL fallback
    const daysMap: Record<string, string> = { '1d': '1', '7d': '7', '30d': '30', '90d': '90' };
    const daysForHogQL = daysMap[timeRange] || '7';
    const siteFilterClause = `AND properties.site_id = '${siteId}'`;
    
    // Filtre pour exclure localhost et hub.majoli.io dans les requêtes HogQL
    const excludeDevDomainsClause = `AND properties.$current_url NOT LIKE '%localhost%' AND properties.$current_url NOT LIKE '%hub.majoli.io%'`;

    // Top pages
    let topPages: Array<{ path: string; views: number; uniqueViews: number; bounceRate: number }> = [];
    {
      const bodyTopPages: any = {
        ...baseTrendsBody,
        breakdown: '$current_url',
        breakdown_type: 'event',
      };
      const respTop = await fetch(trendsEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify(bodyTopPages),
      });
      if (respTop.ok) {
        const t = await respTop.json();
        const series = t?.result || t?.results || [];
        // Support multiple shapes
        const items: Array<{ label: string; value: number }> = [];
        series.forEach((s: any) => {
          const label = s?.label || s?.breakdown_value || s?.series_name || s?.breakdown || s?.display_name || s?.action?.name || s?.entity?.name;
          const value = (Array.isArray(s?.data) ? s.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0) : (s?.count || s?.aggregated_value || 0));
          if (label) items.push({ label: String(label), value: Number(value) || 0 });
        });
        items.sort((a, b) => b.value - a.value);
        // Filtrer les pages pour exclure localhost et hub.majoli.io
        const filteredItems = items.filter(item => 
          !item.label.includes('localhost') && 
          !item.label.includes('hub.majoli.io')
        );
        topPages = filteredItems.slice(0, 10).map((i) => ({ path: i.label, views: i.value, uniqueViews: i.value, bounceRate: 0 }));
      }
    }

    // Unique visitors
    let totalVisitors: number | null = null;
    {
      const tryVisitors = async (math: string) => {
        const bodyVisitors: any = { ...baseTrendsBody, events: [{ ...baseTrendsBody.events[0], math }] };
        const respVisitors = await fetch(trendsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify(bodyVisitors) });
        if (!respVisitors.ok) return false;
        const v = await respVisitors.json();
        const seriesArr = (v?.result || v?.results || []) as any[];
        const vSeries = Array.isArray(seriesArr) ? seriesArr[0] : null;
        const seriesData = vSeries?.data as number[] | undefined;
        const seriesDays = vSeries?.days as string[] | undefined;
        if (Array.isArray(seriesData)) {
          const sum = seriesData.reduce((a: number, b: number) => a + (Number(b) || 0), 0);
          totalVisitors = Number(sum);
          if (Array.isArray(seriesDays) && seriesDays.length === seriesData.length) {
            seriesData.forEach((val: number, idx: number) => {
              const d = seriesDays[idx];
              const row = dailyData.find((r) => r.date === d);
              if (row) row.visitors = Number(val) || 0;
            });
          }
          return true;
        }
        return false;
      };
      // Try DAU then unique_users
      const gotDau = await tryVisitors('dau');
      if (!gotDau) {
        await tryVisitors('unique_users');
      }
    }

    // Remplacer par un distinct global sur la période (aligne avec le dashboard)
    {
      const hogqlEndpoint = `${host}/api/projects/${projectId}/query/`;
      const hogqlVisitors = `
        SELECT uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          ${siteFilterClause}
          ${excludeDevDomainsClause}
          AND toDate(timestamp) >= toDate(now() - INTERVAL ${daysForHogQL} DAY)
      `;
      
      // Fallback sans filtrage des domaines de dev en cas d'erreur
      const hogqlVisitorsFallback = `
        SELECT uniq(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          ${siteFilterClause}
          AND toDate(timestamp) >= toDate(now() - INTERVAL ${daysForHogQL} DAY)
      `;
      let visitorsResp = await fetch(hogqlEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogqlVisitors } }),
      });
      
      // Fallback si la requête avec filtrage échoue
      if (!visitorsResp.ok) {
        const errorText = await visitorsResp.text().catch(() => 'Unknown error');
        console.log('⚠️ Requête HogQL avec filtrage échouée:', {
          status: visitorsResp.status,
          error: errorText,
          query: hogqlVisitors,
          siteId: siteId
        });
        console.log('⚠️ Tentative sans filtrage...');
        visitorsResp = await fetch(hogqlEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` },
          body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogqlVisitorsFallback } }),
        });
      }
      
      if (visitorsResp.ok) {
        const visitorsData = await visitorsResp.json();
        const v = visitorsData?.results?.[0]?.[0] ?? visitorsData?.result?.[0]?.[0] ?? null;
        if (v != null) totalVisitors = Number(v) || 0;
      }
    }

    // Nouveaux visiteurs et récurrents via HogQL (min(timestamp) global)
    let newVisitors: number | null = null;
    let returningVisitors: number | null = null;
    {
      const hogqlEndpoint = `${host}/api/projects/${projectId}/query/`;
      const hogqlNewVisitors = `
        WITH window_start AS toDate(now() - INTERVAL ${daysForHogQL} DAY)
        SELECT uniq(e.distinct_id) AS new_visitors
        FROM events e
        WHERE e.event = '$pageview'
          ${siteFilterClause}
          ${excludeDevDomainsClause}
          AND toDate(e.timestamp) >= window_start
          AND e.distinct_id IN (
            SELECT distinct_id
            FROM events
            WHERE event = '$pageview' ${siteFilterClause} ${excludeDevDomainsClause}
            GROUP BY distinct_id
            HAVING toDate(min(timestamp)) >= window_start
          )
      `;
      const respNew = await fetch(hogqlEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogqlNewVisitors } }) });
      if (respNew.ok) {
        const d = await respNew.json();
        const v = d?.results?.[0]?.[0] ?? d?.result?.[0]?.[0] ?? null;
        if (v != null) newVisitors = Number(v) || 0;
      }
      if (totalVisitors != null && newVisitors != null) {
        returningVisitors = Math.max(0, Number(totalVisitors) - Number(newVisitors));
      }
    }

    // Sessions (basé sur $session_id si dispo)
    // Sessions approx (sessionisation 30min), bounce rate, avg session duration via HogQL
    let totalSessions: number | null = null;
    let bounceRate: number | null = null;
    let averageSessionDuration: number | null = null;
    // Sessions (priorité: $session_id distinct global)
    {
      const hogqlEndpoint = `${host}/api/projects/${projectId}/query/`;
      const hogqlSessionsId = `
        SELECT uniq(properties['$session_id']) AS sessions
        FROM events
        WHERE event = '$pageview'
          ${siteFilterClause}
          ${excludeDevDomainsClause}
          AND toDate(timestamp) >= toDate(now() - INTERVAL ${daysForHogQL} DAY)
          AND notEmpty(properties['$session_id'])
      `;
      const respSessId = await fetch(hogqlEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogqlSessionsId } }) });
      if (respSessId.ok) {
        const d = await respSessId.json();
        const v = d?.results?.[0]?.[0] ?? d?.result?.[0]?.[0] ?? null;
        if (v != null) totalSessions = Number(v) || 0;
      }

      // Fallback: sessionisation 30 min
      // Sessionisation 30 min sans dépendre de $session_id
      const hogqlSessionsAgg = `
        WITH 
          toInt32(intDiv(toUnixTimestamp(timestamp), 1800)) AS bucket,
          concat(distinct_id, '-', toString(bucket)) AS session_key
        SELECT
          uniq(session_key) AS sessions,
          avgIf(session_duration, session_events > 1) AS avg_duration,
          sum(if(session_events = 1, 1, 0)) / count() AS bounce_rate
        FROM (
          SELECT
            session_key,
            min(timestamp) AS min_t,
            max(timestamp) AS max_t,
            count() AS session_events,
            dateDiff('second', min_t, max_t) AS session_duration
          FROM (
            SELECT *, toInt32(intDiv(toUnixTimestamp(timestamp), 1800)) AS bucket,
                   concat(distinct_id, '-', toString(bucket)) AS session_key
            FROM events
            WHERE event = '$pageview'
              ${siteFilterClause}
              ${excludeDevDomainsClause}
              AND toDate(timestamp) >= toDate(now() - INTERVAL ${daysForHogQL} DAY)
          )
          GROUP BY session_key
        )
      `;
      const respSess = await fetch(hogqlEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogqlSessionsAgg } }) });
      if (respSess.ok) {
        const d = await respSess.json();
        const row = d?.results?.[0] || d?.result?.[0];
        if (row) {
          if (totalSessions == null) totalSessions = Number(row[0] ?? 0);
          averageSessionDuration = row[1] != null ? Math.round(Number(row[1])) : null;
          bounceRate = row[2] != null ? Math.round(Number(row[2]) * 100) : null;
        }
      }
    }

    // Traffic sources (referring domain)
    let trafficSources: Array<{ source: string; sessions: number; percentage: number }> = [];
    {
      const bodySources: any = { ...baseTrendsBody, breakdown: '$referring_domain', breakdown_type: 'event' };
      const respSources = await fetch(trendsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify(bodySources) });
      if (respSources.ok) {
        const s = await respSources.json();
        const series = s?.result || s?.results || [];
        const items: Array<{ label: string; value: number }> = [];
        series.forEach((it: any) => {
          const label = it?.label || it?.breakdown_value || it?.breakdown || 'Direct';
          const value = (Array.isArray(it?.data) ? it.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0) : (it?.count || it?.aggregated_value || 0));
          let mapped = String(label || 'Direct');
          if (mapped === '$direct') mapped = 'Direct';
          items.push({ label: mapped, value: Number(value) || 0 });
        });
        items.sort((a, b) => b.value - a.value);
        // Filtrer les sources de trafic pour exclure localhost et hub.majoli.io
        const filteredSources = items.filter(item => 
          !item.label.includes('localhost') && 
          !item.label.includes('hub.majoli.io')
        );
        const total = filteredSources.reduce((s, r) => s + r.value, 0) || 0;
        trafficSources = filteredSources.slice(0, 10).map((i) => ({ source: i.label, sessions: i.value, percentage: total ? Math.round((i.value / total) * 100) : 0 }));
      }
    }

    // Devices (device type)
    const devicesAgg = { desktop: 0, mobile: 0, tablet: 0 } as { [k: string]: number };
    {
      const bodyDevices: any = { ...baseTrendsBody, breakdown: '$device_type', breakdown_type: 'event' };
      const respDevices = await fetch(trendsEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminKey}` }, body: JSON.stringify(bodyDevices) });
      if (respDevices.ok) {
        const d = await respDevices.json();
        const series = d?.result || d?.results || [];
        series.forEach((it: any) => {
          const label: string = String(it?.label || it?.breakdown_value || it?.breakdown || 'unknown').toLowerCase();
          const value = (Array.isArray(it?.data) ? it.data.reduce((a: number, b: number) => a + (Number(b) || 0), 0) : (it?.count || it?.aggregated_value || 0));
          const count = Number(value) || 0;
          if (label.includes('desktop')) devicesAgg.desktop += count;
          else if (label.includes('mobile') || label.includes('phone')) devicesAgg.mobile += count;
          else if (label.includes('tablet')) devicesAgg.tablet += count;
        });
      }
    }

    // Calculer les métriques filtrées en excluant les données de localhost/hub.majoli.io
    const filteredTotalPageViews = topPages.reduce((sum, page) => sum + page.views, 0);
    const filteredTotalSessions = trafficSources.reduce((sum, source) => sum + source.sessions, 0);
    
    // Ajuster les métriques globales avec les données filtrées
    const adjustedOverview = {
      totalVisitors: totalVisitors === null ? null : Number(totalVisitors) || 0,
      totalPageViews: filteredTotalPageViews, // Utiliser les pages vues filtrées
      totalSessions: filteredTotalSessions, // Utiliser les sessions filtrées
      averageSessionDuration,
    };

    const res = NextResponse.json({
      success: true,
      data: {
        overview: adjustedOverview,
        dailyData,
        topPages,
        trafficSources,
        devices: devicesAgg,
        realtime: { currentVisitors: null as any, pageViews: null as any, sessions: null as any, bounceRate: (bounceRate === null ? null : Number(bounceRate)) as any },
        visitors: { new: (newVisitors === null ? null : Number(newVisitors)) as any, returning: (returningVisitors === null ? null : Number(returningVisitors)) as any, total: (totalVisitors === null ? null : Number(totalVisitors)) as any },
      },
      debug: { 
        filteredBySite: true, 
        projectId, 
        siteId, 
        timeRange, 
        totalPageViews: filteredTotalPageViews, // Utiliser les pages vues filtrées
        topPagesCount: topPages.length, 
        totalVisitors, 
        totalSessions: filteredTotalSessions, // Utiliser les sessions filtrées
        originalTotalPageViews: totalPageViews, // Garder l'original pour debug
        filtered: true // Indique que les données sont filtrées
      },
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des insights PostHog:', error);
    console.error('❌ Détails de l\'erreur:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      siteId: (await context.params).siteId
    });
    return NextResponse.json({ 
      error: 'Erreur PostHog', 
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        siteId: (await context.params).siteId,
        hasPostHogConfig: !!(process.env.POSTHOG_HOST && process.env.POSTHOG_PERSONAL_API_KEY && process.env.POSTHOG_PROJECT_ID)
      }
    }, { status: 500 });
  }
}


