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
import { Plus, Search, Ban, Edit, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/admin-client";
import { ROLES, STRUCTURE_TYPES, STRUCTURE_TYPES_MAPPING } from "@/lib/constants";
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

interface UserData {
  id: string;
  email: string;
  nombre_completo: string;
  user_position: string;
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
  custom_name?: string;
}

const JERARQUIA_POSICIONES = [
  'CEO',
  'Director Internacional',
  'Director Nacional',
  'Director de Zona',
  'Sales Manager',
  'Gerente Divisional',
  'Gerente',
  'Team Manager',
  'Full Executive',
  'Asesor Training'
] as const;

const obtenerSupervisoresPotenciales = (usuarios: UserData[], posicionSeleccionada: string) => {
  const posicionIndex = JERARQUIA_POSICIONES.indexOf(posicionSeleccionada);
  if (posicionIndex <= 0) return []; // CEO no tiene supervisor

  // Filtrar usuarios con cualquier posición superior
  return usuarios.filter(usuario => {
    const supervisorIndex = JERARQUIA_POSICIONES.indexOf(usuario.user_position);
    // Retorna true si el supervisor tiene una posición superior (índice menor)
    return supervisorIndex < posicionIndex;
  }).sort((a, b) => {
    // Ordenar por nivel jerárquico, priorizando los más cercanos
    const indexA = JERARQUIA_POSICIONES.indexOf(a.user_position);
    const indexB = JERARQUIA_POSICIONES.indexOf(b.user_position);
    return indexA - indexB;
  });
};

const RESTRICTED_POSITIONS = {
  ASESOR_TRAINING: 'Asesor Training',
  FULL_EXECUTIVE: 'Full Executive',
  TEAM_MANAGER: 'Team Manager',
  GERENTE: 'Gerente',
  GERENTE_DIVISIONAL: 'Gerente Divisional',
  SALES_MANAGER: 'Sales Manager',
  DIRECTOR_ZONA: 'Director de Zona',
  DIRECTOR_NACIONAL: 'Director Nacional',
  DIRECTOR_INTERNACIONAL: 'Director Internacional',
  CEO: 'CEO'
} as const;

// Función para obtener el nivel jerárquico
const getNivelJerarquico = (position: string) => {
  return JERARQUIA_POSICIONES.indexOf(position);
};

// Función para verificar si puede ver usuarios
const canViewUser = (currentUserPosition: string, targetUserPosition: string) => {
  const currentLevel = getNivelJerarquico(currentUserPosition);
  const targetLevel = getNivelJerarquico(targetUserPosition);
  return currentLevel < targetLevel;
};

// Función para verificar permisos de edición
const canEditUsers = (userPosition?: string) => {
  if (!userPosition) return false;
  return getNivelJerarquico(userPosition) < getNivelJerarquico(RESTRICTED_POSITIONS.ASESOR_TRAINING);
};

// Función para verificar si puede crear usuarios
const canCreateUsers = (userPosition?: string) => {
  if (!userPosition) return false;
  return getNivelJerarquico(userPosition) < getNivelJerarquico(RESTRICTED_POSITIONS.ASESOR_TRAINING);
};

// Agregar esta interfaz
interface UserEstructura {
  user_id: string;
  estructura_id: number;
}

// Agregar esta constante
const MULTI_ESTRUCTURA_POSITIONS = ['Director de Zona', 'Director Internacional', 'CEO'];

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

  // Modificar el estado newUser para incluir estructuras múltiples
  const [newUser, setNewUser] = useState({
    id: "",
    email: "",
    nombre_completo: "",
    password: "",
    role: "",
    user_position: "",
    tipo_estructura: "",
    estructura_id: "",
    supervisor_id: "",
    estructura_ids: [] as string[], // Nuevo campo para múltiples estructuras
  });

  // Fetch current user primero
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

      let query = supabase
        .from("users")
        .select("*, estructuras(*)");

      // Si no es CEO, filtrar usuarios según jerarquía y vinculación
      if (currentUser.user_position !== RESTRICTED_POSITIONS.CEO) {
        const subordinados = await getSubordinados(currentUser.id);
        query = query.in('id', [currentUser.id, ...subordinados]);
      }

      // Aplicar filtro de activos/inactivos
      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      return data as (UserData & { estructuras: Estructura })[];
    },
    enabled: !!currentUser?.id
  });

  // Fetch estructuras
  const { data: estructuras } = useQuery({
    queryKey: ["estructuras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estructuras")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;
      return data as Estructura[];
    },
  });

  // Agregar función helper para verificar si puede eliminar usuarios
  const canDeleteUsers = (userPosition?: string) => {
    const restrictedPositions = [
      'Sales Manager',
      'Gerente Divisional',
      'Gerente',
      'Team Manager',
      'Full Executive',
      'Asesor Training'
    ];

    return !restrictedPositions.includes(userPosition || '');
  };

  // Función auxiliar para obtener subordinados recursivamente
  const getSubordinados = async (userId: string): Promise<string[]> => {
    const { data: directos } = await supabase
      .from("users")
      .select("id")
      .eq("supervisor_id", userId);

    if (!directos || directos.length === 0) return [];

    const subordinadosDirectos = directos.map(u => u.id);
    const subordinadosIndirectos = await Promise.all(
      subordinadosDirectos.map(id => getSubordinados(id))
    );

    return [...subordinadosDirectos, ...subordinadosIndirectos.flat()];
  };

  const handleSaveUser = async () => {
    try {
      if (isEditing) {
        if (isChangingPassword && newUser.password) {
          const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
            newUser.id,
            { password: newUser.password }
          );

          if (passwordError) throw passwordError;
        }

        const supervisorId = newUser.supervisor_id === 'no_supervisor' ? null : newUser.supervisor_id;

        // Actualizar usuario base
        const { error: userError } = await supabase
          .from("users")
          .update({
            nombre_completo: newUser.nombre_completo,
            role: newUser.role,
            user_position: newUser.user_position,
            estructura_id: MULTI_ESTRUCTURA_POSITIONS.includes(newUser.user_position) 
              ? null 
              : parseInt(newUser.estructura_id),
            supervisor_id: supervisorId,
          })
          .eq('id', newUser.id);

        if (userError) throw userError;

        // Si es un rol con múltiples estructuras, actualizar las relaciones
        if (MULTI_ESTRUCTURA_POSITIONS.includes(newUser.user_position)) {
          // Primero eliminar relaciones existentes
          await supabase
            .from("user_estructuras")
            .delete()
            .eq('user_id', newUser.id);

          // Insertar nuevas relaciones
          if (newUser.estructura_ids.length > 0) {
            const { error: estructurasError } = await supabase
              .from("user_estructuras")
              .insert(
                newUser.estructura_ids.map(estructuraId => ({
                  user_id: newUser.id,
                  estructura_id: parseInt(estructuraId)
                }))
              );

            if (estructurasError) throw estructurasError;
          }
        }

        toast({
          title: "Usuario actualizado exitosamente",
        });
      } else {
        // Validaciones básicas
        if (!newUser.email || !newUser.password || !newUser.nombre_completo || 
            !newUser.role || !newUser.user_position || !newUser.estructura_id) {
          toast({
            variant: "destructive",
            title: "Error al crear usuario",
            description: "Por favor complete todos los campos requeridos",
          });
          return;
        }

        // Crear usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: newUser.email,
          password: newUser.password,
          email_confirm: true
        });

        if (authError || !authData.user) {
          throw authError || new Error("No se pudo crear el usuario en Auth");
        }

        const supervisorId = newUser.supervisor_id === 'no_supervisor' ? null : newUser.supervisor_id;

        // Crear usuario en la base de datos usando el ID generado por Auth
        const { error: userError } = await supabase
          .from("users")
          .insert([{
            id: authData.user.id, // Usar el ID generado por Auth
            email: newUser.email,
            nombre_completo: newUser.nombre_completo,
            role: newUser.role,
            user_position: newUser.user_position,
            estructura_id: parseInt(newUser.estructura_id),
            supervisor_id: supervisorId,
            is_active: true,
            created_at: new Date().toISOString(),
          }]);

        if (userError) throw userError;

        toast({
          title: "Usuario creado exitosamente",
        });
      }

      setIsCreateModalOpen(false);
      setIsEditing(false);
      setIsChangingPassword(false);
      refetchUsers();
      setNewUser({
        id: "",
        email: "",
        nombre_completo: "",
        password: "",
        role: "",
        user_position: "",
        tipo_estructura: "",
        estructura_id: "",
        supervisor_id: "",
        estructura_ids: [],
      });
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        variant: "destructive",
        title: `Error al ${isEditing ? 'actualizar' : 'crear'} usuario`,
        description: "Por favor intente nuevamente",
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

  const handleUpdateUser = async (userId: string, field: string, value: string) => {
    if (!canEditUsers(currentUser?.user_position)) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para editar usuarios",
      });
      return;
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

  const handleEditUser = (user: UserData) => {
    if (!canEditUsers(currentUser?.user_position)) {
      toast({
        variant: "destructive",
        title: "Acceso denegado",
        description: "No tienes permisos para editar usuarios",
      });
      return;
    }
    const estructura = estructuras?.find(e => e.id === user.estructura_id);
    setNewUser({
      id: user.id,
      email: user.email,
      nombre_completo: user.nombre_completo,
      password: "", // No incluimos la contraseña actual
      role: user.role,
      user_position: user.user_position,
      tipo_estructura: estructura?.tipo || "",
      estructura_id: user.estructura_id.toString(),
      supervisor_id: user.supervisor_id,
      estructura_ids: [],
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

  const filteredUsers = users?.filter((user) => {
    if (!user) return false;
    
    const matchesEmail = user.email?.toLowerCase().includes(emailFilter.toLowerCase()) ?? false;
    const matchesNombre = user.nombre_completo?.toLowerCase().includes(nombreFilter.toLowerCase()) ?? false;
    const matchesCargo = user.user_position?.toLowerCase().includes(cargoFilter.toLowerCase()) ?? false;
    const matchesEstructura = estructuras
      ?.find((e) => e.id === user.estructura_id)
      ?.nombre?.toLowerCase()
      .includes(estructuraFilter.toLowerCase()) ?? false;

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
                    {editingUserId === user.id && editingField === "user_position" ? (
                      <Select
                        value={user.user_position}
                        onValueChange={(value) => handleUpdateUser(user.id, "user_position", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar cargo" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditingField("user_position");
                        }}
                      >
                        {user.user_position}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingUserId === user.id && editingField === "estructura_id" ? (
                      <Select
                        value={user.estructura_id?.toString()}
                        onValueChange={(value) => handleUpdateUser(user.id, "estructura_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estructura" />
                        </SelectTrigger>
                        <SelectContent>
                          {estructuras?.map((estructura) => (
                            <SelectItem key={estructura.id} value={estructura.id.toString()}>
                              {estructura.custom_name || estructura.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => {
                          setEditingUserId(user.id);
                          setEditingField("estructura_id");
                        }}
                      >
                        {estructuras?.find((e) => e.id === user.estructura_id)?.custom_name ||
                          estructuras?.find((e) => e.id === user.estructura_id)?.nombre}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {users?.find(u => u.id === user.supervisor_id)?.nombre_completo || 'Sin supervisor'}
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
          setNewUser({
            id: "",
            email: "",
            nombre_completo: "",
            password: "",
            role: "",
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
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Contraseña"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Contraseña</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                  >
                    {isChangingPassword ? 'Cancelar cambio' : 'Cambiar contraseña'}
                  </Button>
                </div>
                {isChangingPassword && (
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Nueva contraseña"
                  />
                )}
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
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Select
                value={newUser.user_position}
                onValueChange={(value) => setNewUser({ ...newUser, user_position: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cargo" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {STRUCTURE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUser.tipo_estructura && (
              <div className="space-y-2">
                <Label>Estructura{MULTI_ESTRUCTURA_POSITIONS.includes(newUser.user_position) ? 's' : ''}</Label>
                {MULTI_ESTRUCTURA_POSITIONS.includes(newUser.user_position) ? (
                  // Múltiple selección para roles específicos
                  <div className="space-y-2">
                    {estructuras
                      ?.filter(e => e.tipo.toLowerCase() === STRUCTURE_TYPES_MAPPING[newUser.tipo_estructura].toLowerCase())
                      .map(estructura => (
                        <label key={estructura.id} className="flex items-center space-x-2">
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
                      {estructuras?.map((estructura) => (
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
                    obtenerSupervisoresPotenciales(users || [], newUser.user_position)
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
