export type LeadEstado = "SIN_LLAMAR" | "LLAMAR_DESPUES" | "CITA_PROGRAMADA" | "MATRICULA";

export type UserRole = 
  | 'ASESOR_TRAINING'
  | 'FULL_EXECUTIVE'
  | 'TEAM_MANAGER'
  | 'GERENTE'
  | 'GERENTE_DIVISIONAL'
  | 'SALES_MANAGER'
  | 'DIRECTOR_ZONA'
  | 'DIRECTOR_NACIONAL'
  | 'DIRECTOR_INTERNACIONAL'
  | 'CEO';

export interface User {
  id: number;
  email: string;
  nombre_completo: string;
  user_position: UserRole;
  estructuras?: {
    id: number;
    tipo: string;
    nombre: string;
    custom_name: string;
    parent_id: number | null;
  };
  created_at?: string;
  updated_at?: string;
}

export interface Lead {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  origen: string;
  pais: string;
  filial: string;
  observaciones: string;
  estado: LeadEstado;
  user_id: number;
  created_at: string;
  users?: User;
}
