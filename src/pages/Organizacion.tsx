import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEstructuraHerencia } from "@/hooks/useEstructuraHerencia";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Loader2, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Trash2, 
  TreePine,
  Grid3X3,
  Users,
  Building2,
  ChevronRight,
  Network,
  Link2 // <-- Agrego el ícono de enlace
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Position,
  MarkerType,
  Handle,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { MULTI_ESTRUCTURA_POSITIONS } from "@/lib/constants";

// Función helper para verificar si un usuario tiene múltiples estructuras
const hasMultiEstructura = (userPosition: string): boolean => {
  return MULTI_ESTRUCTURA_POSITIONS.some(position => position === userPosition);
};

// Después de la función hasMultiEstructura, agrego las nuevas funciones:
// Posiciones que pueden hacer vinculación múltiple para estructuras superiores
const POSICIONES_MULTI_VINCULACION = ['CEO', 'Director Internacional', 'Director Nacional'];

// Función para determinar si se debe mostrar selección múltiple
const puedeVincularMultiple = (userPosition: string, estructuraPadre?: Estructura | null): boolean => {
  console.log('🔍 Evaluando puedeVincularMultiple:', {
    userPosition,
    estructuraPadre: estructuraPadre?.tipo,
    estructuraPadreNombre: estructuraPadre?.custom_name || estructuraPadre?.nombre
  });
  
  // Si el usuario tiene permisos especiales de multi-estructura
  if (hasMultiEstructura(userPosition)) {
    console.log('✅ Usuario tiene permisos de multi-estructura');
    return true;
  }
  
  // Si el usuario tiene posición directiva y la estructura padre es de nivel superior
  if (POSICIONES_MULTI_VINCULACION.includes(userPosition) && estructuraPadre) {
    const esEstructuraSuperior = ['Empresa', 'Paises', 'Zonas'].includes(estructuraPadre.tipo);
    console.log('🎯 Evaluando posición directiva:', {
      posicionIncluida: POSICIONES_MULTI_VINCULACION.includes(userPosition),
      estructuraSuperior: esEstructuraSuperior,
      tipoEstructura: estructuraPadre.tipo
    });
    return esEstructuraSuperior;
  }
  
  console.log('❌ No cumple condiciones para selección múltiple');
  return false;
};

