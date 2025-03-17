export const APP_NAME = "CRM Fusion";

type NavigationItem = {
  label: string;
  icon: string;
  href: string;
  roles?: string[];
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: "Dashboard", icon: "LayoutDashboard", href: "/" },
  { label: "Datos", icon: "Database", href: "/datos" },
  { label: "Campañas", icon: "Megaphone", href: "/campanas" },
  { label: "Reasignar", icon: "UserPlus", href: "/reasignar" },
  { label: "Informes", icon: "BarChart", href: "/informes" },
  { label: "Organización", icon: "Building", href: "/organizacion" },
  { label: "Usuarios", icon: "Users", href: "/usuarios" },
  { 
    label: "Control de Tiempo", 
    icon: "Clock", 
    href: "/time-control",
    roles: ["CEO", "Director Internacional", "Director Nacional"]
  },
];

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
  "NO_INTERESA",
  "NUMERO_EQUIVOCADO",
  "DATO_DUPLICADO",
  "SIN_RESPUESTA",
  "NO_EXISTE",
  "TOMO_PROGRAMA",
  "NO_CUMPLE_REQUISITO"
] as const;

export const REJECTION_REASONS = {
  NO_INTERESA: ["POR_METODO", "POR_DINERO", "POR_TIEMPO"],
  NO_CUMPLE_REQUISITO: ["POR_EDAD", "POR_TIEMPO", "NO_QUIERE_CITA"]
} as const;

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

export const USER_ROLES = {
  ASESOR_TRAINING: 'ASESOR_TRAINING',
  FULL_EXECUTIVE: 'FULL_EXECUTIVE',
  TEAM_MANAGER: 'TEAM_MANAGER',
  GERENTE: 'GERENTE',
  GERENTE_DIVISIONAL: 'GERENTE_DIVISIONAL',
  SALES_MANAGER: 'SALES_MANAGER',
  DIRECTOR_ZONA: 'DIRECTOR_ZONA',
  DIRECTOR_NACIONAL: 'DIRECTOR_NACIONAL',
  DIRECTOR_INTERNACIONAL: 'DIRECTOR_INTERNACIONAL',
  CEO: 'CEO'
} as const;

export const ROLE_HIERARCHY = {
  [USER_ROLES.ASESOR_TRAINING]: [],
  [USER_ROLES.FULL_EXECUTIVE]: [USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.TEAM_MANAGER]: [USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.GERENTE]: [USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.GERENTE_DIVISIONAL]: [USER_ROLES.GERENTE, USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.SALES_MANAGER]: [USER_ROLES.GERENTE_DIVISIONAL, USER_ROLES.GERENTE, USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.DIRECTOR_ZONA]: [USER_ROLES.SALES_MANAGER, USER_ROLES.GERENTE_DIVISIONAL, USER_ROLES.GERENTE, USER_ROLES.TEAM_MANAGER, USER_ROLES.FULL_EXECUTIVE, USER_ROLES.ASESOR_TRAINING],
  [USER_ROLES.DIRECTOR_NACIONAL]: 'ALL',
  [USER_ROLES.DIRECTOR_INTERNACIONAL]: 'ALL',
  [USER_ROLES.CEO]: 'ALL'
} as const;

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

