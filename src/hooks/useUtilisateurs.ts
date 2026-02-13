import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'editor' | 'viewer' | 'user';
  status: 'active' | 'inactive' | 'pending';
  phone?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  permissions: string[];
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  pending: number;
  byRole: Record<string, number>;
  recentLogins: number;
}

interface UseUtilisateursReturn {
  users: User[];
  stats: UserStats;
  isLoading: boolean;
  error: string | null;
  createUser: (userData: Partial<User>) => Promise<boolean>;
  updateUser: (userId: string, userData: Partial<User>) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
}

export function useUtilisateurs(siteId?: string): UseUtilisateursReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    byRole: {},
    recentLogins: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = (usersList: User[]): UserStats => {
    const stats: UserStats = {
      total: usersList.length,
      active: usersList.filter(u => u.status === 'active').length,
      inactive: usersList.filter(u => u.status === 'inactive').length,
      pending: usersList.filter(u => u.status === 'pending').length,
      byRole: {},
      recentLogins: usersList.filter(u => {
        if (!u.lastLogin) return false;
        const lastLogin = new Date(u.lastLogin);
        const now = new Date();
        const diffDays = (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }).length
    };

    // Calculer les statistiques par rôle
    usersList.forEach(user => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
    });

    return stats;
  };

  const fetchUsers = async () => {
    if (!siteId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sharedServices/utilisateurs?siteId=${siteId}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setStats(data.stats || calculateStats(data.users || []));
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des utilisateurs:', err);
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (userData: Partial<User>): Promise<boolean> => {
    if (!siteId) return false;

    try {
      const response = await fetch(`/api/sharedServices/utilisateurs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...userData, siteId }),
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers(prev => [...prev, newUser]);
        setStats(calculateStats([...users, newUser]));
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors de la création:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
      return false;
    }
  };

  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    try {
      const response = await fetch(`/api/sharedServices/utilisateurs/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
        setStats(calculateStats(users.map(u => u.id === userId ? updatedUser : u)));
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
      return false;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/sharedServices/utilisateurs/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setStats(calculateStats(users.filter(u => u.id !== userId)));
        return true;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
      return false;
    }
  };

  const refreshUsers = async () => {
    await fetchUsers();
  };

  useEffect(() => {
    fetchUsers();
  }, [siteId]);

  return {
    users,
    stats,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    refreshUsers
  };
} 