import { supabase } from '@/integrations/supabase/client';

export const ReportsService = {
  async getDotacionPersonal({ estructuraId, userId }: { estructuraId?: string; userId?: string }) {
    let query = supabase
      .from('users')
      .select(`
        id,
        nombre_completo,
        user_position,
        is_active,
        estructura_id,
        estructuras (
          id,
          nombre,
          custom_name,
          tipo
        )
      `)
      .eq('is_active', true)
      .order('nombre_completo');

    if (estructuraId) {
      query = query.eq('estructura_id', estructuraId);
    }
    if (userId) {
      query = query.eq('id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(user => ({
      ...user,
      estructura: user.estructuras?.custom_name || user.estructuras?.nombre,
      is_active: user.is_active ? 'Activo' : 'Inactivo'
    }));
  },

  async getInactivosReport({ estructuraId }: { estructuraId?: string }) {
    let query = supabase
      .from('users')
      .select(`
        id,
        nombre_completo,
        email,
        user_position,
        estructura_id,
        estructuras (
          id,
          nombre,
          custom_name,
          tipo
        )
      `)
      .eq('is_active', false)
      .order('nombre_completo');

    if (estructuraId) {
      query = query.eq('estructura_id', estructuraId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(user => ({
      ...user,
      estructura: user.estructuras?.custom_name || user.estructuras?.nombre,
      cargo: user.user_position
    }));
  },

  async getLlamadosFuturos({ dateFrom, dateTo, estructuraId, userId }: { dateFrom: string; dateTo: string; estructuraId?: string; userId?: string }) {
    let query = supabase
      .from('llamados')
      .select(`
        id,
        fecha_programada,
        estado,
        users (
          id,
          nombre_completo,
          estructura_id
        ),
        datos (
          id,
          nombre,
          telefono
        )
      `)
      .gte('fecha_programada', dateFrom)
      .lte('fecha_programada', dateTo)
      .order('fecha_programada');

    if (estructuraId) {
      query = query.eq('users.estructura_id', estructuraId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(llamado => ({
      ...llamado,
      fecha: new Date(llamado.fecha_programada).toLocaleDateString('es-CL'),
      hora: new Date(llamado.fecha_programada).toLocaleTimeString('es-CL'),
      ejecutivo: llamado.users?.nombre_completo,
      contacto: llamado.datos?.nombre,
      telefono: llamado.datos?.telefono
    }));
  },

  async getTiempoReal() {
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        nombre_completo,
        user_position,
        estructura_id,
        estructuras (
          id,
          nombre,
          custom_name
        ),
        user_activity (
          last_active,
          session_start,
          is_online
        )
      `)
      .eq('is_active', true)
      .order('nombre_completo');

    if (error) throw error;

    return data.map(user => {
      const activity = user.user_activity?.[0];
      const tiempoActivo = activity?.is_online && activity?.session_start ? 
        this.calcularTiempoActivo(activity.session_start, activity.last_active) :
        'Inactivo';

      return {
        nombre_completo: user.nombre_completo,
        estructura: user.estructuras?.custom_name || user.estructuras?.nombre,
        estado: activity?.is_online ? 'En línea' : 'Desconectado',
        tiempo_activo: tiempoActivo,
        ultima_actividad: activity?.last_active ? 
          new Date(activity.last_active).toLocaleString('es-CL') : 
          'No registrada'
      };
    });
  },

  // Función auxiliar para calcular tiempo activo
  calcularTiempoActivo(inicio: string, ultimo: string): string {
    const start = new Date(inicio);
    const last = new Date(ultimo);
    const diff = last.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  },

  // Implementaremos los demás informes según necesites...
}; 