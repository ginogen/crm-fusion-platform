
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Sistema de logging optimizado para producción
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Logger optimizado que solo funciona en desarrollo
export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (isDevelopment) {
      console.error(...args);
    }
    // En producción, solo logear errores críticos
    if (isProduction) {
      console.error('[PROD ERROR]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
};

// Función para limpiar logs en producción
export const cleanLogs = () => {
  if (isProduction) {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // Mantener solo errores críticos
    console.warn = () => {};
  }
};
