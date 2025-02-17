
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
  "SIN LLAMAR",
  "LLAMAR DESPUES",
  "CITA PROGRAMADA",
  "MATRICULA",
] as const;

export const MANAGEMENT_TYPES = [
  "CITA",
  "LLAMADA",
  "RECHAZO",
  "NUMERO EQUIVOCADO",
  "DATO DUPLICADO",
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

export const STRUCTURE_TYPES = [
  "Empresas",
  "País",
  "Zonas",
  "Filial",
  "División",
  "Organizaciones",
  "Jefaturas",
  "Sub Organización",
] as const;
