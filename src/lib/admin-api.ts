import { supabase } from '@/integrations/supabase/client';

interface AdminApiResponse<T = any> {
  data?: T;
  error?: string;
}

class AdminApiClient {
  private async getAuthToken(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }

  private async makeRequest<T>(endpoint: string, data: any): Promise<AdminApiResponse<T>> {
    try {
      console.log('🔍 AdminAPI: Making request to:', endpoint);
      console.log('🔍 AdminAPI: Request data:', { ...data, password: data.password ? '***' : undefined });
      
      const token = await this.getAuthToken();
      if (!token) {
        console.error('❌ AdminAPI: No authentication token available');
        return { error: 'No authentication token' };
      }

      console.log('🔍 AdminAPI: Token obtained, making fetch request...');
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      console.log('🔍 AdminAPI: Response status:', response.status);
      console.log('🔍 AdminAPI: Response headers:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('🔍 AdminAPI: Response data:', result);

      if (!response.ok) {
        console.error('❌ AdminAPI: Request failed with status:', response.status, result);
        return { error: result.error || 'Request failed' };
      }

      console.log('✅ AdminAPI: Request successful');
      return { data: result };
    } catch (error) {
      console.error('❌ AdminAPI: Exception during request:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async createUser(userData: { email: string; password: string }) {
    console.log('🚀 AdminAPI: Creating user with email:', userData.email);
    
    // Validaciones básicas antes de enviar
    if (!userData.email || !userData.password) {
      console.error('❌ AdminAPI: Missing required fields');
      return { data: null, error: { message: 'Email and password are required' } };
    }
    
    if (userData.password.length < 6) {
      console.error('❌ AdminAPI: Password too short');
      return { data: null, error: { message: 'Password must be at least 6 characters' } };
    }
    
    const result = await this.makeRequest('/api/admin/users', {
      action: 'createUser',
      userData
    });
    
    // Adaptar respuesta para compatibilidad con código existente
    if (result.error) {
      console.error('❌ AdminAPI: Create user failed:', result.error);
      return { data: null, error: { message: result.error } };
    }
    
    console.log('✅ AdminAPI: User created successfully');
    return { 
      data: result.data, 
      error: null 
    };
  }

  async updatePassword(userId: string, password: string) {
    console.log('🔒 AdminAPI: Updating password for user:', userId);
    
    // Validar UUID antes de enviar
    if (!userId || typeof userId !== 'string') {
      console.error('❌ AdminAPI: Invalid user ID type');
      return { error: 'Invalid user ID' };
    }
    
    if (userId.length !== 36) {
      console.error('❌ AdminAPI: Invalid user ID length:', userId.length);
      return { error: 'Invalid user ID format' };
    }
    
    const result = await this.makeRequest('/api/admin/users', {
      action: 'updatePassword',
      userId,
      password
    });
    
    if (result.error) {
      console.error('❌ AdminAPI: Update password failed:', result.error);
    } else {
      console.log('✅ AdminAPI: Password updated successfully');
    }
    
    return result.error ? { error: result.error } : { error: null };
  }

  // Alias para compatibilidad
  async updateUserById(userId: string, updates: { password: string }) {
    return this.updatePassword(userId, updates.password);
  }

  async getUserById(userId: string) {
    console.log('👤 AdminAPI: Getting user by ID:', userId);
    
    const result = await this.makeRequest('/api/admin/users', {
      action: 'getUserById',
      userId
    });
    
    // Adaptar respuesta para compatibilidad
    if (result.error) {
      console.error('❌ AdminAPI: Get user failed:', result.error);
      return { data: null, error: { message: result.error } };
    }
    
    console.log('✅ AdminAPI: User retrieved successfully');
    return { 
      data: result.data, 
      error: null 
    };
  }

  async deleteUser(userId: string) {
    console.log('🗑️ AdminAPI: Deleting user:', userId);
    
    const result = await this.makeRequest('/api/admin/users', {
      action: 'deleteUser',
      userId
    });
    
    if (result.error) {
      console.error('❌ AdminAPI: Delete user failed:', result.error);
    } else {
      console.log('✅ AdminAPI: User deleted successfully');
    }
    
    return result.error ? { error: result.error } : { error: null };
  }
}

export const adminApi = new AdminApiClient(); 