// Componente personalizado para nodos del diagrama organizacional
const EstructuraNode = ({ data }: { data: any }) => {
  const { estructura, usuarios, onEdit, onShowUsuarios } = data;
  const totalUsuarios = usuarios?.length || 0;

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'Empresa': 'bg-purple-500 border-purple-600 text-white',
      'Paises': 'bg-blue-500 border-blue-600 text-white',
      'Zonas': 'bg-green-500 border-green-600 text-white',
      'Filial': 'bg-emerald-500 border-emerald-600 text-white',
      'División': 'bg-orange-500 border-orange-600 text-white',
      'Organizaciones': 'bg-cyan-500 border-cyan-600 text-white',
      'Jefaturas': 'bg-yellow-500 border-yellow-600 text-white',
      'Sub Organización': 'bg-gray-500 border-gray-600 text-white'
    };
    return colors[tipo] || 'bg-gray-500 border-gray-600 text-white';
  };

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg border-2 min-w-[200px] ${getTipoColor(estructura.tipo)} relative`}>
      {/* Handle de entrada (arriba) - para recibir conexiones */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          background: '#fff',
          border: '2px solid #64748b',
          width: 12,
          height: 12,
        }}
      />
      
      {/* Handle de salida (abajo) - para crear conexiones */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          background: '#fff',
          border: '2px solid #64748b',
          width: 12,
          height: 12,
        }}
      />

      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm truncate max-w-[140px]">
            {estructura.custom_name || estructura.nombre}
          </h4>
          <button
            onClick={() => onEdit(estructura)}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <Building2 className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
            {estructura.tipo}
          </Badge>
          
          {totalUsuarios > 0 && (
            <button
              onClick={() => onShowUsuarios(estructura)}
              className="flex items-center space-x-1 opacity-80 hover:opacity-100 transition-opacity"
            >
              <Users className="h-3 w-3" />
              <span>{totalUsuarios}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Tipos de nodos personalizados
const nodeTypes = {
  estructuraNode: EstructuraNode,
};

// Componente para mostrar la cadena jerárquica visualmente
const CadenaJerarquica = ({ estructuraId, estructuras }: { estructuraId: number, estructuras: Estructura[] }) => {
  const { obtenerCadenaDetallada, obtenerEstadisticasHerencia } = useEstructuraHerencia(estructuras);
  const cadena = obtenerCadenaDetallada(estructuraId);
  const stats = obtenerEstadisticasHerencia(estructuraId);
  
  if (cadena.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-sm bg-slate-50 p-3 rounded-md">
        <span className="text-muted-foreground font-medium">Cadena jerárquica:</span>
        <div className="flex items-center space-x-1 flex-wrap">
          {cadena.map((estructura, index) => {
            if (!estructura) return null;
            
            return (
              <div key={estructura.id} className="flex items-center space-x-1">
                {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                <Badge variant="outline" className="text-xs">
                  {estructura.custom_name || estructura.nombre}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Estadísticas de herencia */}
      <div className="flex items-center space-x-4 text-xs text-muted-foreground bg-blue-50 p-2 rounded-md">
        <div className="flex items-center space-x-1">
          <span className="font-medium">Nivel:</span>
          <span>{stats.nivelJerarquico}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-medium">Ancestros:</span>
          <span>{stats.totalAncestros}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-medium">Descendientes:</span>
          <span>{stats.totalDescendientes}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-medium">Total vinculaciones:</span>
          <span>{stats.totalVinculaciones}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * JERARQUÍA ORGANIZACIONAL CORREGIDA
 * 
 * La estructura organizacional sigue este orden jerárquico lógico:
 * 
 * Nivel 0: Empresa          - Entidad corporativa principal (raíz)
 * Nivel 1: Países           - Divisiones geográficas por país
 * Nivel 2: Zonas            - Zonas geográficas o administrativas
 * Nivel 3: Filial           - Filiales individuales
 * Nivel 4: División         - Divisiones operativas
 * Nivel 5: Organizacion     - Unidades organizacionales
 * Nivel 6: Jefatura         - Jefaturas dentro de las organizaciones
 * Nivel 7: Sub Organizacion - Sub-organizaciones más específicas
 */

const TIPOS_ESTRUCTURA = [
  'Empresa',          // Nivel 0 - Empresa (raíz)
  'Paises',           // Nivel 1 - Países
  'Zonas',            // Nivel 2 - Zonas (anteriormente Filiales)
  'Filial',           // Nivel 3 - Filial individual
  'División',         // Nivel 4 - Divisiones operativas
  'Organizaciones',   // Nivel 5 - Organizaciones
  'Jefaturas',        // Nivel 6 - Jefaturas
  'Sub Organización'  // Nivel 7 - Sub-organizaciones
] as const;

const TIPOS_ESTRUCTURA_LABELS: Record<string, string> = {
  'Empresa': 'Empresa',
  'Paises': 'Países',
  'Zonas': 'Zonas',
  'Filial': 'Filial',
  'División': 'División',
  'Organizaciones': 'Organización',
  'Jefaturas': 'Jefatura',
  'Sub Organización': 'Sub Organización'
};

// Función para validar vinculaciones permitidas (incluye excepción Organizaciones ↔ Filial)
const esVinculacionValida = (tipoHijo: typeof TIPOS_ESTRUCTURA[number], tipoPadre: typeof TIPOS_ESTRUCTURA[number]): boolean => {
  const nivelHijo = TIPOS_ESTRUCTURA.indexOf(tipoHijo);
  const nivelPadre = TIPOS_ESTRUCTURA.indexOf(tipoPadre);
  
  // Jerarquía inmediata normal (nivel exactamente superior)
  const esJerarquiaInmediata = nivelPadre === (nivelHijo - 1);
  
  // EXCEPCIÓN: Organizaciones ↔ Filial pueden vincularse directamente
  const esExcepcionOrganizacionesFilial = 
    (tipoHijo === 'Organizaciones' && tipoPadre === 'Filial') ||
    (tipoHijo === 'Filial' && tipoPadre === 'Organizaciones');
  
  return esJerarquiaInmediata || esExcepcionOrganizacionesFilial;
};

interface Estructura {
  id: number;
  tipo: typeof TIPOS_ESTRUCTURA[number];
  parent_estructura_id: number | null;
  nombre: string;
  custom_name: string | null;
  hijos?: Estructura[];
}

interface UserProfile {
  id: string;
  user_position: string;
  email: string;
  nombre_completo: string;
  estructura_id: number;
  supervisor_id: string | null;
  estructuras?: { id: number }[];
}

interface EstructuraVinculadaProps {
  estructura: Estructura;
  usuarios: UserProfile[];
  isOpen: boolean;
  onToggle: () => void;
  estructuraPadre?: Estructura | null;
  allEstructuras: Estructura[];
}

const EstructuraVinculada = ({ estructura, usuarios, isOpen, onToggle, estructuraPadre, allEstructuras }: EstructuraVinculadaProps) => {
  return (
    <div className="border rounded-lg bg-white mb-2">
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 cursor-pointer" onClick={onToggle}>
          <div className="space-y-1">
            <h3 className="font-medium">{estructura.custom_name || estructura.nombre}</h3>
            <p className="text-sm text-muted-foreground">{estructura.tipo}</p>
            {estructuraPadre && (
              <p className="text-sm text-muted-foreground">
                Vinculada a: {estructuraPadre.custom_name || estructuraPadre.nombre} ({estructuraPadre.tipo})
              </p>
            )}
          </div>
        </div>
        {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </div>
      
      {isOpen && (
        <div className="p-4 pt-0 border-t">
          {usuarios && usuarios.length > 0 ? (
            <>
              <h4 className="text-sm font-medium mb-2">Usuarios vinculados</h4>
              <div className="space-y-3">
                {usuarios.map((usuario) => {
                  const supervisor = usuarios.find(u => u.id === usuario.supervisor_id);
                  const esMultiEstructura = hasMultiEstructura(usuario.user_position);
                  
                  return (
                    <div key={usuario.id} className="p-3 bg-slate-50 rounded-md">
                      <p className="font-medium">{usuario.nombre_completo}</p>
                      <p className="text-sm text-muted-foreground">{usuario.user_position}</p>
                      <p className="text-sm text-muted-foreground">{usuario.email}</p>
                      
                      {esMultiEstructura && usuario.estructuras && usuario.estructuras.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-muted-foreground">Estructuras vinculadas:</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {usuario.estructuras.map(e => {
                              const estructuraInfo = allEstructuras?.find(es => es.id === e.id);
                              return estructuraInfo ? (
                                <span 
                                  key={e.id}
                                  className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full"
                                >
                                  {estructuraInfo.custom_name || estructuraInfo.nombre}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {supervisor && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Supervisor: </span>
                          <span className="font-medium">{supervisor.nombre_completo}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No hay usuarios vinculados a esta estructura</p>
          )}
        </div>
      )}
    </div>
  );
};

interface EstructuraTreeNodeProps {
  estructura: Estructura;
  usuarios: UserProfile[];
  nivel: number;
  onEdit: (estructura: Estructura) => void;
  onDelete: (estructura: Estructura) => void;
  onShowUsuarios: (estructura: Estructura) => void;
  onVincular: (estructura: Estructura) => void;
  allEstructuras: Estructura[];
  usuariosPorEstructura: Record<number, UserProfile[]>;
}

const EstructuraTreeNode = ({ 
  estructura, 
  usuarios, 
  nivel, 
  onEdit, 
  onDelete, 
  onShowUsuarios,
  onVincular,
  allEstructuras,
  usuariosPorEstructura 
}: EstructuraTreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(nivel < 2); // Auto-expandir los primeros 2 niveles
  
  // Mejorar el ordenamiento de hijos según jerarquía y nombre
  const hijos = allEstructuras
    .filter(e => e.parent_estructura_id === estructura.id)
    .sort((a, b) => {
      // Primero ordenar por tipo según la jerarquía
      const tipoA = TIPOS_ESTRUCTURA.indexOf(a.tipo);
      const tipoB = TIPOS_ESTRUCTURA.indexOf(b.tipo);
      if (tipoA !== tipoB) return tipoA - tipoB;
      
      // Luego ordenar alfabéticamente por nombre
      const nombreA = a.custom_name || a.nombre;
      const nombreB = b.custom_name || b.nombre;
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });
    
  const hasChildren = hijos.length > 0;
  const totalUsuarios = usuarios.length;

  const getIndentStyle = (nivel: number) => ({
    marginLeft: `${nivel * 24}px`,
    borderLeft: nivel > 0 ? '2px solid #e2e8f0' : 'none',
    paddingLeft: nivel > 0 ? '12px' : '0'
  });

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'Empresa': 'bg-purple-100 text-purple-800 border-purple-200',        // Nivel 0 - Púrpura (más alto)
      'Paises': 'bg-blue-100 text-blue-800 border-blue-200',              // Nivel 1 - Azul
      'Zonas': 'bg-green-100 text-green-800 border-green-200',            // Nivel 2 - Verde
      'Filial': 'bg-emerald-100 text-emerald-800 border-emerald-200',     // Nivel 3 - Verde esmeralda
      'División': 'bg-orange-100 text-orange-800 border-orange-200',       // Nivel 4 - Naranja
      'Organizaciones': 'bg-cyan-100 text-cyan-800 border-cyan-200',      // Nivel 5 - Cian
      'Jefaturas': 'bg-yellow-100 text-yellow-800 border-yellow-200',     // Nivel 6 - Amarillo
      'Sub Organización': 'bg-gray-100 text-gray-800 border-gray-200'     // Nivel 7 - Gris (más específico)
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="w-full">
      <div 
        className="flex items-center justify-between p-3 bg-white border rounded-lg mb-2 hover:shadow-md transition-all duration-200 group"
        style={getIndentStyle(nivel)}
      >
        <div className="flex items-center space-x-3 flex-1">
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 h-6 w-6"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium text-sm truncate">
                {estructura.custom_name || estructura.nombre}
              </h4>
              <Badge variant="outline" className={`text-xs ${getTipoColor(estructura.tipo)}`}>
                {estructura.tipo}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {totalUsuarios > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowUsuarios(estructura);
                  }}
                  className="flex items-center space-x-1 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                >
                  <Users className="h-3 w-3" />
                  <span>{totalUsuarios} usuario{totalUsuarios !== 1 ? 's' : ''}</span>
                </button>
              )}
              
              {hasChildren && (
                <div className="flex items-center space-x-1">
                  <TreePine className="h-3 w-3" />
                  <span>{hijos.length} sub-estructura{hijos.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(estructura)}
            className="h-8 w-8 p-0"
            title="Editar estructura"
          >
            <Building2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onVincular(estructura)}
            className="h-8 w-8 p-0"
            title="Gestionar vinculación"
          >
            <Link2 className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará la estructura "{estructura.custom_name || estructura.nombre}" y no se puede deshacer.
                  {hasChildren && (
                    <span className="block mt-2 text-destructive font-medium">
                      Advertencia: Esta estructura tiene {hijos.length} estructura(s) vinculada(s).
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    onDelete(estructura);
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="space-y-1">
          {hijos.map((hijo) => (
            <EstructuraTreeNode
              key={hijo.id}
              estructura={hijo}
              usuarios={usuariosPorEstructura?.[hijo.id] || []}
              nivel={nivel + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onShowUsuarios={onShowUsuarios}
              onVincular={onVincular}
              allEstructuras={allEstructuras}
              usuariosPorEstructura={usuariosPorEstructura}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const EstructuraCard = ({ estructura, usuarios, onEdit, onDelete, onShowUsuarios, onVincular }: {
  estructura: Estructura;
  usuarios: UserProfile[];
  onEdit: (estructura: Estructura) => void;
  onDelete: (estructura: Estructura) => void;
  onShowUsuarios: (estructura: Estructura) => void;
  onVincular: (estructura: Estructura) => void;
}) => {
  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      'Empresa': 'bg-purple-100 text-purple-800 border-purple-200',        // Nivel 0 - Púrpura (más alto)
      'Paises': 'bg-blue-100 text-blue-800 border-blue-200',              // Nivel 1 - Azul
      'Zonas': 'bg-green-100 text-green-800 border-green-200',            // Nivel 2 - Verde
      'Filial': 'bg-emerald-100 text-emerald-800 border-emerald-200',     // Nivel 3 - Verde esmeralda
      'División': 'bg-orange-100 text-orange-800 border-orange-200',       // Nivel 4 - Naranja
      'Organizaciones': 'bg-cyan-100 text-cyan-800 border-cyan-200',      // Nivel 5 - Cian
      'Jefaturas': 'bg-yellow-100 text-yellow-800 border-yellow-200',     // Nivel 6 - Amarillo
      'Sub Organización': 'bg-gray-100 text-gray-800 border-gray-200'     // Nivel 7 - Gris (más específico)
    };
    return colors[tipo] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="relative p-4 bg-white rounded-lg border hover:shadow-md transition-shadow group">
      <div className="cursor-pointer" onClick={() => onEdit(estructura)}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-sm truncate cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onVincular(estructura);
            }}
          >
            {estructura.custom_name || estructura.nombre}
          </h4>
          <Badge variant="outline" className={`text-xs ${getTipoColor(estructura.tipo)}`}>
            {estructura.tipo}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {estructura.parent_estructura_id && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <ChevronUp className="h-3 w-3" />
              <span>Vinculada a estructura padre</span>
            </div>
          )}
          
          {estructura.hijos && estructura.hijos.length > 0 && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <ChevronDown className="h-3 w-3" />
              <span>{estructura.hijos.length} sub-estructura{estructura.hijos.length !== 1 ? 's' : ''}</span>
            </div>
          )}
          
          {usuarios.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowUsuarios(estructura);
              }}
              className="flex items-center space-x-1 text-xs text-muted-foreground hover:text-blue-600 hover:underline cursor-pointer transition-colors"
            >
              <Users className="h-3 w-3" />
              <span>{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2 absolute bottom-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(estructura);
          }}
          className="h-8 w-8"
          title="Editar estructura"
        >
          <Building2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onVincular(estructura);
          }}
          className="h-8 w-8"
          title="Gestionar vinculación"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              title="Eliminar estructura"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará la estructura "{estructura.custom_name || estructura.nombre}" y no se puede deshacer.
                {estructura.hijos && estructura.hijos.length > 0 && (
                  <span className="block mt-2 text-destructive font-medium">
                    Advertencia: Esta estructura tiene {estructura.hijos.length} estructura(s) vinculada(s).
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(estructura);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

const Organizacion = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVinculacionModalOpen, setIsVinculacionModalOpen] = useState(false);
  const [isUsuariosModalOpen, setIsUsuariosModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEstructura, setSelectedEstructura] = useState<Estructura | null>(null);
  const [selectedEstructuraUsuarios, setSelectedEstructuraUsuarios] = useState<Estructura | null>(null);
  const [editingEstructura, setEditingEstructura] = useState<Estructura | null>(null);
  const [estructurasSeleccionadas, setEstructurasSeleccionadas] = useState<number[]>([]);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterNombre, setFilterNombre] = useState("");
  const [expandedEstructuras, setExpandedEstructuras] = useState<number[]>([]);
  const [vistaActual, setVistaActual] = useState<"tree" | "grid" | "diagram">("tree");
  const [newEstructura, setNewEstructura] = useState({
    tipo: "",
    nombre: "",
    parent_estructura_id: null as number | null,
  });
  const [editForm, setEditForm] = useState({
    nombre: "",
    custom_name: ""
  });

  // Estados para el diagrama interactivo
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Por favor inicia sesión para continuar");
        navigate("/auth");
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const { data: userProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      return data as UserProfile;
    },
  });

  const { data: permisosEstructura } = useQuery({
    queryKey: ["permisosEstructura", userProfile?.user_position],
    queryFn: async () => {
      if (!userProfile?.user_position) return [];

      const { data, error } = await supabase
        .from('estructura_permisos')
        .select('*')
        .eq('user_position', userProfile.user_position)
        .eq('can_create', true);

      if (error) {
        console.error("Error fetching permisos:", error);
        throw error;
      }

      return data;
    },
    enabled: !!userProfile?.user_position
  });

  const { data: estructuras, isLoading: isLoadingEstructuras, error, refetch } = useQuery({
    queryKey: ["estructuras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estructuras")
        .select('*')
        .order('tipo', { ascending: true });

      if (error) throw error;

      const estructurasConHijos = data.map(estructura => ({
        ...estructura,
        hijos: data.filter(e => e.parent_estructura_id === estructura.id)
      }));

      return estructurasConHijos as Estructura[];
    },
  });

  const { data: usuariosPorEstructura } = useQuery({
    queryKey: ["usuariosPorEstructura"],
    queryFn: async () => {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select(`
          id,
          user_position,
          email,
          nombre_completo,
          estructura_id,
          supervisor_id
        `);

      if (usersError) throw usersError;

      const { data: userEstructuras, error: estructurasError } = await supabase
        .from("user_estructuras")
        .select('*');

      if (estructurasError) throw estructurasError;

      const usuariosPorEstructura: Record<number, UserProfile[]> = {};
      
      users.forEach((usuario) => {
        const estructurasUsuario = userEstructuras
          .filter(ue => ue.user_id === usuario.id)
          .map(ue => ({ id: ue.estructura_id }));

        const usuarioConEstructuras = {
          ...usuario,
          estructuras: estructurasUsuario
        };

        if (usuario.estructura_id) {
          if (!usuariosPorEstructura[usuario.estructura_id]) {
            usuariosPorEstructura[usuario.estructura_id] = [];
          }
          usuariosPorEstructura[usuario.estructura_id].push(usuarioConEstructuras);
        }

        estructurasUsuario.forEach(estructura => {
          if (!usuariosPorEstructura[estructura.id]) {
            usuariosPorEstructura[estructura.id] = [];
          }
          if (!usuariosPorEstructura[estructura.id].find(u => u.id === usuario.id)) {
            usuariosPorEstructura[estructura.id].push(usuarioConEstructuras);
          }
        });
      });

      return usuariosPorEstructura;
    },
  });

  // Hook para manejo de herencia jerárquica
  const herenciaUtils = useEstructuraHerencia(estructuras || []);

  // Memorizar cálculos costosos para evitar recálculos innecesarios
  const selectedEstructuraStats = useMemo(() => {
    if (!selectedEstructura) return null;
    return {
      vinculacionesHeredadas: herenciaUtils.obtenerVinculacionesHeredadas(selectedEstructura.id),
      padresPosibles: herenciaUtils.obtenerPadresPosibles(selectedEstructura.id),
      estadisticas: herenciaUtils.obtenerEstadisticasHerencia(selectedEstructura.id),
    };
  }, [selectedEstructura, herenciaUtils]);

  // Memorizar estructuras vinculables para evitar filtros costosos en cada render
  // INCLUYE JERARQUÍA INMEDIATA + EXCEPCIÓN Organizaciones ↔ Filial
  const estructurasVinculables = useMemo(() => {
    if (!selectedEstructura || !estructuras) return [];
    
    return estructuras.filter(e => {
      // No incluir la estructura actual
      if (e.id === selectedEstructura.id) return false;
      
      // No incluir estructuras que ya están vinculadas directamente
      if (e.parent_estructura_id === selectedEstructura.id) return false;
      if (selectedEstructura.parent_estructura_id === e.id) return false;
      
      // Verificar si la vinculación es válida (jerarquía inmediata + excepción)
      // Probar ambas direcciones: e como hijo de selectedEstructura, y e como padre de selectedEstructura
      return esVinculacionValida(e.tipo, selectedEstructura.tipo) || 
             esVinculacionValida(selectedEstructura.tipo, e.tipo);
    });
  }, [selectedEstructura, estructuras]);

  // Comentado temporalmente para evitar el error 409
  // Solo ejecutamos actualizarVinculacionesUsuarios cuando el usuario hace cambios manuales
  // useEffect(() => {
  //   if (estructuras && estructuras.length > 0) {
  //     actualizarVinculacionesUsuarios();
  //   }
  // }, [estructuras]);

  const estructurasFiltradas = estructuras?.filter(estructura => {
    const matchesTipo = !filterTipo || estructura.tipo === filterTipo;
    const matchesNombre = !filterNombre || 
      estructura.nombre.toLowerCase().includes(filterNombre.toLowerCase()) ||
      (estructura.custom_name && estructura.custom_name.toLowerCase().includes(filterNombre.toLowerCase()));
    return matchesTipo && matchesNombre;
  });

  // Obtener estructuras raíz con lógica mejorada para priorizar jerarquía organizacional
  const estructurasRaiz = estructurasFiltradas
    ?.filter(e => {
      // Si no tiene padre, es candidata a raíz
      if (!e.parent_estructura_id) {
        // Priorizar estructuras de mayor jerarquía organizacional
        const nivelJerarquico = TIPOS_ESTRUCTURA.indexOf(e.tipo);
        
        // Verificar si hay estructuras de mayor jerarquía sin padre
        const hayEstructurasSuperior = estructurasFiltradas?.some(otra => 
          !otra.parent_estructura_id && 
          TIPOS_ESTRUCTURA.indexOf(otra.tipo) < nivelJerarquico
        );
        
        // Solo mostrar como raíz si no hay estructuras de mayor jerarquía
        return !hayEstructurasSuperior;
      }
      return false;
    })
    .sort((a, b) => {
      // Ordenar por tipo jerárquico primero (menor índice = mayor jerarquía)
      const tipoA = TIPOS_ESTRUCTURA.indexOf(a.tipo);
      const tipoB = TIPOS_ESTRUCTURA.indexOf(b.tipo);
      if (tipoA !== tipoB) return tipoA - tipoB;
      
      // Luego alfabéticamente por nombre
      const nombreA = a.custom_name || a.nombre;
      const nombreB = b.custom_name || b.nombre;
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    }) || [];

  // Detectar estructuras huérfanas (sin padre pero que deberían tenerlo según jerarquía)
  const estructurasHuerfanas = estructurasFiltradas
    ?.filter(e => {
      if (e.parent_estructura_id) return false; // Tiene padre, no es huérfana
      
      const nivelJerarquico = TIPOS_ESTRUCTURA.indexOf(e.tipo);
      
      // Verificar si hay estructuras de mayor jerarquía sin padre
      const hayEstructurasSuperior = estructurasFiltradas?.some(otra => 
        !otra.parent_estructura_id && 
        TIPOS_ESTRUCTURA.indexOf(otra.tipo) < nivelJerarquico
      );
      
      // Es huérfana si hay estructuras superiores y no está en estructurasRaiz
      return hayEstructurasSuperior && !estructurasRaiz?.some(raiz => raiz.id === e.id);
    })
    .sort((a, b) => {
      // Ordenar por tipo jerárquico primero
      const tipoA = TIPOS_ESTRUCTURA.indexOf(a.tipo);
      const tipoB = TIPOS_ESTRUCTURA.indexOf(b.tipo);
      if (tipoA !== tipoB) return tipoA - tipoB;
      
      // Luego alfabéticamente por nombre
      const nombreA = a.custom_name || a.nombre;
      const nombreB = b.custom_name || b.nombre;
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    }) || [];

  const estructurasNiveles = estructurasFiltradas?.reduce((acc, estructura) => {
    const nivel = TIPOS_ESTRUCTURA.indexOf(estructura.tipo);
    if (!acc[nivel]) acc[nivel] = [];
    acc[nivel].push(estructura);
    return acc;
  }, {} as Record<number, Estructura[]>);

  // Función para actualizar automáticamente las vinculaciones de usuarios con herencia
  const actualizarVinculacionesUsuarios = async () => {
    if (!estructuras) {
      console.warn("No hay estructuras cargadas para procesar");
      return;
    }
    
    try {
      console.log("🔄 Iniciando recálculo de vinculaciones heredadas...");
      
      // Obtener todos los usuarios ACTIVOS que están vinculados a estructuras
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select('id, estructura_id, user_position, email, nombre_completo, is_active')
        .eq('is_active', true) // Solo usuarios activos
        .not('estructura_id', 'is', null); // Solo usuarios con estructura asignada
        
      if (usersError) {
        console.error("Error obteniendo usuarios:", usersError);
        toast.error("Error al obtener usuarios para recalcular");
        return;
      }

      if (!users || users.length === 0) {
        console.log("No se encontraron usuarios activos con estructuras asignadas");
        toast.info("No hay usuarios activos con estructuras para procesar");
        return;
      }

      console.log(`📊 Procesando ${users.length} usuarios activos...`);
      let procesados = 0;
      let errores = 0;

      // Primero, limpiar vinculaciones huérfanas (usuarios que ya no existen)
      await limpiarVinculacionesHuerfanas();

      // Para cada usuario válido, recalcular sus vinculaciones heredadas
      for (const user of users) {
        if (!user.estructura_id) {
          console.warn(`Usuario ${user.email} no tiene estructura_id asignada`);
          continue;
        }
        
        try {
          console.log(`Procesando usuario: ${user.email} (${user.user_position})`);
          
          // Verificar que la estructura del usuario existe
          const estructuraUsuario = estructuras.find(e => e.id === user.estructura_id);
          if (!estructuraUsuario) {
            console.warn(`⚠️ Usuario ${user.email} tiene estructura_id ${user.estructura_id} que no existe`);
            continue;
          }

          // Calcular vinculaciones heredadas
          const vinculacionesHeredadas = herenciaUtils.obtenerVinculacionesHeredadas(user.estructura_id);
          console.log(`  → Vinculaciones calculadas: ${vinculacionesHeredadas.length}`);
          
          // Eliminar vinculaciones existentes del user_estructuras SOLO para este usuario
          const { error: deleteError } = await supabase
            .from("user_estructuras")
            .delete()
            .eq('user_id', user.id);
          
          if (deleteError) {
            console.error(`❌ Error eliminando vinculaciones para ${user.email}:`, deleteError);
            errores++;
            continue;
          }
          
          // Insertar nuevas vinculaciones heredadas
          if (vinculacionesHeredadas.length > 0) {
            const vinculacionesUsuario = vinculacionesHeredadas.map(estructuraId => ({
              user_id: user.id,
              estructura_id: estructuraId
            }));
            
            // Verificar que todas las estructuras existen antes de insertar
            const estructurasValidas = vinculacionesUsuario.filter(v => 
              estructuras.some(e => e.id === v.estructura_id)
            );
            
            if (estructurasValidas.length !== vinculacionesUsuario.length) {
              console.warn(`⚠️ Algunas estructuras para ${user.email} no son válidas`);
            }
            
            // Insertar solo las vinculaciones válidas
            if (estructurasValidas.length > 0) {
              const { error: insertError } = await supabase
                .from("user_estructuras")
                .insert(estructurasValidas);
              
              if (insertError) {
                console.error(`❌ Error insertando vinculaciones para ${user.email}:`, insertError);
                errores++;
              } else {
                console.log(`  ✅ Insertadas ${estructurasValidas.length} vinculaciones`);
                procesados++;
              }
            }
          } else {
            console.log(`  ℹ️ No hay vinculaciones heredadas para insertar`);
            procesados++;
          }
        } catch (userError) {
          console.error(`❌ Error procesando usuario ${user.email}:`, userError);
          errores++;
        }
      }

      // Resumen del proceso
      console.log(`🎯 Proceso completado: ${procesados} exitosos, ${errores} errores`);
      
      if (errores === 0) {
        toast.success(`✅ Vinculaciones actualizadas exitosamente para ${procesados} usuarios`);
      } else if (procesados > 0) {
        toast.warning(`⚠️ Procesados ${procesados} usuarios, ${errores} con errores`);
      } else {
        toast.error(`❌ No se pudieron procesar usuarios (${errores} errores)`);
      }

    } catch (error) {
      console.error("❌ Error general actualizando vinculaciones:", error);
      toast.error("Error general al recalcular vinculaciones heredadas");
    }
  };

  // Función auxiliar para limpiar vinculaciones huérfanas
  const limpiarVinculacionesHuerfanas = async () => {
    try {
      console.log("🧹 Limpiando vinculaciones huérfanas...");
      
      // Eliminar vinculaciones donde el user_id no existe en la tabla users
      const { error } = await supabase
        .from("user_estructuras")
        .delete()
        .not('user_id', 'in', `(SELECT id FROM users WHERE is_active = true)`);
      
      if (error) {
        console.error("Error limpiando vinculaciones huérfanas:", error);
      } else {
        console.log("✅ Vinculaciones huérfanas limpiadas");
      }
    } catch (error) {
      console.error("Error en limpieza:", error);
    }
  };

  const [isVinculando, setIsVinculando] = useState(false);

  const handleVincularEstructuras = async () => {
    if (!selectedEstructura || estructurasSeleccionadas.length === 0) {
      toast.error("Por favor seleccione al menos una estructura para vincular");
      return;
    }

    // Iniciar estado de carga
    setIsVinculando(true);
    const loadingToast = toast.loading("🔗 Vinculando estructuras, por favor espera...");

    try {
      const TIPOS_ESTRUCTURA = ['Empresa', 'Paises', 'Zonas', 'Filial', 'División', 'Organizaciones', 'Jefaturas', 'Sub Organización'];
      const nivelSeleccionada = TIPOS_ESTRUCTURA.indexOf(selectedEstructura.tipo);
      
      // Separar estructuras por tipo de vinculación
      const estructurasParaPadre: number[] = [];
      const estructurasParaHijos: number[] = [];
      
      estructurasSeleccionadas.forEach(id => {
        const estructura = estructuras?.find(e => e.id === id);
        if (!estructura) return;
        
        // Usar la nueva función de validación que incluye la excepción
        if (esVinculacionValida(selectedEstructura.tipo, estructura.tipo)) {
          // selectedEstructura puede ser hijo de estructura
          estructurasParaPadre.push(id);
        } else if (esVinculacionValida(estructura.tipo, selectedEstructura.tipo)) {
          // estructura puede ser hijo de selectedEstructura
          estructurasParaHijos.push(id);
        }
      });

      const updates: any[] = [];
      
      // Manejar vinculación como padre
      if (estructurasParaPadre.length > 0) {
        if (estructurasParaPadre.length > 1) {
          toast.dismiss(loadingToast);
          toast.error("Solo puedes vincular UNA estructura padre a la vez");
          setIsVinculando(false);
          return;
        }
        
        // Cambiar el padre de la estructura seleccionada
        updates.push({
          id: selectedEstructura.id,
          parent_estructura_id: estructurasParaPadre[0],
          nombre: selectedEstructura.nombre,
          tipo: selectedEstructura.tipo
        });
      }
      
      // Manejar vinculación como hijos
      if (estructurasParaHijos.length > 0) {
        estructurasParaHijos.forEach(id => {
          const estructura = estructuras?.find(e => e.id === id);
          if (estructura) {
            updates.push({
              id,
              parent_estructura_id: selectedEstructura.id,
              nombre: estructura.nombre,
              tipo: estructura.tipo
            });
          }
        });
      }

      if (updates.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("No hay vinculaciones válidas para procesar");
        setIsVinculando(false);
        return;
      }

      // Actualizar toast con progreso
      toast.dismiss(loadingToast);
      const updateToast = toast.loading("📝 Actualizando estructuras en la base de datos...");

      const { error } = await supabase
        .from("estructuras")
        .upsert(updates);

      if (error) {
        console.error("Error vinculando estructuras:", error);
        toast.dismiss(updateToast);
        toast.error("Error al vincular las estructuras");
        setIsVinculando(false);
        return;
      }

      // Actualizar toast para herencia
      toast.dismiss(updateToast);
      const herenciaToast = toast.loading("🔄 Aplicando herencia automática a usuarios...");

      // Actualizar las vinculaciones heredadas para los usuarios
      await actualizarVinculacionesUsuarios();

      toast.dismiss(herenciaToast);

      // Mostrar información sobre la vinculación
      let mensaje = "✅ Vinculaciones realizadas exitosamente:\n";
      
      if (estructurasParaPadre.length > 0) {
        const padreNombre = estructuras?.find(e => e.id === estructurasParaPadre[0])?.custom_name || 
                           estructuras?.find(e => e.id === estructurasParaPadre[0])?.nombre;
        mensaje += `• ${selectedEstructura.custom_name || selectedEstructura.nombre} ahora es hijo de ${padreNombre}\n`;
      }
      
      if (estructurasParaHijos.length > 0) {
        const hijosNombres = estructurasParaHijos.map(id => {
          const estructura = estructuras?.find(e => e.id === id);
          return estructura?.custom_name || estructura?.nombre || `ID: ${id}`;
        });
        mensaje += `• ${hijosNombres.join(', ')} ahora son hijos de ${selectedEstructura.custom_name || selectedEstructura.nombre}`;
      }

      toast.success(mensaje);
      
      setIsVinculacionModalOpen(false);
      setEstructurasSeleccionadas([]);
      refetch();
      
    } catch (error) {
      console.error("Error en vinculación:", error);
      toast.error("Error al procesar las vinculaciones");
    } finally {
      setIsVinculando(false);
    }
  };

  const handleCreateEstructura = async () => {
    if (!newEstructura.tipo || !newEstructura.nombre) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    const tienePermiso = permisosEstructura?.some(
      permiso => permiso.tipo_estructura === newEstructura.tipo
    );

    if (!tienePermiso) {
      toast.error("No tienes permiso para crear este tipo de estructura");
      return;
    }

    const { data, error } = await supabase
      .from("estructuras")
      .insert([{
        tipo: newEstructura.tipo,
        nombre: newEstructura.nombre,
        parent_estructura_id: newEstructura.parent_estructura_id,
      }])
      .select()
      .single();

    if (error) {
      console.error("Error creating estructura:", error);
      toast.error("Error al crear la estructura");
      return;
    }

    toast.success("Estructura creada exitosamente");
    setIsCreateModalOpen(false);
    setNewEstructura({ tipo: "", nombre: "", parent_estructura_id: null });
    refetch();
  };

  const toggleEstructura = (estructuraId: number) => {
    setExpandedEstructuras(prev => 
      prev.includes(estructuraId) 
        ? prev.filter(id => id !== estructuraId)
        : [...prev, estructuraId]
    );
  };

  const handleDeleteEstructura = async (estructuraId: number) => {
    try {
      const estructura = estructuras?.find(e => e.id === estructuraId);
      if (!estructura) {
        toast.error("Estructura no encontrada");
        return;
      }

      // Verificar si tiene estructuras hijas
      const estructurasHijas = estructuras?.filter(e => e.parent_estructura_id === estructuraId) || [];
      
      // Verificar si hay usuarios asignados
      const usuariosAsignados = usuariosPorEstructura?.[estructuraId] || [];

      if (estructurasHijas.length > 0 || usuariosAsignados.length > 0) {
        // Mostrar opciones para estructuras con dependencias
        const dependencias = [];
        if (estructurasHijas.length > 0) {
          dependencias.push(`${estructurasHijas.length} estructura(s) vinculada(s)`);
        }
        if (usuariosAsignados.length > 0) {
          dependencias.push(`${usuariosAsignados.length} usuario(s) asignado(s)`);
        }

        const confirmed = window.confirm(
          `⚠️ ADVERTENCIA: Esta estructura tiene ${dependencias.join(' y ')}.\n\n` +
          `¿Deseas continuar con la eliminación?\n\n` +
          `• Las estructuras hijas quedarán sin padre (se convertirán en raíz)\n` +
          `• Los usuarios asignados perderán su estructura organizacional\n` +
          `• Esta acción NO se puede deshacer\n\n` +
          `Escribe 'ELIMINAR' para confirmar:`
        );

        if (!confirmed) {
          return;
        }

        // Solicitar confirmación adicional
        const confirmText = prompt(
          `Para confirmar la eliminación, escribe exactamente: ELIMINAR`
        );

        if (confirmText !== 'ELIMINAR') {
          toast.error("Eliminación cancelada - Texto de confirmación incorrecto");
          return;
        }

        // Proceso de eliminación con dependencias
        const loadingToast = toast.loading("🗑️ Eliminando estructura y procesando dependencias...");

        try {
          // 1. Desvincular estructuras hijas (convertirlas en raíz)
          if (estructurasHijas.length > 0) {
            const { error: updateError } = await supabase
              .from("estructuras")
              .update({ parent_estructura_id: null })
              .eq("parent_estructura_id", estructuraId);

            if (updateError) {
              console.error("Error desvinculando estructuras hijas:", updateError);
              toast.dismiss(loadingToast);
              toast.error("Error al desvincular estructuras hijas");
              return;
            }
          }

          // 2. Desvincular usuarios (quitar estructura_id)
          if (usuariosAsignados.length > 0) {
            const { error: userUpdateError } = await supabase
              .from("users")
              .update({ estructura_id: null })
              .eq("estructura_id", estructuraId);

            if (userUpdateError) {
              console.error("Error desvinculando usuarios:", userUpdateError);
              toast.dismiss(loadingToast);
              toast.error("Error al desvincular usuarios");
              return;
            }

            // 3. Limpiar vinculaciones heredadas de estos usuarios
            const userIds = usuariosAsignados.map(u => u.id);
            const { error: userEstructurasError } = await supabase
              .from("user_estructuras")
              .delete()
              .in("user_id", userIds);

            if (userEstructurasError) {
              console.error("Error limpiando vinculaciones de usuarios:", userEstructurasError);
              // No es crítico, continuar
            }
          }

          // 4. Finalmente, eliminar la estructura
          const { error: deleteError } = await supabase
            .from("estructuras")
            .delete()
            .eq("id", estructuraId);

          if (deleteError) {
            console.error("Error eliminando estructura:", deleteError);
            toast.dismiss(loadingToast);
            toast.error("Error al eliminar la estructura principal");
            return;
          }

          toast.dismiss(loadingToast);
          toast.success(
            `✅ Estructura "${estructura.custom_name || estructura.nombre}" eliminada exitosamente.\n` +
            `${estructurasHijas.length > 0 ? `${estructurasHijas.length} estructura(s) convertida(s) en raíz. ` : ''}` +
            `${usuariosAsignados.length > 0 ? `${usuariosAsignados.length} usuario(s) desvinculado(s).` : ''}`
          );

        } catch (processingError) {
          console.error("Error durante el procesamiento:", processingError);
          toast.dismiss(loadingToast);
          toast.error("Error durante el proceso de eliminación");
          return;
        }

      } else {
        // Eliminación simple sin dependencias
        const { error } = await supabase
          .from("estructuras")
          .delete()
          .eq("id", estructuraId);

        if (error) {
          if (error.code === "23503") {
            toast.error(
              "❌ No se puede eliminar: Esta estructura tiene dependencias activas.\n" +
              "Verifica que no tenga estructuras vinculadas o usuarios asignados."
            );
            return;
          }
          console.error("Error deleting estructura:", error);
          toast.error(`Error al eliminar: ${error.message}`);
          return;
        }

        toast.success(`✅ Estructura "${estructura.custom_name || estructura.nombre}" eliminada exitosamente`);
      }

      // Actualizar datos
      refetch();
      setIsVinculacionModalOpen(false);

    } catch (error) {
      console.error("Error general en eliminación:", error);
      toast.error("Error inesperado durante la eliminación");
    }
  };

  const handleDesvincularEstructura = async (estructuraId: number) => {
    const estructura = estructuras?.find(e => e.id === estructuraId);
    if (!estructura) {
      toast.error("Estructura no encontrada");
      return;
    }

    const { error } = await supabase
      .from("estructuras")
      .update({ parent_estructura_id: null })
      .eq("id", estructuraId);

    if (error) {
      console.error("Error desvinculando estructura:", error);
      toast.error("Error al desvincular la estructura");
      return;
    }

    toast.success("Estructura desvinculada exitosamente");
    refetch();
  };

  const handleEditEstructura = (estructura: Estructura) => {
    setEditingEstructura(estructura);
    setEditForm({
      nombre: estructura.nombre,
      custom_name: estructura.custom_name || ""
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateEstructura = async () => {
    if (!editingEstructura) return;

    if (!editForm.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      const updateData: any = {
        nombre: editForm.nombre.trim(),
        custom_name: editForm.custom_name.trim() || null
      };

      const { error } = await supabase
        .from("estructuras")
        .update(updateData)
        .eq("id", editingEstructura.id);

      if (error) {
        console.error("Error updating estructura:", error);
        toast.error("Error al actualizar la estructura");
        return;
      }

      toast.success("Estructura actualizada exitosamente");
      setIsEditModalOpen(false);
      setEditingEstructura(null);
      setEditForm({ nombre: "", custom_name: "" });
      refetch();
    } catch (error) {
      console.error("Error updating estructura:", error);
      toast.error("Error al actualizar la estructura");
    }
  };

  const handleDeleteEstructuraFromCard = async (estructura: Estructura) => {
    await handleDeleteEstructura(estructura.id);
  };

  const handleShowUsuarios = (estructura: Estructura) => {
    setSelectedEstructuraUsuarios(estructura);
    setIsUsuariosModalOpen(true);
  };

  // Función para cambiar el padre de una estructura
  const handleCambiarPadre = async (estructuraId: number, newParentId: number | null) => {
    const estructura = estructuras?.find(e => e.id === estructuraId);
    if (!estructura) {
      toast.error("Estructura no encontrada");
      return;
    }

    // Validar que la nueva vinculación sea jerárquicamente válida
    if (newParentId !== null) {
      const esValida = herenciaUtils.esVinculacionValida(estructuraId, newParentId);
      if (!esValida) {
        const estructuraPadre = estructuras?.find(e => e.id === newParentId);
        toast.error(
          `❌ Vinculación inválida: No se puede vincular ${estructura.tipo} a ${estructuraPadre?.tipo}. ` +
          `La estructura padre debe ser de mayor jerarquía.`
        );
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("estructuras")
        .update({ parent_estructura_id: newParentId })
        .eq("id", estructuraId);

      if (error) {
        console.error("Error cambiando padre:", error);
        toast.error("Error al cambiar la estructura padre");
        return;
      }

      // Actualizar las vinculaciones heredadas para los usuarios
      await actualizarVinculacionesUsuarios();

      const mensajeExito = newParentId 
        ? `✅ Estructura "${estructura.custom_name || estructura.nombre}" vinculada exitosamente a "${
            estructuras?.find(e => e.id === newParentId)?.custom_name || 
            estructuras?.find(e => e.id === newParentId)?.nombre
          }" con herencia en cascada aplicada.`
        : `✅ Estructura "${estructura.custom_name || estructura.nombre}" convertida en estructura raíz.`;

      toast.success(mensajeExito);
      refetch();
    } catch (error) {
      console.error("Error en cambio de padre:", error);
      toast.error("Error al procesar el cambio de estructura padre");
    }
  };

  // Generar nodos y edges para el diagrama organizacional
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    if (!estructurasFiltradas) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodePositions = new Map<number, { x: number; y: number }>();

    // Función para calcular posiciones en forma de árbol
    const calculatePositions = (estructuras: Estructura[], startX = 0, startY = 0, levelWidth = 300) => {
      const levels: Record<number, Estructura[]> = {};
      
      // Agrupar por nivel jerárquico
      estructuras.forEach(estructura => {
        const nivel = TIPOS_ESTRUCTURA.indexOf(estructura.tipo);
        if (!levels[nivel]) levels[nivel] = [];
        levels[nivel].push(estructura);
      });

      let currentY = startY;
      Object.keys(levels).sort((a, b) => parseInt(a) - parseInt(b)).forEach(levelKey => {
        const level = parseInt(levelKey);
        const estructurasEnNivel = levels[level];
        const nodeWidth = 250;
        const spacing = nodeWidth + 50;
        const totalWidth = estructurasEnNivel.length * spacing;
        let currentX = startX - totalWidth / 2;

        estructurasEnNivel.forEach((estructura, index) => {
          nodePositions.set(estructura.id, {
            x: currentX + (index * spacing),
            y: currentY
          });
        });

        currentY += 150; // Espaciado vertical entre niveles
      });
    };

    // Calcular posiciones
    calculatePositions(estructurasFiltradas);

    // Crear nodos
    estructurasFiltradas.forEach(estructura => {
      const position = nodePositions.get(estructura.id) || { x: 0, y: 0 };
      const usuarios = usuariosPorEstructura?.[estructura.id] || [];

      nodes.push({
        id: estructura.id.toString(),
        type: 'estructuraNode',
        position,
        data: {
          estructura,
          usuarios,
          onEdit: handleEditEstructura,
          onShowUsuarios: handleShowUsuarios,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      });

      // Crear edges (conexiones)
      if (estructura.parent_estructura_id) {
        edges.push({
          id: `edge-${estructura.parent_estructura_id}-${estructura.id}`,
          source: estructura.parent_estructura_id.toString(),
          target: estructura.id.toString(),
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#64748b',
            strokeWidth: 2,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#64748b',
          },
        });
      }
    });

    return { nodes, edges };
  }, [estructurasFiltradas, usuariosPorEstructura, handleEditEstructura, handleShowUsuarios]);

  // Sincronizar datos del diagrama
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges]);

  // Manejar nuevas conexiones arrastrables
  const onConnect = useCallback(
    (params: Connection) => {
      const sourceId = parseInt(params.source || '');
      const targetId = parseInt(params.target || '');
      
      if (!sourceId || !targetId) return;

      // Validar vinculación válida (jerarquía inmediata + excepción Organizaciones ↔ Filial)
      const sourceEstructura = estructuras?.find(e => e.id === sourceId);
      const targetEstructura = estructuras?.find(e => e.id === targetId);
      
      if (!sourceEstructura || !targetEstructura) return;
      
      // source = padre, target = hijo
      const esValida = esVinculacionValida(targetEstructura.tipo, sourceEstructura.tipo);
      
      if (!esValida) {
        toast.error(
          `❌ Conexión inválida: No se puede conectar ${sourceEstructura.tipo} con ${targetEstructura.tipo}. ` +
          `Solo se permiten conexiones entre niveles jerárquicos inmediatos o la excepción Organizaciones ↔ Filial.`
        );
        return;
      }

      // Crear la conexión en la base de datos con herencia automática
      handleVincularEstructuraDirecta(targetId, sourceId);
      
      // Agregar edge visualmente
      setEdges((eds) => addEdge({
        ...params,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: '#10b981', // Verde para indicar conexión válida
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#10b981',
        },
      }, eds));
    },
    [estructuras, setEdges]
  );

  // Función para vincular estructura directamente desde el diagrama
  const handleVincularEstructuraDirecta = async (estructuraId: number, parentId: number) => {
    const estructura = estructuras?.find(e => e.id === estructuraId);
    const estructuraPadre = estructuras?.find(e => e.id === parentId);
    if (!estructura || !estructuraPadre) return;

    // Validar que la vinculación sea válida (jerarquía inmediata + excepción Organizaciones ↔ Filial)
    const esValida = esVinculacionValida(estructura.tipo, estructuraPadre.tipo);
    
    if (!esValida) {
      toast.error(
        `❌ Vinculación inválida: No se puede conectar ${estructura.tipo} con ${estructuraPadre.tipo}. ` +
        `Solo se permiten conexiones entre niveles jerárquicos inmediatos o la excepción Organizaciones ↔ Filial.`
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("estructuras")
        .update({ parent_estructura_id: parentId })
        .eq("id", estructuraId);

      if (error) {
        console.error("Error vinculando estructura:", error);
        toast.error("Error al vincular la estructura");
        return;
      }

      // Actualizar las vinculaciones heredadas para los usuarios
      await actualizarVinculacionesUsuarios();

      toast.success(
        `✅ Estructura "${estructura.custom_name || estructura.nombre}" vinculada exitosamente con herencia en cascada aplicada.`
      );
      refetch();
    } catch (error) {
      console.error("Error en vinculación directa:", error);
      toast.error("Error al procesar la vinculación");
    }
  };

  // Manejar eliminación de conexiones
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const targetId = parseInt(edge.target);
      
      if (window.confirm('¿Deseas desvincular esta estructura?')) {
        handleDesvincularEstructura(targetId);
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
    },
    [setEdges]
  );

  if (isLoadingProfile || isLoadingEstructuras) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error al cargar las estructuras
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Mi Perfil Organizacional</h2>
        <div className="space-y-2">
          <p><span className="font-medium">Nombre:</span> {userProfile?.nombre_completo}</p>
          <p><span className="font-medium">Posición:</span> {userProfile?.user_position}</p>
          <p><span className="font-medium">Email:</span> {userProfile?.email}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Gestión de Estructuras</h2>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-muted rounded-lg p-1">
              <Button
                variant={vistaActual === "tree" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("tree")}
                className="h-8"
              >
                <TreePine className="mr-1 h-4 w-4" />
                Árbol
              </Button>
              <Button
                variant={vistaActual === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("grid")}
                className="h-8"
              >
                <Grid3X3 className="mr-1 h-4 w-4" />
                Cuadrícula
              </Button>
              <Button
                variant={vistaActual === "diagram" ? "default" : "ghost"}
                size="sm"
                onClick={() => setVistaActual("diagram")}
                className="h-8"
              >
                <Network className="mr-1 h-4 w-4" />
                Diagrama
              </Button>
            </div>
            
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear Estructura
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Estructura</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Estructura</Label>
                    <Select
                      value={newEstructura.tipo}
                      onValueChange={(value) => 
                        setNewEstructura(prev => ({ ...prev, tipo: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_ESTRUCTURA.filter(tipo => 
                          permisosEstructura?.some(permiso => 
                            permiso.tipo_estructura === tipo
                          )
                        ).map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {TIPOS_ESTRUCTURA_LABELS[tipo]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre Personalizado</Label>
                    <Input
                      placeholder="Ingrese un nombre"
                      value={newEstructura.nombre}
                      onChange={(e) => 
                        setNewEstructura(prev => ({ ...prev, nombre: e.target.value }))
                      }
                    />
                  </div>

                  <Button className="w-full" onClick={handleCreateEstructura}>
                    Crear Estructura
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-[200px]">
            <Select
              value={filterTipo || "all"}
              onValueChange={(value) => setFilterTipo(value === "all" ? "" : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TIPOS_ESTRUCTURA.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {TIPOS_ESTRUCTURA_LABELS[tipo]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre"
                value={filterNombre}
                onChange={(e) => setFilterNombre(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {vistaActual === "tree" ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <TreePine className="h-4 w-4" />
              <span>Vista jerárquica - Estructuras organizadas desde Empresa → Paises → Zonas → Filial → División → Organizacion → Jefatura (⭐ Excepción: Organizaciones ↔ Filial)</span>
            </div>
            
            {estructurasRaiz.length > 0 ? (
              <div className="space-y-1">
                {estructurasRaiz.map((estructura) => (
                  <EstructuraTreeNode
                    key={estructura.id}
                    estructura={estructura}
                    usuarios={usuariosPorEstructura?.[estructura.id] || []}
                    nivel={0}
                    onEdit={handleEditEstructura}
                    onDelete={handleDeleteEstructuraFromCard}
                    onShowUsuarios={handleShowUsuarios}
                    onVincular={(estructura) => {
                      setSelectedEstructura(estructura);
                      setIsVinculacionModalOpen(true);
                    }}
                    allEstructuras={estructurasFiltradas || []}
                    usuariosPorEstructura={usuariosPorEstructura || {}}
                  />
                ))}
                
                {/* Mostrar estructuras huérfanas si las hay */}
                {estructurasHuerfanas && estructurasHuerfanas.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-orange-200">
                    <div className="flex items-center space-x-2 mb-4 text-orange-600">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-sm font-medium">Estructuras sin vincular correctamente</span>
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-orange-700">
                        ⚠️ Las siguientes estructuras no están vinculadas a una estructura padre apropiada según la jerarquía organizacional. 
                        Considera vincularlas a la estructura correspondiente.
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      {estructurasHuerfanas.map((estructura) => (
                        <div key={estructura.id} className="border-l-4 border-orange-300 pl-2">
                          <EstructuraTreeNode
                            estructura={estructura}
                            usuarios={usuariosPorEstructura?.[estructura.id] || []}
                            nivel={0}
                            onEdit={handleEditEstructura}
                            onDelete={handleDeleteEstructuraFromCard}
                            onShowUsuarios={handleShowUsuarios}
                            onVincular={(estructura) => {
                              setSelectedEstructura(estructura);
                              setIsVinculacionModalOpen(true);
                            }}
                            allEstructuras={estructurasFiltradas || []}
                            usuariosPorEstructura={usuariosPorEstructura || {}}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TreePine className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No se encontraron estructuras que coincidan con los filtros</p>
              </div>
            )}
          </div>
        ) : vistaActual === "grid" ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Grid3X3 className="h-4 w-4" />
              <span>Vista por cuadrícula - Las estructuras se agrupan por tipo</span>
            </div>
            
            {TIPOS_ESTRUCTURA.map((tipo, index) => {
              const estructurasDelNivel = estructurasNiveles?.[index]?.sort((a, b) => {
                // Ordenar alfabéticamente por nombre dentro de cada tipo
                const nombreA = a.custom_name || a.nombre;
                const nombreB = b.custom_name || b.nombre;
                return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
              }) || [];
              
              if (estructurasDelNivel.length === 0) return null;

              return (
                <div key={tipo} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-lg">{tipo}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {estructurasDelNivel.length}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {estructurasDelNivel.map((estructura) => (
                      <EstructuraCard
                        key={estructura.id}
                        estructura={estructura}
                        usuarios={usuariosPorEstructura?.[estructura.id] || []}
                        onEdit={handleEditEstructura}
                        onDelete={handleDeleteEstructuraFromCard}
                        onShowUsuarios={handleShowUsuarios}
                        onVincular={(estructura) => {
                          setSelectedEstructura(estructura);
                          setIsVinculacionModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
              <Network className="h-4 w-4" />
              <span>Vista de diagrama - Mapa interactivo de la estructura organizacional con conexiones visuales</span>
            </div>
            
            {/* Leyenda de interactividad */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Funciones Interactivas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-blue-700">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full"></div>
                  <span>Arrastra desde el punto inferior para crear conexiones</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🖱️</span>
                  <span>Haz clic en una flecha para desvincular estructuras</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Usa la rueda del mouse para hacer zoom</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>✋</span>
                  <span>Arrastra el fondo para mover la vista</span>
                </div>
              </div>
            </div>
            
            <div className="h-[600px] w-full border rounded-lg bg-gray-50">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onEdgeClick={onEdgeClick}
                connectionMode={ConnectionMode.Loose}
                fitView
                fitViewOptions={{
                  padding: 0.2,
                  includeHiddenNodes: false,
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                minZoom={0.1}
                maxZoom={2}
                attributionPosition="bottom-left"
              >
                <Background color="#aaa" gap={16} />
                <Controls />
              </ReactFlow>
            </div>
            
            {estructurasHuerfanas && estructurasHuerfanas.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 text-orange-600 mb-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-sm font-medium">Estructuras desconectadas detectadas</span>
                </div>
                <p className="text-sm text-orange-700">
                  Se encontraron {estructurasHuerfanas.length} estructura(s) que no están correctamente vinculadas. 
                  Estas aparecen como nodos aislados en el diagrama.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog 
        open={isVinculacionModalOpen} 
        onOpenChange={(open) => {
          // No permitir cerrar el modal mientras se está vinculando
          if (!isVinculando) {
            setIsVinculacionModalOpen(open);
            if (!open) {
              setEstructurasSeleccionadas([]);
            }
          }
        }}
      >
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Gestión de Estructura: {selectedEstructura?.custom_name || selectedEstructura?.nombre}
            </DialogTitle>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Badge variant="outline">{selectedEstructura?.tipo}</Badge>
              <span>•</span>
              <span>{estructurasVinculables.length} estructura(s) disponible(s) para vincular</span>
            </div>
            {/* Agregar la cadena jerárquica */}
            {selectedEstructura && (
              <div className="space-y-2">
                <CadenaJerarquica 
                  estructuraId={selectedEstructura.id} 
                  estructuras={estructuras || []} 
                />
                
                {/* Mostrar estructuras vinculadas heredadas */}
                <div className="text-sm bg-green-50 border border-green-200 rounded-md p-2">
                  <span className="font-medium text-green-800">
                    📋 Vinculaciones heredadas totales: {selectedEstructuraStats?.vinculacionesHeredadas.length || 0} estructuras
                  </span>
                  <p className="text-green-700 text-xs mt-1">
                    Esta estructura tiene acceso automático a todas las estructuras en su cadena jerárquica
                  </p>
                </div>
              </div>
            )}
          </DialogHeader>
          
          {/* SECCIÓN PRINCIPAL DE VINCULACIÓN */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-slate-300 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <span>Gestión de Vinculaciones</span>
            </h3>
            
            {/* Lógica unificada - PADRES E HIJOS */}
            {(() => {
              const tiposQuePermitienMultiples = ['Empresa', 'Paises', 'Zonas', 'Filial', 'División'];
              const puedeVincularMultiples = selectedEstructura && tiposQuePermitienMultiples.includes(selectedEstructura.tipo);
              
              // OBTENER TODAS LAS ESTRUCTURAS VINCULABLES (PADRES E HIJOS)
              const todasLasEstructurasVinculables = estructuras?.filter(estructura => {
                // No incluir la estructura actual
                if (estructura.id === selectedEstructura?.id) return false;
                
                // No incluir estructuras que ya están vinculadas como hijos
                if (estructura.parent_estructura_id === selectedEstructura?.id) return false;
                
                // No incluir la estructura padre actual (ya está vinculada)
                if (selectedEstructura?.parent_estructura_id === estructura.id) return false;
                
                return true;
              }) || [];
              
              // Separar por categorías - JERARQUÍA INMEDIATA + EXCEPCIÓN Organizaciones ↔ Filial
              const estructurasPadres = todasLasEstructurasVinculables.filter(estructura => {
                // estructura puede ser padre de selectedEstructura
                return selectedEstructura && esVinculacionValida(selectedEstructura.tipo, estructura.tipo);
              });
              
              const estructurasHijos = todasLasEstructurasVinculables.filter(estructura => {
                // estructura puede ser hijo de selectedEstructura
                return selectedEstructura && esVinculacionValida(estructura.tipo, selectedEstructura.tipo);
              });
              
              console.log('🔍 LÓGICA UNIFICADA:', {
                tipoEstructura: selectedEstructura?.tipo,
                puedeVincularMultiples,
                totalDisponibles: todasLasEstructurasVinculables.length,
                padresPosibles: estructurasPadres.length,
                hijosPosibles: estructurasHijos.length,
                tiposPermitidos: tiposQuePermitienMultiples
              });
              
              return { 
                puedeVincularMultiples, 
                todasLasEstructurasVinculables,
                estructurasPadres,
                estructurasHijos
              };
            })().puedeVincularMultiples ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-green-800 bg-green-100 px-2 py-1 rounded">
                    ✅ {selectedEstructura?.tipo} - Vinculación bidireccional ACTIVA
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {estructurasSeleccionadas.length} seleccionada(s)
                  </Badge>
                </div>
                
                {(() => {
                  const data = (() => {
                    const tiposQuePermitienMultiples = ['Empresa', 'Paises', 'Zonas', 'Filial', 'División'];
                    const puedeVincularMultiples = selectedEstructura && tiposQuePermitienMultiples.includes(selectedEstructura.tipo);
                    
                    const todasLasEstructurasVinculables = estructuras?.filter(estructura => {
                      if (estructura.id === selectedEstructura?.id) return false;
                      if (estructura.parent_estructura_id === selectedEstructura?.id) return false;
                      if (selectedEstructura?.parent_estructura_id === estructura.id) return false;
                      return true;
                    }) || [];
                    
                    const estructurasPadres = todasLasEstructurasVinculables.filter(estructura => {
                      const TIPOS_ESTRUCTURA = ['Empresa', 'Paises', 'Zonas', 'Filial', 'División', 'Organizaciones', 'Jefaturas', 'Sub Organización'];
                      const nivelEstructura = TIPOS_ESTRUCTURA.indexOf(estructura.tipo);
                      const nivelSeleccionada = TIPOS_ESTRUCTURA.indexOf(selectedEstructura?.tipo || '');
                      return nivelEstructura < nivelSeleccionada;
                    });
                    
                    const estructurasHijos = todasLasEstructurasVinculables.filter(estructura => {
                      // estructura puede ser hijo de selectedEstructura (incluye excepción)
                      return selectedEstructura && esVinculacionValida(estructura.tipo, selectedEstructura.tipo);
                    });
                    
                    return { todasLasEstructurasVinculables, estructurasPadres, estructurasHijos };
                  })();
                  
                  if (data.todasLasEstructurasVinculables.length === 0) {
                    return (
                      <div className="text-center py-6 text-muted-foreground bg-white rounded p-4">
                        <div className="mb-2">📭</div>
                        <p className="text-sm">No hay estructuras disponibles para vincular</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4 max-h-[300px] overflow-y-auto bg-white rounded p-3">
                      <p className="text-sm font-bold text-green-800 mb-2">
                        ✅ Selecciona múltiples estructuras ({data.todasLasEstructurasVinculables.length} disponibles):
                      </p>
                      
                      {/* Estructuras padres (mayor jerarquía) */}
                      {data.estructurasPadres.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-bold text-blue-700 mb-2 uppercase">
                            📈 Vincular como PADRE ({data.estructurasPadres.length}):
                          </h4>
                          <div className="space-y-1">
                            {data.estructurasPadres.map((estructura) => (
                              <label key={estructura.id} className="flex items-center space-x-3 hover:bg-blue-50 p-2 rounded cursor-pointer border border-blue-200">
                                <input
                                  type="checkbox"
                                  checked={estructurasSeleccionadas.includes(estructura.id)}
                                  onChange={(e) => {
                                    const id = estructura.id;
                                    setEstructurasSeleccionadas(prev => 
                                      e.target.checked
                                        ? [...prev, id]
                                        : prev.filter(x => x !== id)
                                    );
                                  }}
                                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {estructura.custom_name || estructura.nombre}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    {estructura.tipo}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Estructuras hijos (menor jerarquía) */}
                      {data.estructurasHijos.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-green-700 mb-2 uppercase">
                            📉 Vincular como HIJOS ({data.estructurasHijos.length}):
                          </h4>
                          <div className="space-y-1">
                            {data.estructurasHijos.map((estructura) => (
                              <label key={estructura.id} className="flex items-center space-x-3 hover:bg-green-50 p-2 rounded cursor-pointer border border-green-200">
                                <input
                                  type="checkbox"
                                  checked={estructurasSeleccionadas.includes(estructura.id)}
                                  onChange={(e) => {
                                    const id = estructura.id;
                                    setEstructurasSeleccionadas(prev => 
                                      e.target.checked
                                        ? [...prev, id]
                                        : prev.filter(x => x !== id)
                                    );
                                  }}
                                  className="form-checkbox h-4 w-4 text-green-600 rounded"
                                />
                                <div className="flex-1">
                                  <div className="font-medium text-sm">
                                    {estructura.custom_name || estructura.nombre}
                                  </div>
                                  <div className="text-xs text-green-600">
                                    {estructura.tipo}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-sm text-yellow-700 mb-2 bg-yellow-100 px-2 py-1 rounded">
                  ⚠️ {selectedEstructura?.tipo} - Selección única
                </div>
                <Select
                  value={estructurasSeleccionadas[0]?.toString() || ""}
                  onValueChange={(value) => {
                    const id = parseInt(value);
                    setEstructurasSeleccionadas([id]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar estructura para vincular..." />
                  </SelectTrigger>
                  <SelectContent>
                    {estructurasVinculables.map((estructura) => (
                      <SelectItem key={estructura.id} value={estructura.id.toString()}>
                        {estructura.custom_name || estructura.nombre} ({estructura.tipo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          
          {/* Información sobre herencia */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="font-medium text-blue-800 text-sm">Sistema de Herencia Automática</span>
            </div>
            <p className="text-sm text-blue-700">
              Las estructuras vinculadas heredan automáticamente todas las conexiones de su estructura padre, 
              creando una cadena jerárquica completa para el control de acceso.
            </p>
          </div>
          

          


          <div className="space-y-4 flex-1 overflow-y-auto pr-2">

            <div>
              <h3 className="text-lg font-medium mb-4">📋 Estructuras Vinculadas Directamente</h3>
              
              {/* Mostrar padre si existe */}
              {selectedEstructura?.parent_estructura_id && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">⬆️ Estructura Padre:</h4>
                  <div className="relative bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <EstructuraVinculada
                      estructura={estructuras?.find(e => e.id === selectedEstructura.parent_estructura_id)!}
                      usuarios={usuariosPorEstructura?.[selectedEstructura.parent_estructura_id] || []}
                      isOpen={expandedEstructuras.includes(selectedEstructura.parent_estructura_id)}
                      onToggle={() => toggleEstructura(selectedEstructura.parent_estructura_id!)}
                      estructuraPadre={null}
                      allEstructuras={estructuras || []}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                      onClick={() => handleDesvincularEstructura(selectedEstructura.id)}
                    >
                      ✂️ Desvincular
                    </Button>
                  </div>
                </div>
              )}

              {/* Mostrar hijos si existen */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">⬇️ Estructuras Hijas:</h4>

                {estructuras
                  ?.filter(e => e.parent_estructura_id === selectedEstructura?.id)
                  .length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground bg-gray-50 rounded-lg border-2 border-dashed">
                      <p className="text-sm">📭 No hay estructuras hijas vinculadas</p>
                      <p className="text-xs mt-1">
                        Usa la sección verde de abajo para vincular nuevas estructuras
                      </p>
                    </div>
                  ) : (
                    estructuras
                      ?.filter(e => e.parent_estructura_id === selectedEstructura?.id)
                      .map(estructura => {
                        const usuariosDeEstructura = usuariosPorEstructura?.[estructura.id] || [];
                        
                        return (
                          <div key={estructura.id} className="relative bg-green-50 border border-green-200 rounded-lg p-3">
                            <EstructuraVinculada
                              estructura={estructura}
                              usuarios={usuariosDeEstructura}
                              isOpen={expandedEstructuras.includes(estructura.id)}
                              onToggle={() => toggleEstructura(estructura.id)}
                              estructuraPadre={selectedEstructura}
                              allEstructuras={estructuras || []}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="absolute top-2 right-2 bg-red-50 hover:bg-red-100 text-red-600 border-red-200"
                              onClick={() => handleDesvincularEstructura(estructura.id)}
                            >
                              ✂️ Desvincular
                            </Button>
                          </div>
                        );
                      })
                  )}
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">➕ Vincular Nuevas Estructuras Como Hijos</h4>
              {selectedEstructura && (
                <div className="text-sm text-green-700 mb-3">
                  <p>Puedes vincular estructuras de <strong>jerarquía inmediata</strong> a {selectedEstructura.tipo}:</p>
                  <div className="text-xs mt-1 bg-white/50 p-2 rounded border">
                    {selectedEstructura.tipo === 'Empresa' && '🔽 Como hijo: Paises'}
                    {selectedEstructura.tipo === 'Paises' && '🔼 Como padre: Empresa | 🔽 Como hijo: Zonas'}
                    {selectedEstructura.tipo === 'Zonas' && '🔼 Como padre: Paises | 🔽 Como hijo: Filial'}
                    {selectedEstructura.tipo === 'Filial' && '🔼 Como padre: Zonas | 🔽 Como hijo: División | ⭐ Excepción: Organizaciones'}
                    {selectedEstructura.tipo === 'División' && '🔼 Como padre: Filial | 🔽 Como hijo: Organizaciones'}
                    {selectedEstructura.tipo === 'Organizaciones' && '🔼 Como padre: División | 🔽 Como hijo: Jefaturas | ⭐ Excepción: Filial'}
                    {selectedEstructura.tipo === 'Jefaturas' && '🔼 Como padre: Organizaciones | 🔽 Como hijo: Sub Organización'}
                    {selectedEstructura.tipo === 'Sub Organización' && '🔼 Como padre: Jefaturas (nivel más bajo, sin hijos)'}
                  </div>
                </div>
              )}
              
              {/* Sección de vinculación - BASADO EN TIPO DE ESTRUCTURA */}
              <div className="mt-2 space-y-2 border rounded-md p-3">
                {/* MÚLTIPLES VINCULACIONES SEGÚN TIPO DE ESTRUCTURA */}
                {(() => {
                  // Estructuras que pueden tener múltiples hijos del mismo tipo
                  const tiposQuePermitienMultiples = ['Empresa', 'Paises', 'Zonas', 'Filial', 'División'];
                  const puedeVincularMultiples = selectedEstructura && tiposQuePermitienMultiples.includes(selectedEstructura.tipo);
                  
                  console.log('🔍 LÓGICA DE ESTRUCTURA:', {
                    tipoEstructura: selectedEstructura?.tipo,
                    puedeVincularMultiples,
                    estructurasDisponibles: estructurasVinculables.length
                  });
                  
                  return puedeVincularMultiples;
                })() ? (
                                      <div className="space-y-2">
                     <div className="flex items-center justify-between mb-3">
                       <div className="text-sm font-medium text-green-800 bg-green-100 px-2 py-1 rounded">
                         ✅ {selectedEstructura?.tipo} - Selección múltiple habilitada
                       </div>
                      <Badge variant="secondary" className="text-xs">
                        {estructurasSeleccionadas.length} seleccionada(s)
                      </Badge>
                    </div>
                    
                    {estructurasVinculables.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <div className="mb-2">📭</div>
                        <p className="text-sm">No hay estructuras disponibles para vincular</p>
                        <p className="text-xs mt-1">
                          Solo se muestran estructuras de menor jerarquía que pueden ser vinculadas correctamente
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {estructurasVinculables.map((estructura) => (
                          <label key={estructura.id} className="flex items-center space-x-3 hover:bg-green-100 p-3 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-green-300">
                            <input
                              type="checkbox"
                              checked={estructurasSeleccionadas.includes(estructura.id)}
                              onChange={(e) => {
                                const id = estructura.id;
                                setEstructurasSeleccionadas(prev => 
                                  e.target.checked
                                    ? [...prev, id]
                                    : prev.filter(x => x !== id)
                                );
                              }}
                              className="form-checkbox h-4 w-4 text-green-600 rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {estructura.custom_name || estructura.nombre}
                              </div>
                              <div className="text-xs text-green-600">
                                {estructura.tipo}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                                 ) : (
                   <div className="space-y-2">
                     <div className="text-sm text-yellow-700 mb-2 bg-yellow-100 px-2 py-1 rounded">
                       ⚠️ {selectedEstructura?.tipo} - Selección única
                     </div>
                    <Select
                      value={estructurasSeleccionadas[0]?.toString() || ""}
                      onValueChange={(value) => {
                        const id = parseInt(value);
                        setEstructurasSeleccionadas([id]);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar estructura para vincular..." />
                      </SelectTrigger>
                      <SelectContent>
                        {estructurasVinculables.map((estructura) => (
                          <SelectItem key={estructura.id} value={estructura.id.toString()}>
                            {estructura.custom_name || estructura.nombre} ({estructura.tipo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Sección de estadísticas detalladas */}
            {selectedEstructura && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-3">📊 Información Detallada de Vinculaciones</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-slate-600">Estructuras Padre Disponibles:</span>
                    <p className="text-slate-700">{selectedEstructuraStats?.padresPosibles.length || 0}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Estructuras Hijo Vinculables:</span>
                    <p className="text-slate-700">
                      {estructurasVinculables.length}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Hijos Directos:</span>
                    <p className="text-slate-700">{selectedEstructuraStats?.estadisticas.hijosDirectos || 0}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-600">Total en Red:</span>
                    <p className="text-slate-700">{selectedEstructuraStats?.estadisticas.totalVinculaciones || 0}</p>
                  </div>
                </div>
                
                {/* Mostrar qué tipos de estructura pueden ser vinculados */}
                <div className="mt-3 pt-3 border-t border-slate-300">
                  <span className="font-medium text-slate-600 text-sm">Tipos de jerarquía inmediata disponibles:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => {
                      const selectedNivel = TIPOS_ESTRUCTURA.indexOf(selectedEstructura.tipo);
                      const tiposDisponibles = [];
                      
                      // Obtener todos los tipos disponibles usando la nueva función de validación
                      TIPOS_ESTRUCTURA.forEach(tipo => {
                        if (tipo === selectedEstructura.tipo) return; // No incluir a sí mismo
                        
                        // Verificar si puede ser padre
                        if (esVinculacionValida(selectedEstructura.tipo, tipo)) {
                          tiposDisponibles.push({ tipo, categoria: 'padre' });
                        }
                        // Verificar si puede ser hijo
                        else if (esVinculacionValida(tipo, selectedEstructura.tipo)) {
                          tiposDisponibles.push({ tipo, categoria: 'hijo' });
                        }
                      });
                      
                      return tiposDisponibles.length > 0 ? (
                        tiposDisponibles.map(({ tipo, categoria }) => {
                          const esExcepcion = 
                            (selectedEstructura.tipo === 'Organizaciones' && tipo === 'Filial') ||
                            (selectedEstructura.tipo === 'Filial' && tipo === 'Organizaciones');
                          
                          return (
                            <Badge 
                              key={tipo} 
                              variant="outline" 
                              className={`text-xs ${
                                esExcepcion 
                                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200' 
                                  : categoria === 'padre' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {esExcepcion ? '⭐' : categoria === 'padre' ? '🔼' : '🔽'} {tipo}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">
                          No hay tipos de jerarquía inmediata disponibles
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                onClick={() => {
                  setNewEstructura(prev => ({ ...prev, parent_estructura_id: selectedEstructura?.id || null }));
                  setIsCreateModalOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Crear Nueva Estructura
              </Button>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={async () => {
                  const loadingToast = toast.loading("🔄 Recalculando vinculaciones heredadas...");
                  try {
                    await actualizarVinculacionesUsuarios();
                    // El toast de éxito/error se maneja dentro de la función
                  } catch (error) {
                    toast.error("❌ Error durante el recálculo");
                    console.error("Error en recálculo manual:", error);
                  } finally {
                    toast.dismiss(loadingToast);
                  }
                }}
                title="Recalcula automáticamente todas las vinculaciones heredadas para todos los usuarios activos"
              >
                🔄 Recalcular Herencia
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsVinculacionModalOpen(false);
                  setEstructurasSeleccionadas([]);
                }}
                disabled={isVinculando}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleVincularEstructuras}
                disabled={estructurasSeleccionadas.length === 0 || isVinculando}
              >
                {isVinculando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    Vincular {estructurasSeleccionadas.length > 0 ? `(${estructurasSeleccionadas.length})` : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para mostrar usuarios vinculados */}
      <Dialog open={isUsuariosModalOpen} onOpenChange={setIsUsuariosModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>
                Usuarios en: {selectedEstructuraUsuarios?.custom_name || selectedEstructuraUsuarios?.nombre}
              </span>
              <Badge variant="outline" className="ml-2">
                {selectedEstructuraUsuarios?.tipo}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {selectedEstructuraUsuarios && usuariosPorEstructura?.[selectedEstructuraUsuarios.id] ? (
              <div className="space-y-3">
                {usuariosPorEstructura[selectedEstructuraUsuarios.id].map((usuario) => {
                  const supervisor = usuariosPorEstructura[selectedEstructuraUsuarios.id]?.find(u => u.id === usuario.supervisor_id);
                  const esMultiEstructura = hasMultiEstructura(usuario.user_position);
                  
                  return (
                    <div key={usuario.id} className="p-4 bg-slate-50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold text-lg">{usuario.nombre_completo}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {usuario.user_position}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p className="flex items-center space-x-2">
                              <span className="font-medium">Email:</span>
                              <span>{usuario.email}</span>
                            </p>
                            
                            {supervisor && (
                              <p className="flex items-center space-x-2">
                                <span className="font-medium">Supervisor:</span>
                                <span>{supervisor.nombre_completo}</span>
                              </p>
                            )}
                          </div>
                          
                          {esMultiEstructura && usuario.estructuras && usuario.estructuras.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                Estructuras adicionales:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {usuario.estructuras.map(e => {
                                  const estructuraInfo = estructuras?.find(es => es.id === e.id);
                                  return estructuraInfo && estructuraInfo.id !== selectedEstructuraUsuarios.id ? (
                                    <Badge 
                                      key={e.id}
                                      variant="outline" 
                                      className="text-xs"
                                    >
                                      {estructuraInfo.custom_name || estructuraInfo.nombre}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No hay usuarios vinculados a esta estructura</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsUsuariosModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para editar estructura */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Estructura</DialogTitle>
            <DialogDescription>
              Modifica el nombre de la estructura "{editingEstructura?.custom_name || editingEstructura?.nombre}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Estructura</Label>
              <Input
                value={editingEstructura?.tipo || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El tipo de estructura no se puede modificar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre Base *</Label>
              <Input
                id="edit-nombre"
                placeholder="Nombre base de la estructura"
                value={editForm.nombre}
                onChange={(e) => 
                  setEditForm(prev => ({ ...prev, nombre: e.target.value }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Este es el nombre base que se usa internamente
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-custom-name">Nombre Personalizado</Label>
              <Input
                id="edit-custom-name"
                placeholder="Nombre personalizado (opcional)"
                value={editForm.custom_name}
                onChange={(e) => 
                  setEditForm(prev => ({ ...prev, custom_name: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Si se proporciona, este nombre se mostrará en lugar del nombre base
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-medium text-blue-800 mb-1">Vista previa:</h4>
              <p className="text-sm text-blue-700">
                Se mostrará como: <strong>
                  {editForm.custom_name.trim() || editForm.nombre.trim() || "Sin nombre"}
                </strong>
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingEstructura(null);
                setEditForm({ nombre: "", custom_name: "" });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateEstructura}
              disabled={!editForm.nombre.trim()}
            >
              Actualizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organizacion;
