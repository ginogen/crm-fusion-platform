import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Ban, Edit, RefreshCw, Eye, EyeOff, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminApi } from "@/lib/admin-api"; // API segura para operaciones administrativas
import { ROLES, STRUCTURE_TYPES, STRUCTURE_TYPES_MAPPING, MULTI_ESTRUCTURA_POSITIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
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
import { getAllSubordinatesRecursively } from "@/lib/hierarchy-utils";
import { useEstructuraHerencia } from "@/hooks/useEstructuraHerencia";

// Definir el tipo para las posiciones
type JerarquiaPosicion = typeof JERARQUIA_POSICIONES[number];

interface UserData {
  id: string;
  email: string;
  nombre_completo: string;
  user_position: JerarquiaPosicion;
  role: string;
  created_at: string;
  estructura_id: number;
  supervisor_id: string | null;
  is_active: boolean;
  estructuras?: Estructura[];
}

interface Estructura {
  id: number;
  tipo: string;
  nombre: string;
  custom_name: string | null;
  parent_estructura_id: number | null;
}

const JERARQUIA_POSICIONES = [
  'CEO',
  'Director Internacional',
  'Director Nacional',
  'Director de Zona',
  'Sales Manager',
  'Gerente Divisional',
  'Gerente',
  'Jefe de Grupo',
  'Full Executive',
  'Asesor Training'
] as const;

const obtenerSupervisoresPotenciales = (allUsers: any[], posicionSeleccionada: JerarquiaPosicion) => {
  const posicionIndex = JERARQUIA_POSICIONES.indexOf(posicionSeleccionada);
  if (posicionIndex <= 0) return []; // CEO no tiene supervisor

  return allUsers.filter(usuario => {
    const supervisorIndex = JERARQUIA_POSICIONES.indexOf(usuario.user_position);
    return supervisorIndex < posicionIndex;
  }).sort((a, b) => {
    const indexA = JERARQUIA_POSICIONES.indexOf(a.user_position);
    const indexB = JERARQUIA_POSICIONES.indexOf(b.user_position);
    return indexA - indexB;
  });
};

const RESTRICTED_POSITIONS = {
  ASESOR_TRAINING: 'Asesor Training',
  FULL_EXECUTIVE: 'Full Executive',
  TEAM_MANAGER: 'Jefe de Grupo',
  GERENTE: 'Gerente',
  GERENTE_DIVISIONAL: 'Gerente Divisional',
  SALES_MANAGER: 'Sales Manager',
  DIRECTOR_ZONA: 'Director de Zona',
  DIRECTOR_NACIONAL: 'Director Nacional',
  DIRECTOR_INTERNACIONAL: 'Director Internacional',
  CEO: 'CEO'
} as const;

// Función para obtener el nivel jerárquico
const getNivelJerarquico = (position: JerarquiaPosicion) => {
  return JERARQUIA_POSICIONES.indexOf(position);
};

// Función para verificar si puede ver usuarios
const canViewUser = (currentUserPosition: JerarquiaPosicion, targetUserPosition: JerarquiaPosicion) => {
  const currentLevel = getNivelJerarquico(currentUserPosition);
  const targetLevel = getNivelJerarquico(targetUserPosition);
  return currentLevel < targetLevel;
};

// Función para verificar permisos de edición
const canEditUsers = (userPosition?: JerarquiaPosicion) => {
  if (!userPosition) return false;
  
  // Permitir desde Gerente hacia arriba
  const allowedPositions = [
    'CEO',
    'Director Internacional', 
    'Director Nacional',
    'Director de Zona',
    'Sales Manager',
    'Gerente Divisional',
    'Gerente'
  ];
  
  return allowedPositions.includes(userPosition);
};

// Función para verificar si puede crear usuarios
const canCreateUsers = (userPosition?: JerarquiaPosicion) => {
  if (!userPosition) return false;
  
  // Permitir desde Jefe de Grupo hacia arriba
  const allowedPositions = [
    'CEO',
    'Director Internacional',
    'Director Nacional', 
    'Director de Zona',
    'Sales Manager',
    'Gerente Divisional',
    'Gerente',
    'Jefe de Grupo'
  ];
  
  return allowedPositions.includes(userPosition);
};

// Función para verificar si puede modificar cargos
const canEditPositions = (userPosition?: JerarquiaPosicion) => {
  if (!userPosition) return false;
  
  // Desde SALES MANAGER hacia arriba pueden editar cargos
  const allowedPositions = [
    'CEO',
    'Director Internacional',
    'Director Nacional',
    'Director de Zona',
    'Sales Manager'
  ];
  
  return allowedPositions.includes(userPosition);
};

// Nueva función para obtener cargos que se pueden editar según la posición del usuario
const getCargosEditablesParaEdicion = (userPosition: JerarquiaPosicion): JerarquiaPosicion[] => {
  // CEO, Director Internacional y Director Nacional pueden editar todos los cargos
  if (['CEO', 'Director Internacional', 'Director Nacional'].includes(userPosition)) {
    return [...JERARQUIA_POSICIONES];
  }
  
  // SALES MANAGER puede editar todos EXCEPTO CEO, Director Internacional y Director Nacional
  if (userPosition === 'Sales Manager') {
    return JERARQUIA_POSICIONES.filter(cargo => 
      !['CEO', 'Director Internacional', 'Director Nacional'].includes(cargo)
    );
  }
  
  // Director de Zona puede editar cargos de menor jerarquía
  if (userPosition === 'Director de Zona') {
    const posicionIndex = JERARQUIA_POSICIONES.indexOf(userPosition);
    return JERARQUIA_POSICIONES.filter((_, index) => index > posicionIndex);
  }
  
  // Para otras posiciones, solo pueden editar cargos de menor jerarquía
  const posicionIndex = JERARQUIA_POSICIONES.indexOf(userPosition);
  return JERARQUIA_POSICIONES.filter((_, index) => index > posicionIndex);
};

// Nueva función para obtener cargos que puede crear según jerarquía
const getCargosDisponiblesParaCrear = (userPosition: JerarquiaPosicion): JerarquiaPosicion[] => {
  const posicionIndex = JERARQUIA_POSICIONES.indexOf(userPosition);
  
  // CEO y Director Internacional pueden crear todos los cargos
  if (userPosition === 'CEO' || userPosition === 'Director Internacional') {
    return [...JERARQUIA_POSICIONES];
  }
  
  // Para otros roles, solo pueden crear cargos de menor jerarquía (mayor índice)
  return JERARQUIA_POSICIONES.filter((_, index) => index > posicionIndex);
};

// Agregar esta interfaz
interface UserEstructura {
  user_id: string;
  estructura_id: number;
}

// Actualizar la interfaz del estado newUser
interface NewUserState {
  id?: string;
  email: string;
  nombre_completo: string;
  password: string;
  role: string;
  user_position: JerarquiaPosicion | "";
  tipo_estructura: string;
  estructura_id: string;
  supervisor_id: string;
  estructura_ids: string[];
}

// Función helper para verificar si un usuario tiene múltiples estructuras
const hasMultiEstructura = (userPosition: string): boolean => {
  return MULTI_ESTRUCTURA_POSITIONS.includes(userPosition as any);
};

// Nueva función para verificar si puede editar roles
const canEditRoles = (userPosition?: JerarquiaPosicion) => {
  if (!userPosition) return false;
  
  // Solo CEO y Director Internacional pueden editar roles
  const allowedPositions = [
    'CEO',
    'Director Internacional'
  ];
  
  return allowedPositions.includes(userPosition);
};

const Usuarios = () => {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [emailFilter, setEmailFilter] = useState("");
  const [nombreFilter, setNombreFilter] = useState("");
  const [cargoFilter, setCargoFilter] = useState("");
  const [estructuraFilter, setEstructuraFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Actualizar el estado inicial
  const [newUser, setNewUser] = useState<NewUserState>({
    email: "",
    nombre_completo: "",
    password: "",
    role: "usuario", // Rol por defecto
    user_position: "",
    tipo_estructura: "",
    estructura_id: "",
    supervisor_id: "",
    estructura_ids: [],
  });

  // Usar supabase normal para operaciones regulares
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      return data as UserData;
    },
  });

  // Fetch usuarios después de tener currentUser
  const { data: users, refetch: refetchUsers, isLoading } = useQuery({
    queryKey: ["users", currentUser?.id, showInactive],
    queryFn: async () => {
      if (!currentUser?.user_position) return [];

      // Función para obtener subordinados recursivamente basándose en supervisor_id
      const getSubordinatesRecursivelyBySupervisor = async (supervisorId: string): Promise<string[]> => {
        const allSubordinates: string[] = [];
        const processedSupervisors = new Set<string>();

        const processSubordinates = async (currentSupervisorId: string) => {
          if (processedSupervisors.has(currentSupervisorId)) return;
          processedSupervisors.add(currentSupervisorId);

          // Obtener subordinados directos de este supervisor
          const { data: directSubordinates, error } = await supabase
            .from("users")
            .select("id, supervisor_id")
            .eq("supervisor_id", currentSupervisorId)
            .eq("is_active", true);

          if (error) {
            console.error('Error obteniendo subordinados:', error);
            return;
          }

          if (directSubordinates && directSubordinates.length > 0) {
            // Agregar subordinados directos a la lista
            for (const subordinate of directSubordinates) {
              if (!allSubordinates.includes(subordinate.id)) {
                allSubordinates.push(subordinate.id);
              }
              
              // Procesar recursivamente los subordinados de este subordinado
              await processSubordinates(subordinate.id);
            }
          }
        };

        await processSubordinates(supervisorId);
        return allSubordinates;
      };

      // Primero obtener los usuarios
      let query = supabase
        .from("users")
        .select("*");

      // Si no es CEO, Director Internacional o Director Nacional, filtrar usuarios según supervisión directa
      if (!['CEO', 'Director Internacional', 'Director Nacional'].includes(currentUser.user_position)) {
        const subordinados = await getSubordinatesRecursivelyBySupervisor(currentUser.id);
        
        console.log(`🔍 Usuario ${currentUser.email} (${currentUser.user_position})`);
        console.log(`📋 Subordinados encontrados:`, subordinados);
        
        // Solo mostrar al usuario actual y sus subordinados directos/indirectos
        if (subordinados.length > 0) {
          query = query.in('id', [currentUser.id, ...subordinados]);
        } else {
          // Si no tiene subordinados, solo mostrar su propio usuario
          query = query.eq('id', currentUser.id);
        }
      }

      // Aplicar filtro de activos/inactivos
      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data: usersData, error: usersError } = await query.order("created_at", { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }

      console.log('Datos crudos de usuarios:', usersData);

      // Obtener las estructuras heredadas para TODOS los usuarios (incluye Sales Manager)
      const usersWithStructures = await Promise.all(usersData.map(async (user) => {
        // Obtener las estructuras relacionadas de user_estructuras (herencia automática)
        const { data: userEstructuras, error: estructurasError } = await supabase
          .from("user_estructuras")
          .select(`
            estructura:estructuras(*)
          `)
          .eq('user_id', user.id);

        console.log(`Estructuras heredadas para usuario ${user.email}:`, userEstructuras);

        if (estructurasError) {
          console.error('Error fetching estructuras for user:', estructurasError);
          return user;
        }

        const userWithStructures = {
          ...user,
          estructuras: userEstructuras?.map(ue => ue.estructura) || []
        };

        console.log('Usuario procesado con estructuras heredadas:', userWithStructures);
        return userWithStructures;
      }));

      console.log('Todos los usuarios procesados:', usersWithStructures);

      return usersWithStructures as (UserData & { estructuras: Estructura })[];
    },
    enabled: !!currentUser?.id
  });

  // Query separado para obtener información de supervisores sin filtros jerárquicos
  const { data: allSupervisors } = useQuery({
    queryKey: ["supervisors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, nombre_completo, user_position")
        .eq("is_active", true);

      if (error) {
        console.error('Error fetching supervisors:', error);
        throw error;
      }

      return data;
    },
    enabled: !!currentUser?.id
  });

  // Fetch estructuras
  const { data: estructuras } = useQuery({
    queryKey: ["estructuras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estructuras")
        .select("id, tipo, nombre, custom_name, parent_estructura_id")
        .order("nombre", { ascending: true });

      if (error) throw error;
      return data as Estructura[];
    },
  });

  // Agregar el hook de herencia
  const herenciaUtils = useEstructuraHerencia(estructuras || []);

  // Agregar función helper para verificar si puede eliminar usuarios
  const canDeleteUsers = (userPosition?: string) => {
    const restrictedPositions = [
      'Sales Manager',
      'Gerente Divisional',
      'Gerente',
      'Jefe de Grupo',
      'Full Executive',
      'Asesor Training'
    ];

    return !restrictedPositions.includes(userPosition || '');
  };

  // Usar adminApi (API segura) para operaciones administrativas de auth
  const handleSaveUser = async () => {
    try {
      if (isEditing) {
        // Validar permisos de edición de cargo en el modal
        if (currentUser?.user_position && canEditPositions(currentUser.user_position)) {
          const cargosPermitidos = getCargosEditablesParaEdicion(currentUser.user_position);
          if (newUser.user_position && !cargosPermitidos.includes(newUser.user_position as JerarquiaPosicion)) {
            toast({
              variant: "destructive",
              title: "Cargo no permitido",
              description: `Como ${currentUser.user_position}, no puedes asignar el cargo de ${newUser.user_position}`,
            });
            return;
          }
        } else if (currentUser?.user_position && !canEditPositions(currentUser.user_position)) {
          // Si no tiene permisos para editar cargos, verificar que no esté intentando cambiar el cargo
          const originalUser = users?.find(u => u.id === newUser.id);
          if (originalUser && originalUser.user_position !== newUser.user_position) {
            toast({
              variant: "destructive",
              title: "Acceso denegado",
              description: "No tienes permisos para modificar cargos",
            });
            return;
          }
        }

        // Solo usar adminApi si se está cambiando la contraseña
        if (isChangingPassword && newUser.password) {
          try {
            const { error: passwordError } = await adminApi.updateUserById(
              newUser.id!,
              { password: newUser.password }
            );

            if (passwordError) {
              toast({
                variant: "destructive",
                title: "Error al cambiar contraseña",
                description: passwordError,
              });
              return;
            }
          } catch (error) {
            console.error("Error al cambiar contraseña:", error);
            toast({
              variant: "destructive",
              title: "Error al cambiar contraseña",
              description: "No se pudo actualizar la contraseña. Los demás cambios se guardarán.",
            });
            // Continuar con la actualización de otros campos
          }
        }

        // Determinar el supervisor_id correcto
        let supervisorId = null;
        if (newUser.user_position !== 'CEO') {
          supervisorId = newUser.supervisor_id === 'no_supervisor' ? null : newUser.supervisor_id || null;
        }

        // Actualizar usuario base
        const { error: userError } = await supabase
          .from("users")
          .update({
            nombre_completo: newUser.nombre_completo,
            role: newUser.role,
            user_position: newUser.user_position,
            estructura_id: hasMultiEstructura(newUser.user_position) 
              ? null 
              : parseInt(newUser.estructura_id),
            supervisor_id: supervisorId, // Usar el valor corregido
          })
          .eq('id', newUser.id);

        if (userError) throw userError;

        // Si es un rol con múltiples estructuras, actualizar las relaciones
        if (hasMultiEstructura(newUser.user_position)) {
          // Primero eliminar relaciones existentes
          const { error: deleteError } = await supabase
            .from("user_estructuras")
            .delete()
            .eq('user_id', newUser.id);

          if (deleteError) throw deleteError;

          // En modo edición, respetar la selección específica del usuario
          // sin aplicar herencia automática completa
          if (newUser.estructura_ids.length > 0) {
            const estructurasToInsert = newUser.estructura_ids.map(estructuraId => ({
              user_id: newUser.id,
              estructura_id: parseInt(estructuraId)
            }));

            console.log('✏️ Actualizando estructuras en edición (sin herencia automática):');
            console.log('📍 Estructuras seleccionadas manualmente:', newUser.estructura_ids);
            console.log('💾 Vinculaciones a insertar:', estructurasToInsert);

            const { error: estructurasError } = await supabase
              .from("user_estructuras")
              .insert(estructurasToInsert);

            if (estructurasError) throw estructurasError;
          }
        }

        toast({
          title: "Usuario actualizado exitosamente",
          description: hasMultiEstructura(newUser.user_position) && newUser.estructura_ids.length > 0
            ? `${newUser.estructura_ids.length} estructuras vinculadas según selección manual`
            : isChangingPassword && newUser.password
            ? "Contraseña y datos actualizados"
            : undefined,
        });

        setIsCreateModalOpen(false);
        refetchUsers();
      } else {
        console.log('Iniciando creación de usuario:', { ...newUser, password: '***' });

        // Validaciones básicas
        if (!newUser.email || !newUser.password || !newUser.nombre_completo || 
            !newUser.role || !newUser.user_position) {
          toast({
            variant: "destructive",
            title: "Error al crear usuario",
            description: "Por favor complete todos los campos requeridos",
          });
          return;
        }

        // Validación específica para CEO y roles multi-estructura
        if (hasMultiEstructura(newUser.user_position) && newUser.estructura_ids.length === 0) {
          toast({
            variant: "destructive",
            title: "Error al crear usuario",
            description: "Por favor seleccione al menos una estructura",
          });
          return;
        }

        // Crear usuario en Auth usando adminApi
        const { data: authData, error: authError } = await adminApi.createUser({
          email: newUser.email,
          password: newUser.password
        });

        if (authError) {
          throw new Error(authError.message);
        }

        if (!authData?.user) {
          throw new Error('No se pudo crear el usuario en Auth');
        }

        // Asegurarnos de tener un ID válido
        const userId = authData.user.id;
        console.log('ID de usuario creado:', userId);

        try {
          // Crear el usuario base primero
          const { error: userError } = await supabase
            .from("users")
            .insert({
              id: userId,
              email: newUser.email,
              nombre_completo: newUser.nombre_completo,
              role: newUser.role,
              user_position: newUser.user_position,
              estructura_id: null,
              supervisor_id: newUser.user_position === 'CEO' ? null : newUser.supervisor_id,
              is_active: true,
              created_at: new Date().toISOString(),
            });

          if (userError) {
            throw userError;
          }

          // Si es un rol multi-estructura, aplicar herencia automática
          if (hasMultiEstructura(newUser.user_position) && newUser.estructura_ids.length > 0) {
            // Calcular todas las vinculaciones heredadas para cada estructura seleccionada
            const todasLasVinculaciones = new Set<number>();
            
            newUser.estructura_ids.forEach(estructuraId => {
              // Solo aplicar herencia si tenemos estructuras cargadas
              if (estructuras && estructuras.length > 0) {
                const vinculacionesHeredadas = herenciaUtils.obtenerVinculacionesHeredadas(parseInt(estructuraId));
                vinculacionesHeredadas.forEach(id => todasLasVinculaciones.add(id));
              } else {
                // Fallback: solo agregar la estructura seleccionada
                todasLasVinculaciones.add(parseInt(estructuraId));
              }
            });

            // Insertar todas las vinculaciones heredadas
            const estructurasToInsert = Array.from(todasLasVinculaciones).map(estructuraId => ({
              user_id: userId,
              estructura_id: estructuraId
            }));

            console.log('🔄 Aplicando herencia automática:');
            console.log('📍 Estructuras seleccionadas:', newUser.estructura_ids);
            console.log('🌳 Vinculaciones heredadas calculadas:', Array.from(todasLasVinculaciones));
            console.log('💾 Insertando vinculaciones:', estructurasToInsert);

            const { error: estructurasError } = await supabase
              .from("user_estructuras")
              .insert(estructurasToInsert);

            if (estructurasError) {
              throw estructurasError;
            }

            toast({
              title: "Usuario creado exitosamente",
              description: `✅ Herencia automática aplicada: ${todasLasVinculaciones.size} estructuras vinculadas`,
            });
          } else {
            toast({
              title: "Usuario creado exitosamente",
            });
          }

          setIsCreateModalOpen(false);
          refetchUsers();

        } catch (error) {
          // Si algo falla, limpiar el usuario de auth
          await adminApi.deleteUser(userId);
          throw error;
        }
      }
    } catch (error: any) {
      console.error("Error completo al guardar usuario:", error);
      toast({
        variant: "destructive",
        title: "Error al guardar usuario",
        description: error.message || "Por favor intente nuevamente",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      if (!canDeleteUsers(currentUser?.user_position)) {
        toast({
          variant: "destructive",
          title: "Acceso denegado",
          description: "No tienes permisos para desactivar usuarios",
        });
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ is_active: false })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Usuario desactivado exitosamente",
      });

      refetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error al desactivar usuario",
        description: "Por favor intente nuevamente",
      });
    }
  };

  const handleUpdateUser = async (userId: string, field: string, value: JerarquiaPosicion | string) => {
    if (!canEditUsers(currentUser?.user_position)) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para editar usuarios",
      });
      return;
    }

    // Verificación adicional para modificación de cargos
    if (field === "user_position" && !canEditPositions(currentUser?.user_position)) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para modificar cargos",
      });
      return;
    }

    // Verificación específica de que el cargo seleccionado está permitido para este usuario
    if (field === "user_position" && currentUser?.user_position) {
      const cargosPermitidos = getCargosEditablesParaEdicion(currentUser.user_position);
      if (!cargosPermitidos.includes(value as JerarquiaPosicion)) {
        toast({
          variant: "destructive",
          title: "Cargo no permitido",
          description: `Como ${currentUser.user_position}, no puedes asignar el cargo de ${value}`,
        });
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({ [field]: value })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Usuario actualizado exitosamente",
      });

      refetchUsers();
      setEditingUserId(null);
      setEditingField(null);
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar usuario",
        description: "Por favor intente nuevamente",
      });
    }
  };

  const handleEditUser = async (user: UserData) => {
    if (!canEditUsers(currentUser?.user_position)) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para editar usuarios",
      });
      return;
    }

    // Obtener la estructura actual del usuario
    const estructura = estructuras?.find(e => e.id === user.estructura_id);
    
    // Obtener todas las estructuras del usuario si es multi-estructura
    const estructuraIds = hasMultiEstructura(user.user_position)
      ? user.estructuras?.map(e => e.id.toString()) || []
      : [];

    setNewUser({
      id: user.id,
      email: user.email,
      nombre_completo: user.nombre_completo,
      password: "", // La contraseña se maneja de forma segura y no se muestra
      role: user.role,
      user_position: user.user_position,
      tipo_estructura: estructura?.tipo || "",
      estructura_id: user.estructura_id?.toString() || "",
      supervisor_id: user.supervisor_id || "",
      estructura_ids: estructuraIds,
    });

    setIsEditing(true);
    setIsCreateModalOpen(true);
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      if (!canDeleteUsers(currentUser?.user_position)) {
        toast({
          variant: "destructive",
          title: "Acceso denegado",
          description: "No tienes permisos para reactivar usuarios",
        });
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ is_active: true })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Usuario reactivado exitosamente",
      });

      refetchUsers();
    } catch (error) {
      console.error("Error reactivating user:", error);
      toast({
        variant: "destructive",
        title: "Error al reactivar usuario",
        description: "Por favor intente nuevamente",
      });
    }
  };

  // Función para recalcular herencia automática de un usuario específico
  const handleRecalcularHerenciaUsuario = async (user: UserData) => {
    // Solo permitir recálculo para usuarios con roles multi-estructura
    if (!hasMultiEstructura(user.user_position)) {
      toast({
        variant: "destructive",
        title: "Recálculo no disponible",
        description: `El cargo ${user.user_position} no usa herencia automática`,
      });
      return;
    }

    if (!estructuras || estructuras.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No hay estructuras cargadas para procesar",
      });
      return;
    }

    try {
      console.log(`🔄 Recalculando herencia para usuario: ${user.email} (${user.user_position})`);

      // Obtener las estructuras directas actuales del usuario
      const { data: estructurasDirectas, error: estructurasError } = await supabase
        .from("user_estructuras")
        .select('estructura_id')
        .eq('user_id', user.id);

      if (estructurasError) throw estructurasError;

      if (!estructurasDirectas || estructurasDirectas.length === 0) {
        toast({
          variant: "destructive",
          title: "Sin estructuras base",
          description: `${user.nombre_completo} no tiene estructuras asignadas para calcular herencia`,
        });
        return;
      }

      // Calcular todas las vinculaciones heredadas
      const todasLasVinculaciones = new Set<number>();
      
      estructurasDirectas.forEach(({ estructura_id }) => {
        const vinculacionesHeredadas = herenciaUtils.obtenerVinculacionesHeredadas(estructura_id);
        vinculacionesHeredadas.forEach(id => todasLasVinculaciones.add(id));
      });

      console.log(`📍 Estructuras base encontradas:`, estructurasDirectas.map(e => e.estructura_id));
      console.log(`🌳 Vinculaciones heredadas calculadas:`, Array.from(todasLasVinculaciones));

      // Eliminar todas las vinculaciones existentes del usuario
      const { error: deleteError } = await supabase
        .from("user_estructuras")
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Insertar las nuevas vinculaciones heredadas
      const nuevasVinculaciones = Array.from(todasLasVinculaciones).map(estructura_id => ({
        user_id: user.id,
        estructura_id
      }));

      const { error: insertError } = await supabase
        .from("user_estructuras")
        .insert(nuevasVinculaciones);

      if (insertError) throw insertError;

      toast({
        title: "✅ Herencia recalculada",
        description: `${user.nombre_completo}: ${todasLasVinculaciones.size} estructuras vinculadas`,
      });

      console.log(`✅ Recálculo completado para ${user.email}: ${todasLasVinculaciones.size} vinculaciones`);

      // Refrescar la tabla de usuarios
      refetchUsers();

    } catch (error) {
      console.error(`❌ Error recalculando herencia para ${user.email}:`, error);
      toast({
        variant: "destructive",
        title: "Error en recálculo",
        description: `No se pudo recalcular la herencia para ${user.nombre_completo}`,
      });
    }
  };

  // --- INICIO: Lógica de filtrado de tipos y estructuras ---
  // Utilidad para obtener el nivel jerárquico de un tipo de estructura
  const TIPOS_ESTRUCTURA_ORDENADOS = [
    'Empresas',
    'País',
    'Zonas',
    'Filial',
    'División',
    'Organizaciones',
    'Jefaturas',
    'Sub Organización'
  ];

  const getTipoNivel = (tipo: string) => {
    return TIPOS_ESTRUCTURA_ORDENADOS.indexOf(tipo);
  };

  // Devuelve los tipos de estructura que puede ver el usuario actual (de su tipo hacia abajo)
  const getTiposEstructuraVisibles = () => {
    if (!currentUser || !estructuras) return STRUCTURE_TYPES;
    // Si es CEO, Director Internacional o Director Nacional, puede ver todos los tipos
    if (["CEO", "Director Internacional", "Director Nacional"].includes(currentUser.user_position)) {
      return STRUCTURE_TYPES;
    }
    // Obtener los tipos de las estructuras a las que está vinculado el usuario
    const estructurasUsuario = currentUser.estructuras && currentUser.estructuras.length > 0
      ? currentUser.estructuras
      : estructuras.filter(e => e.id === currentUser.estructura_id);
    // Obtener el nivel más alto (más cercano a la raíz) de las estructuras del usuario
    let niveles = estructurasUsuario.map(e => getTipoNivel(Object.keys(STRUCTURE_TYPES_MAPPING).find(k => STRUCTURE_TYPES_MAPPING[k] === e.tipo) || e.tipo));
    let nivelMin = Math.min(...niveles);
    // Si algún nivel es -1, hay un tipo no mapeado, mostrar todos y loguear advertencia
    if (niveles.some(n => n === -1)) {
      console.warn("[CRM] Tipo de estructura no mapeado para usuario:", estructurasUsuario.map(e => e.tipo));
      return STRUCTURE_TYPES;
    }
    // Solo mostrar tipos de ese nivel hacia abajo
    return TIPOS_ESTRUCTURA_ORDENADOS.slice(nivelMin);
  };

  // Devuelve los IDs de todas las estructuras en la cascada del usuario (todas las vinculadas y sus descendientes)
  const getEstructurasEnCascada = () => {
    if (!currentUser || !estructuras) return [];
    // Si es CEO, Director Internacional o Director Nacional, puede ver todas las estructuras
    if (["CEO", "Director Internacional", "Director Nacional"].includes(currentUser.user_position)) {
      return estructuras.map(e => e.id);
    }
    const estructurasUsuario = currentUser.estructuras && currentUser.estructuras.length > 0
      ? currentUser.estructuras
      : estructuras.filter(e => e.id === currentUser.estructura_id);
    // Usar herenciaUtils para obtener todos los descendientes de cada estructura vinculada
    const ids = new Set<number>();
    estructurasUsuario.forEach(e => {
      ids.add(e.id);
      herenciaUtils.obtenerVinculacionesHeredadas(e.id).forEach(id => ids.add(id));
    });
    return Array.from(ids);
  };
  // --- FIN: Lógica de filtrado de tipos y estructuras ---

  const filteredUsers = users?.filter((user) => {
    if (!user) return false;
    
    const matchesEmail = user.email?.toLowerCase().includes(emailFilter.toLowerCase()) ?? false;
    const matchesNombre = user.nombre_completo?.toLowerCase().includes(nombreFilter.toLowerCase()) ?? false;
    const matchesCargo = user.user_position?.toLowerCase().includes(cargoFilter.toLowerCase()) ?? false;
    
    // Lógica de filtrado para estructuras (incluyendo Sales Manager con herencia)
    let matchesEstructura = true;
    if (estructuraFilter) {
      if (user.estructuras && user.estructuras.length > 0) {
        // Para usuarios con estructuras heredadas (incluye Sales Manager)
        matchesEstructura = user.estructuras.some(e => 
          (e.custom_name || e.nombre)?.toLowerCase().includes(estructuraFilter.toLowerCase())
        );
      } else {
        // Para usuarios con una sola estructura base
        matchesEstructura = estructuras
          ?.find((e) => e.id === user.estructura_id)
          ?.nombre?.toLowerCase()
          .includes(estructuraFilter.toLowerCase()) ?? false;
      }
    }

    return matchesEmail && matchesNombre && matchesCargo && matchesEstructura;
  });

  // Modificar el renderizado para manejar el estado de carga
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        {canCreateUsers(currentUser?.user_position) && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Crear Usuario
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por email"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nombre</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por nombre"
              value={nombreFilter}
              onChange={(e) => setNombreFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cargo</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por cargo"
              value={cargoFilter}
              onChange={(e) => setCargoFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Estructura</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrar por estructura"
              value={estructuraFilter}
              onChange={(e) => setEstructuraFilter(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="space-y-2 flex items-center">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="form-checkbox h-4 w-4"
            />
            <span>Mostrar usuarios inactivos</span>
          </label>
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Estructura</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers?.map((user) => (
                <TableRow 
                  key={user.id}
                  className={!user.is_active ? "bg-muted/50" : ""}
                >
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.nombre_completo}</TableCell>
                  <TableCell>
                    {editingUserId === user.id && editingField === "user_position" && canEditPositions(currentUser?.user_position) ? (
                      <Select
                        value={user.user_position}
                        onValueChange={(value: JerarquiaPosicion) => handleUpdateUser(user.id, "user_position", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          {currentUser?.user_position ? (
                            getCargosEditablesParaEdicion(currentUser.user_position).map((role) => (
                              <SelectItem key={role} value={role}>
                                {role}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>
                              No hay cargos disponibles
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={canEditPositions(currentUser?.user_position) ? "cursor-pointer hover:underline" : ""}
                        onClick={() => {
                          if (canEditPositions(currentUser?.user_position)) {
                            setEditingUserId(user.id);
                            setEditingField("user_position");
                          }
                        }}
                      >
                        {user.user_position}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.estructura_id ? (
                      // Si tiene estructura_id, mostrar solo esa (estructura base/directa)
                      <span>
                        {estructuras?.find((e) => e.id === user.estructura_id)?.custom_name ||
                           estructuras?.find((e) => e.id === user.estructura_id)?.nombre}
                      </span>
                    ) : user.estructuras && user.estructuras.length > 0 ? (
                      // Si no tiene estructura_id pero tiene estructuras heredadas, mostrar solo la primera (principal)
                      <span>
                        {user.estructuras[0].custom_name || user.estructuras[0].nombre}
                      </span>
                    ) : (
                      // Sin estructura asignada
                      <span className="text-muted-foreground">Sin estructura</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {allSupervisors?.find(u => u.id === user.supervisor_id)?.nombre_completo || 'Sin supervisor'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.is_active 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {user.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {canEditUsers(currentUser?.user_position) && user.is_active && (
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {/* Botón para recalcular herencia automática */}
                      {user.is_active && hasMultiEstructura(user.user_position) && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRecalcularHerenciaUsuario(user)}
                          title={`Recalcular herencia automática para ${user.nombre_completo}`}
                        >
                          <RotateCcw className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      {canDeleteUsers(currentUser?.user_position) && user.is_active && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Ban className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción desactivará al usuario y no podrá acceder al sistema.
                                El usuario podrá ser reactivado posteriormente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Desactivar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {canDeleteUsers(currentUser?.user_position) && !user.is_active && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReactivateUser(user.id)}
                        >
                          <RefreshCw className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Crear Usuario */}
      <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
        setIsCreateModalOpen(open);
        if (!open) {
          setIsEditing(false);
          setIsChangingPassword(false);
          setShowPassword(false);
          setShowEditPassword(false);
          setNewUser({
            email: "",
            nombre_completo: "",
            password: "",
            role: "usuario", // Rol por defecto
            user_position: "",
            tipo_estructura: "",
            estructura_id: "",
            supervisor_id: "",
            estructura_ids: [],
          });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                disabled={isEditing}
              />
            </div>
            {!isEditing ? (
              <div className="space-y-2">
                <Label>Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Contraseña"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Contraseña</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIsChangingPassword(!isChangingPassword);
                      if (!isChangingPassword) {
                        setShowEditPassword(false);
                        setNewUser(prev => ({ ...prev, password: "" }));
                      }
                    }}
                  >
                    {isChangingPassword ? 'Cancelar cambio' : 'Cambiar contraseña'}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="password"
                    value={isChangingPassword ? newUser.password : "••••••••"}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder={isChangingPassword ? "Nueva contraseña" : "Contraseña encriptada"}
                    disabled={!isChangingPassword}
                  />
                  {isChangingPassword && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                value={newUser.nombre_completo}
                onChange={(e) => setNewUser({ ...newUser, nombre_completo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                disabled={!isEditing || !canEditRoles(currentUser?.user_position)} // Deshabilitado en creación, o en edición si no tiene permisos
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuario</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superuser">Superuser</SelectItem>
                </SelectContent>
              </Select>
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  🔒 Rol fijo en "Usuario" para nuevos usuarios
                </p>
              )}
              {isEditing && !canEditRoles(currentUser?.user_position) && (
                <p className="text-xs text-muted-foreground">
                  🔒 Solo CEO y Director Internacional pueden modificar roles
                </p>
              )}
              {isEditing && canEditRoles(currentUser?.user_position) && (
                <p className="text-xs text-muted-foreground">
                  ✅ Puedes modificar el rol de este usuario
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select
                value={newUser.user_position}
                onValueChange={(value: JerarquiaPosicion) => setNewUser({ ...newUser, user_position: value })}
                disabled={isEditing && !canEditPositions(currentUser?.user_position)} // Habilitado si puede editar cargos
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    if (isEditing && currentUser?.user_position && canEditPositions(currentUser.user_position)) {
                      // En modo edición, mostrar solo cargos permitidos para edición
                      const cargosEditables = getCargosEditablesParaEdicion(currentUser.user_position);
                      return cargosEditables.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ));
                    } else if (!isEditing && currentUser?.user_position) {
                      // En modo creación, filtrar cargos según jerarquía del usuario actual
                      const cargosDisponibles = getCargosDisponiblesParaCrear(currentUser.user_position);
                      return cargosDisponibles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ));
                    }
                    // Fallback: mostrar todos los cargos
                    return JERARQUIA_POSICIONES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
              {isEditing && canEditPositions(currentUser?.user_position) && (
                <div className="space-y-1">
                  <p className="text-xs text-green-600">
                    ✅ Como {currentUser.user_position}, puedes editar cargos desde aquí
                    {currentUser.user_position === 'Sales Manager' && 
                      ' (excepto CEO, Director Internacional y Director Nacional)'
                    }
                  </p>
                </div>
              )}
              {isEditing && !canEditPositions(currentUser?.user_position) && (
                <p className="text-xs text-muted-foreground">
                  🔒 No tienes permisos para modificar cargos
                </p>
              )}
              {!isEditing && currentUser?.user_position && (
                <p className="text-xs text-muted-foreground">
                  Solo puedes crear usuarios con cargos de menor jerarquía
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Estructura</Label>
              <Select
                value={newUser.tipo_estructura}
                onValueChange={(value) => setNewUser({ ...newUser, tipo_estructura: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {getTiposEstructuraVisibles().map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUser.tipo_estructura && (
              <div className="space-y-2">
                <Label>Estructura{hasMultiEstructura(newUser.user_position) ? 's' : ''}</Label>
                {hasMultiEstructura(newUser.user_position) ? (
                  // Selección múltiple para roles multi-estructura
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                    {estructuras
                      ?.filter(e => {
                        try {
                          const mappedType = STRUCTURE_TYPES_MAPPING[newUser.tipo_estructura];
                          // Solo mostrar estructuras del tipo seleccionado, dentro de la cascada del usuario
                          return mappedType && e.tipo.toLowerCase() === mappedType.toLowerCase() && getEstructurasEnCascada().includes(e.id);
                        } catch (error) {
                          console.error('Error al filtrar estructuras:', error);
                          return false;
                        }
                      })
                      .map(estructura => (
                        <label key={estructura.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50">
                          <input
                            type="checkbox"
                            checked={newUser.estructura_ids.includes(estructura.id.toString())}
                            onChange={(e) => {
                              const estructuraId = estructura.id.toString();
                              setNewUser(prev => ({
                                ...prev,
                                estructura_ids: e.target.checked
                                  ? [...prev.estructura_ids, estructuraId]
                                  : prev.estructura_ids.filter(id => id !== estructuraId)
                              }));
                            }}
                            className="form-checkbox h-4 w-4"
                          />
                          <span>{estructura.custom_name || estructura.nombre}</span>
                        </label>
                      ))}
                  </div>
                ) : (
                  // Selección única para roles normales
                  <Select
                    value={newUser.estructura_id}
                    onValueChange={(value) => setNewUser({ ...newUser, estructura_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estructura" />
                    </SelectTrigger>
                    <SelectContent>
                      {estructuras
                        ?.filter(e => {
                          // Solo mostrar estructuras del tipo seleccionado, dentro de la cascada del usuario
                          return e.tipo.toLowerCase() === STRUCTURE_TYPES_MAPPING[newUser.tipo_estructura].toLowerCase() && getEstructurasEnCascada().includes(e.id);
                        })
                        .map((estructura) => (
                          <SelectItem key={estructura.id} value={estructura.id.toString()}>
                            {estructura.custom_name || estructura.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Supervisor a Cargo</Label>
              <Select
                value={newUser.supervisor_id}
                onValueChange={(value) => setNewUser({ ...newUser, supervisor_id: value })}
                disabled={!newUser.user_position || newUser.user_position === 'CEO'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar supervisor" />
                </SelectTrigger>
                <SelectContent>
                  {newUser.user_position && newUser.user_position !== 'CEO' ? (
                    obtenerSupervisoresPotenciales(allSupervisors || [], newUser.user_position)
                      .map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.nombre_completo} ({supervisor.user_position})
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no_supervisor" disabled>
                      {newUser.user_position === 'CEO' 
                        ? 'CEO no requiere supervisor' 
                        : 'Seleccione primero un cargo'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditing(false);
                setIsChangingPassword(false);
                setShowPassword(false);
                setShowEditPassword(false);
                setNewUser({
                  email: "",
                  nombre_completo: "",
                  password: "",
                  role: "usuario", // Resetear rol por defecto
                  user_position: "",
                  tipo_estructura: "",
                  estructura_id: "",
                  supervisor_id: "",
                  estructura_ids: [],
                });
              }}>
                Cancelar
              </Button>
              <Button onClick={handleSaveUser}>
                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
