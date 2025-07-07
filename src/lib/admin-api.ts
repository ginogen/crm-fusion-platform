import { supabase } from '@/integrations/supabase/client';

interface AdminApiResponse<T = any> {
  data?: T;
  error?: string;
}

class AdminApiClient {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async makeRequest<T>(endpoint: string, data: any): Promise<AdminApiResponse<T>> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        return { error: 'No authentication token' };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return { error: result.error || 'Request failed' };
      }

      return { data: result };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async createUser(userData: { email: string; password: string }) {
    const result = await this.makeRequest('/api/admin/users', {
      action: 'createUser',
      userData
    });
    
    // Adaptar respuesta para compatibilidad con código existente
    if (result.error) {
      return { data: null, error: { message: result.error } };
    }
    
    return { 
      data: result.data, 
      error: null 
    };
  }

  async updatePassword(userId: string, password: string) {
    const result = await this.makeRequest('/api/admin/users', {
      action: 'updatePassword',
      userId,
      password
    });
    
    return result.error ? { error: result.error } : { error: null };
  }

  // Alias para compatibilidad
  async updateUserById(userId: string, updates: { password: string }) {
    return this.updatePassword(userId, updates.password);
  }

  async getUserById(userId: string) {
    const result = await this.makeRequest('/api/admin/users', {
      action: 'getUserById',
      userId
    });
    
    // Adaptar respuesta para compatibilidad
    if (result.error) {
      return { data: null, error: { message: result.error } };
    }
    
    return { 
      data: result.data, 
      error: null 
    };
  }

  async deleteUser(userId: string) {
    const result = await this.makeRequest('/api/admin/users', {
      action: 'deleteUser',
      userId
    });
    
    return result.error ? { error: result.error } : { error: null };
  }
}

export const adminApi = new AdminApiClient(); 