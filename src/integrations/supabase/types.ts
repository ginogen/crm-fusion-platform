export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_sessions: {
        Row: {
          created_at: string
          id: string
          last_seen: string
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen?: string
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      alembic_version: {
        Row: {
          version_num: string
        }
        Insert: {
          version_num: string
        }
        Update: {
          version_num?: string
        }
        Relationships: []
      }
      batch_estructura_permisos: {
        Row: {
          created_at: string | null
          estructuras_id: number | null
          id: number
          lead_batch_id: number | null
        }
        Insert: {
          created_at?: string | null
          estructuras_id?: number | null
          id?: number
          lead_batch_id?: number | null
        }
        Update: {
          created_at?: string | null
          estructuras_id?: number | null
          id?: number
          lead_batch_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "batch_estructura_permisos_estructuras_id_fkey"
            columns: ["estructuras_id"]
            isOneToOne: false
            referencedRelation: "estructuras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_estructura_permisos_lead_batch_id_fkey"
            columns: ["lead_batch_id"]
            isOneToOne: false
            referencedRelation: "lead_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_leads: {
        Row: {
          assigned_user_id: string | null
          batch_id: number | null
          created_at: string
          email: string
          estado: string
          filial: string | null
          id: number
          nombre_completo: string
          observaciones: string | null
          origen: string | null
          pais: string | null
          telefono: string
          updated_at: string
        }
        Insert: {
          assigned_user_id?: string | null
          batch_id?: number | null
          created_at?: string
          email: string
          estado?: string
          filial?: string | null
          id?: never
          nombre_completo: string
          observaciones?: string | null
          origen?: string | null
          pais?: string | null
          telefono: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string | null
          batch_id?: number | null
          created_at?: string
          email?: string
          estado?: string
          filial?: string | null
          id?: never
          nombre_completo?: string
          observaciones?: string | null
          origen?: string | null
          pais?: string | null
          telefono?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_leads_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "lead_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string | null
          id: number
          nombre: string | null
          pais: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          nombre?: string | null
          pais?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          nombre?: string | null
          pais?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      estructura_permisos: {
        Row: {
          can_create: boolean | null
          created_at: string
          id: number
          tipo_estructura: Database["public"]["Enums"]["estructura_tipo"]
          user_position: Database["public"]["Enums"]["user_position"]
        }
        Insert: {
          can_create?: boolean | null
          created_at?: string
          id?: number
          tipo_estructura: Database["public"]["Enums"]["estructura_tipo"]
          user_position: Database["public"]["Enums"]["user_position"]
        }
        Update: {
          can_create?: boolean | null
          created_at?: string
          id?: number
          tipo_estructura?: Database["public"]["Enums"]["estructura_tipo"]
          user_position?: Database["public"]["Enums"]["user_position"]
        }
        Relationships: []
      }
      estructuras: {
        Row: {
          created_at: string
          created_by: string | null
          custom_name: string | null
          id: number
          nombre: string
          parent_estructura_id: number | null
          parent_id: number | null
          tipo: Database["public"]["Enums"]["estructura_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_name?: string | null
          id?: number
          nombre: string
          parent_estructura_id?: number | null
          parent_id?: number | null
          tipo: Database["public"]["Enums"]["estructura_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_name?: string | null
          id?: number
          nombre?: string
          parent_estructura_id?: number | null
          parent_id?: number | null
          tipo?: Database["public"]["Enums"]["estructura_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estructuras_parent_estructura_id_fkey"
            columns: ["parent_estructura_id"]
            isOneToOne: false
            referencedRelation: "estructuras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estructuras_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "estructuras"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_batches: {
        Row: {
          campaign_name: string | null
          created_at: string
          id: number
          name: string
          source: string
          updated_at: string
        }
        Insert: {
          campaign_name?: string | null
          created_at?: string
          id?: never
          name: string
          source: string
          updated_at?: string
        }
        Update: {
          campaign_name?: string | null
          created_at?: string
          id?: never
          name?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_history: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: number
          lead_id: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: never
          lead_id?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: never
          lead_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          asignado_a: string | null
          created_at: string | null
          email: string | null
          estado: Database["public"]["Enums"]["leadstatus"] | null
          filial: string | null
          id: number
          nombre_completo: string | null
          observaciones: string | null
          organization_id: number | null
          origen: string | null
          pais: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          asignado_a?: string | null
          created_at?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["leadstatus"] | null
          filial?: string | null
          id?: number
          nombre_completo?: string | null
          observaciones?: string | null
          organization_id?: number | null
          origen?: string | null
          pais?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          asignado_a?: string | null
          created_at?: string | null
          email?: string | null
          estado?: Database["public"]["Enums"]["leadstatus"] | null
          filial?: string | null
          id?: number
          nombre_completo?: string | null
          observaciones?: string | null
          organization_id?: number | null
          origen?: string | null
          pais?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_asignado_a_fkey"
            columns: ["asignado_a"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: number
          message: string | null
          read: boolean | null
          type: Database["public"]["Enums"]["notificationtype"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message?: string | null
          read?: boolean | null
          type?: Database["public"]["Enums"]["notificationtype"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string | null
          read?: boolean | null
          type?: Database["public"]["Enums"]["notificationtype"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          company_id: number | null
          created_at: string | null
          id: number
          nombre: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: number | null
          created_at?: string | null
          id?: number
          nombre?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: number | null
          created_at?: string | null
          id?: number
          nombre?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas: {
        Row: {
          created_at: string | null
          fecha: string | null
          id: number
          lead_id: number | null
          observaciones: string | null
          rechazo_reason: string | null
          tipo: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          fecha?: string | null
          id?: number
          lead_id?: number | null
          observaciones?: string | null
          rechazo_reason?: string | null
          tipo: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          fecha?: string | null
          id?: number
          lead_id?: number | null
          observaciones?: string | null
          rechazo_reason?: string | null
          tipo?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tareas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tareas_notificaciones: {
        Row: {
          created_at: string | null
          id: number
          read: boolean | null
          tarea_id: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          read?: boolean | null
          tarea_id?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          read?: boolean | null
          tarea_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tareas_notificaciones_tarea_id_fkey"
            columns: ["tarea_id"]
            isOneToOne: false
            referencedRelation: "tareas"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: Database["public"]["Enums"]["taskstatus"] | null
          fecha_programada: string | null
          id: number
          lead_id: number | null
          tipo: Database["public"]["Enums"]["tasktype"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["taskstatus"] | null
          fecha_programada?: string | null
          id?: number
          lead_id?: number | null
          tipo?: Database["public"]["Enums"]["tasktype"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: Database["public"]["Enums"]["taskstatus"] | null
          fecha_programada?: string | null
          id?: number
          lead_id?: number | null
          tipo?: Database["public"]["Enums"]["tasktype"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          deactivated_at: string | null
          email: string | null
          estructura_id: number | null
          hashed_password: string | null
          id: string
          is_active: boolean | null
          nombre_completo: string | null
          role: string | null
          user_position: Database["public"]["Enums"]["user_position"] | null
        }
        Insert: {
          created_at?: string | null
          deactivated_at?: string | null
          email?: string | null
          estructura_id?: number | null
          hashed_password?: string | null
          id: string
          is_active?: boolean | null
          nombre_completo?: string | null
          role?: string | null
          user_position?: Database["public"]["Enums"]["user_position"] | null
        }
        Update: {
          created_at?: string | null
          deactivated_at?: string | null
          email?: string | null
          estructura_id?: number | null
          hashed_password?: string | null
          id?: string
          is_active?: boolean | null
          nombre_completo?: string | null
          role?: string | null
          user_position?: Database["public"]["Enums"]["user_position"] | null
        }
        Relationships: [
          {
            foreignKeyName: "users_estructura_id_fkey"
            columns: ["estructura_id"]
            isOneToOne: false
            referencedRelation: "estructuras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      estructura_tipo:
        | "Empresa"
        | "Paises"
        | "Filiales"
        | "Filial"
        | "División"
        | "Organizaciones"
        | "Jefaturas"
        | "Sub Organización"
      leadstatus:
        | "SIN_LLAMAR"
        | "LLAMAR_DESPUES"
        | "CITA_PROGRAMADA"
        | "MATRICULA"
      notificationtype:
        | "LEAD_NUEVO"
        | "LEAD_SIN_SEGUIMIENTO"
        | "TAREA_PENDIENTE"
      taskstatus: "PENDIENTE" | "COMPLETADA" | "CANCELADA" | "EFECTIVA"
      tasktype: "LLAMADA" | "CITA" | "SEGUIMIENTO"
      user_position:
        | "CEO"
        | "Director Internacional"
        | "Director Nacional"
        | "Director de Zona"
        | "Sales Manager"
        | "Gerente Divisional"
        | "Gerente"
        | "Team Manager"
        | "Full Executive"
        | "Asesor Training"
      user_role: "user" | "admin" | "superuser"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
