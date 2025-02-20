export const APP_NAME = "CRM Fusion";

export const NAVIGATION_ITEMS = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  { label: "Datos", icon: "Database", href: "/datos" },
  { label: "Campañas", icon: "Megaphone", href: "/campanas" },
  { label: "Reasignar", icon: "UserPlus", href: "/reasignar" },
  { label: "Informes", icon: "BarChart", href: "/informes" },
  { label: "Organización", icon: "Building", href: "/organizacion" },
  { label: "Usuarios", icon: "Users", href: "/usuarios" },
] as const;

export const LEAD_STATUSES = [
  "SIN_LLAMAR",
  "LLAMAR_DESPUES",
  "CITA_PROGRAMADA",
  "MATRICULA",
] as const;

export const LEAD_STATUS_LABELS = {
  SIN_LLAMAR: "Sin Llamar",
  LLAMAR_DESPUES: "Llamar Después",
  CITA_PROGRAMADA: "Cita Programada",
  MATRICULA: "Matrícula",
} as const;

export const MANAGEMENT_TYPES = [
  "CITA",
  "LLAMADA",
  "RECHAZO",
  "NUMERO_EQUIVOCADO",
  "DATO_DUPLICADO",
] as const;

export const ROLES = [
  "CEO",
  "Director Internacional",
  "Director Nacional",
  "Director de Zona",
  "Sales Manager",
  "Gerente Divisional",
  "Gerente",
  "Team Manager",
  "Full Executive",
  "Asesor Training",
] as const;

export const STRUCTURE_TYPES_MAPPING = {
  "Empresas": "Empresa",
  "País": "Paises",
  "Zonas": "Zonas",
  "Filial": "Filial",
  "División": "División",
  "Organizaciones": "Organizaciones",
  "Jefaturas": "Jefaturas",
  "Sub Organización": "Sub Organización"
} as const;

export const STRUCTURE_TYPES = Object.keys(STRUCTURE_TYPES_MAPPING) as (keyof typeof STRUCTURE_TYPES_MAPPING)[];

