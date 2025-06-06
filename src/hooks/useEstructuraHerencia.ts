import { useMemo } from 'react';

interface Estructura {
  id: number;
  tipo: string;
  parent_estructura_id: number | null;
  nombre: string;
  custom_name: string | null;
}

export const useEstructuraHerencia = (estructuras: Estructura[]) => {
  return useMemo(() => {
    /**
     * Obtiene toda la cadena jerárquica desde la estructura actual hasta la raíz (Empresa)
     * @param estructuraId - ID de la estructura
     * @returns Array de IDs ordenados desde la raíz hasta la estructura actual
     */
    const obtenerCadenaJerarquica = (estructuraId: number): number[] => {
      const cadena: number[] = [];
      let currentId: number | null = estructuraId;
      
      // Prevenir bucles infinitos
      const visitados = new Set<number>();
      
      while (currentId && !visitados.has(currentId)) {
        visitados.add(currentId);
        cadena.push(currentId);
        const estructura = estructuras.find(e => e.id === currentId);
        currentId = estructura?.parent_estructura_id || null;
      }
      
      return cadena.reverse(); // Empresa → País → División → ... → Estructura actual
    };

    /**
     * Obtiene todas las estructuras vinculadas (ancestros y descendientes)
     * @param estructuraId - ID de la estructura
     * @returns Array de IDs de todas las estructuras vinculadas
     */
    const obtenerVinculacionesHeredadas = (estructuraId: number): number[] => {
      const vinculacionesHeredadas = new Set<number>();
      
      // Obtener cadena hacia arriba (ancestros)
      const cadenaAscendente = obtenerCadenaJerarquica(estructuraId);
      cadenaAscendente.forEach(id => vinculacionesHeredadas.add(id));
      
      // Obtener todos los descendientes recursivamente
      const obtenerDescendientes = (parentId: number, visitados: Set<number> = new Set()): number[] => {
        if (visitados.has(parentId)) return []; // Prevenir bucles
        visitados.add(parentId);
        
        const hijos = estructuras.filter(e => e.parent_estructura_id === parentId);
        let descendientes: number[] = [];
        
        hijos.forEach(hijo => {
          descendientes.push(hijo.id);
          descendientes = descendientes.concat(obtenerDescendientes(hijo.id, visitados));
        });
        
        return descendientes;
      };
      
      const descendientes = obtenerDescendientes(estructuraId);
      descendientes.forEach(id => vinculacionesHeredadas.add(id));
      
      return Array.from(vinculacionesHeredadas);
    };

    /**
     * Obtiene información detallada de la cadena jerárquica
     * @param estructuraId - ID de la estructura
     * @returns Array de objetos con información completa de cada estructura en la cadena
     */
    const obtenerCadenaDetallada = (estructuraId: number) => {
      const cadenaIds = obtenerCadenaJerarquica(estructuraId);
      return cadenaIds.map(id => estructuras.find(e => e.id === id)).filter(Boolean);
    };

    /**
     * Valida si una vinculación es jerárquicamente válida
     * @param estructuraHijoId - ID de la estructura hijo
     * @param estructuraPadreId - ID de la estructura padre
     * @returns true si la vinculación es válida
     */
    const esVinculacionValida = (estructuraHijoId: number, estructuraPadreId: number): boolean => {
      const estructuraHijo = estructuras.find(e => e.id === estructuraHijoId);
      const estructuraPadre = estructuras.find(e => e.id === estructuraPadreId);
      
      if (!estructuraHijo || !estructuraPadre) return false;
      
      // Definir orden jerárquico
      const TIPOS_ESTRUCTURA = [
        'Empresa',          // Nivel 0
        'Paises',           // Nivel 1
        'Filiales',         // Nivel 2
        'Filial',           // Nivel 3
        'División',         // Nivel 4
        'Organizaciones',   // Nivel 5
        'Jefaturas',        // Nivel 6
        'Sub Organización'  // Nivel 7
      ];
      
      const nivelHijo = TIPOS_ESTRUCTURA.indexOf(estructuraHijo.tipo);
      const nivelPadre = TIPOS_ESTRUCTURA.indexOf(estructuraPadre.tipo);
      
      // El padre debe ser de mayor jerarquía (menor índice)
      return nivelPadre < nivelHijo;
    };

    /**
     * Obtiene todas las estructuras que pueden ser padre de una estructura dada
     * @param estructuraId - ID de la estructura
     * @returns Array de estructuras que pueden ser padre
     */
    const obtenerPadresPosibles = (estructuraId: number): Estructura[] => {
      const estructura = estructuras.find(e => e.id === estructuraId);
      if (!estructura) return [];
      
      return estructuras.filter(e => 
        e.id !== estructuraId && 
        esVinculacionValida(estructuraId, e.id)
      );
    };

    /**
     * Obtiene estadísticas de la herencia
     * @param estructuraId - ID de la estructura
     * @returns Objeto con estadísticas de vinculaciones
     */
    const obtenerEstadisticasHerencia = (estructuraId: number) => {
      const cadena = obtenerCadenaJerarquica(estructuraId);
      const vinculaciones = obtenerVinculacionesHeredadas(estructuraId);
      const hijos = estructuras.filter(e => e.parent_estructura_id === estructuraId);
      
      return {
        totalAncestros: cadena.length - 1, // Excluir la estructura actual
        totalDescendientes: vinculaciones.length - cadena.length,
        totalVinculaciones: vinculaciones.length,
        hijosDirectos: hijos.length,
        nivelJerarquico: cadena.length - 1 // 0 para raíz
      };
    };

    return {
      obtenerCadenaJerarquica,
      obtenerVinculacionesHeredadas,
      obtenerCadenaDetallada,
      esVinculacionValida,
      obtenerPadresPosibles,
      obtenerEstadisticasHerencia
    };
  }, [estructuras]);
}; 