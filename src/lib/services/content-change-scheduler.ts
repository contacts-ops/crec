import { connectToDatabase } from "@/lib/db";

type TimerHandle = ReturnType<typeof setTimeout> | null;

class ContentChangeScheduler {
  private timersBySite: Map<string, TimerHandle> = new Map();
  private readonly delayMs: number;

  constructor(delayMinutes: number = 1) {
    this.delayMs = delayMinutes * 60 * 1000;
  }

  public onContentChanged = (siteId: string) => {
    if (!siteId) return;

    const existing = this.timersBySite.get(siteId);
    if (existing) {
      clearTimeout(existing as NonNullable<TimerHandle>);
    }

    const handle = setTimeout(async () => {
      try {
        await this.triggerDeploy(siteId);
      } catch (error) {
        console.error("❌ Échec du déploiement planifié:", error);
      } finally {
        this.timersBySite.delete(siteId);
      }
    }, this.delayMs);

    this.timersBySite.set(siteId, handle);
  };

  private async triggerDeploy(siteId: string) {
    // Résoudre l'URL de base pour appeler l'API interne
    const baseUrl =
      process.env.INTERNAL_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    const gitlabToken = process.env.GITLAB_TOKEN || "";
    const gitlabGroupId = process.env.GITLAB_GROUP_ID || "88854306";

    // Assure la connexion DB avant appel (si l'API l'exige ou pour warm-up)
    try {
      await connectToDatabase();
    } catch {}

    const res = await fetch(`${baseUrl}/api/export-site/gitlab`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Permettre l'appel interne sans cookie si INTERNAL_EXPORT_KEY est configurée
        ...(process.env.INTERNAL_EXPORT_KEY
          ? { "x-internal-export-key": process.env.INTERNAL_EXPORT_KEY }
          : {}),
      },
      body: JSON.stringify({ siteId, gitlabToken, gitlabGroupId }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Export GitLab échoué (HTTP ${res.status}) pour site ${siteId}: ${text}`
      );
    }
  }
}

// Singleton
const globalForScheduler = global as unknown as { __contentChangeScheduler?: ContentChangeScheduler };
export const contentChangeScheduler =
  globalForScheduler.__contentChangeScheduler ||
  (globalForScheduler.__contentChangeScheduler = new ContentChangeScheduler(1));


