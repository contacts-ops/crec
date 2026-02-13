import { useState, useEffect } from 'react';

// Nouveau mapping des statuts d'affichage simplifié
// - "deployed": un repository GitLab existe
// - "dev": aucun repository GitLab
export type ProjectStatus = "deployed" | "dev";

interface GitLabStatusResponse {
  hasGitLabRepository: boolean;
  gitlabProject: {
    id: number;
    name: string;
    web_url: string;
  } | null;
  currentStatus: string;
  suggestedStatus: ProjectStatus;
}

interface UseGitLabStatusProps {
  siteId: string;
  initialStatus: ProjectStatus;
}

export const useGitLabStatus = ({ siteId, initialStatus }: UseGitLabStatusProps) => {
  const [status, setStatus] = useState<ProjectStatus>(initialStatus);
  const [isChecking, setIsChecking] = useState(false);
  const [hasGitLabRepository, setHasGitLabRepository] = useState(false);
  const [gitlabProject, setGitLabProject] = useState<GitLabStatusResponse['gitlabProject']>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGitLabStatus = async () => {
      setIsChecking(true);
      setError(null);

      try {
        // Récupérer le token GitLab depuis le localStorage
        const saved = localStorage.getItem("userSettings");
        let gitlabToken = "";
        let gitlabGroupId = "88854306";

        if (saved) {
          const settings = JSON.parse(saved);
          gitlabToken = settings.gitlabToken || "";
          gitlabGroupId = settings.gitlabGroupId || "88854306";
        }

        if (!gitlabToken) {
          // Pas de token => par défaut en développement
          setStatus('dev');
          setHasGitLabRepository(false);
          return;
        }

        // Appeler l'API pour vérifier le statut GitLab
        // L'API vérifie automatiquement tous les groupes GitLab possibles
        const response = await fetch(
          `/api/sites/check-gitlab-status/${siteId}?gitlabToken=${encodeURIComponent(gitlabToken)}`
        );

        if (response.ok) {
          const data: GitLabStatusResponse = await response.json();
          // Règle simplifiée: Déployé si repo GitLab, Dev sinon
          const computedStatus: ProjectStatus = data.hasGitLabRepository ? 'deployed' : 'dev';
          console.log(`🔍 Hook GitLab Status pour ${siteId}: ${data.hasGitLabRepository ? 'DÉPLOYÉ' : 'DÉVELOPPEMENT'}`);
          setStatus(computedStatus);
          setHasGitLabRepository(data.hasGitLabRepository);
          setGitLabProject(data.gitlabProject);
        } else {
          // En cas d'erreur réseau, fallback en développement
          setStatus('dev');
          setHasGitLabRepository(false);
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.error || 'Erreur lors de la vérification du statut GitLab');
        }
             } catch (error) {
         console.error("Erreur lors de la vérification du statut GitLab:", error);
         // Fallback local: par défaut en développement
         setStatus('dev');
         setHasGitLabRepository(false);
         setError('Erreur de connexion lors de la vérification du statut GitLab');
       } finally {
        setIsChecking(false);
      }
    };

    checkGitLabStatus();
  }, [siteId, initialStatus]);

  return {
    status,
    isChecking,
    hasGitLabRepository,
    gitlabProject,
    error
  };
};
