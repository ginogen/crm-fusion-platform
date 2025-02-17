
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
import { Plus, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLES, STRUCTURE_TYPES } from "@/lib/constants";
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
}

interface Estructura {
  id: number;
  tipo: string;
  nombre: string;
  custom_name?: string;
}

const Usuarios = () => {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [emailFilter, setEmailFilter] = useState("");
  const [nombreFilter, setNombreFilter] = useState("");
  const [cargoFilter, setCargoFilter] = useState("");
  const [estructuraFilter, setEstructuraFilter] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Nuevo usuario
  const [newUser, setNewUser] = useState({
    email: "",
    nombre_completo: "",
    password: "",
    role: "",
    user_position: "",
    tipo_estructura: "",
    estructura_id: "",
  });

  // Fetch usuarios
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserData[];
    },
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

  const handleCreateUser = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) throw authError;

      const { error: userError } = await supabase.from("users").insert([
        {
          id: authData.user?.id,
          email: newUser.email,
          nombre_completo: newUser.nombre_completo,
          role: newUser.role,
          user_position: newUser.user_position,
          estructura_id: parseInt(newUser.estructura_id),
          is_active: true,
        },
      ]);

      if (userError) throw userError;

      toast({
        title: "Usuario creado exitosamente",
        description: "Se ha enviado un email de confirmación",
      });

      setIsCreateModalOpen(false);
      refetchUsers();
      setNewUser({
        email: "",
        nombre_completo: "",
        password: "",
        role: "",
        user_position: "",
        tipo_estructura: "",
        estructura_id: "",
      });
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        variant: "destructive",
        title: "Error al crear usuario",
        description: "Por favor intente nuevamente",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
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

  const filteredUsers = users?.filter((user) => {
    const matchesEmail = user.email.toLowerCase().includes(emailFilter.toLowerCase());
    const matchesNombre = user.nombre_completo.toLowerCase().includes(nombreFilter.toLowerCase());
    const matchesCargo = user.user_position.toLowerCase().includes(cargoFilter.toLowerCase());
    const matchesEstructura = estructuras
      ?.find((e) => e.id === user.estructura_id)
      ?.nombre.toLowerCase()
      .includes(estructuraFilter.toLowerCase());

    return matchesEmail && matchesNombre && matchesCargo && matchesEstructura;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Usuarios</h1>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Usuario
        </Button>
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
              <TableHead>Fecha</TableHead>
              <TableHead>Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id}>
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
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción desactivará al usuario y no podrá acceder al sistema.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteUser(user.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Modal Crear Usuario */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input
                value={newUser.nombre_completo}
                onChange={(e) => setNewUser({ ...newUser, nombre_completo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
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
                <Label>Estructura</Label>
                <Select
                  value={newUser.estructura_id}
                  onValueChange={(value) => setNewUser({ ...newUser, estructura_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar estructura" />
                  </SelectTrigger>
                  <SelectContent>
                    {estructuras
                      ?.filter((e) => e.tipo === newUser.tipo_estructura)
                      .map((estructura) => (
                        <SelectItem key={estructura.id} value={estructura.id.toString()}>
                          {estructura.custom_name || estructura.nombre}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser}>
                Crear Usuario
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
