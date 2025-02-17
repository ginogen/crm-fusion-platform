
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
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
import { Loader2, Plus, Search } from "lucide-react";

// Tipos de estructura disponibles (actualizados según el enum de la base de datos)
const TIPOS_ESTRUCTURA = [
  'Empresa',
  'Paises',
  'Filiales',
  'Filial',
  'División',
  'Organizaciones',
  'Jefaturas',
  'Sub Organización'
] as const;

interface Estructura {
  id: number;
  tipo: typeof TIPOS_ESTRUCTURA[number];
  parent_id: number | null;
  nombre: string;
  custom_name: string | null;
}

interface UserProfile {
  id: string;
  user_position: string;
  email: string;
  nombre_completo: string;
}

const Organizacion = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterNombre, setFilterNombre] = useState("");
  const [newEstructura, setNewEstructura] = useState({
    tipo: "",
    nombre: "",
    parent_id: null as number | null,
  });

  // Obtener perfil del usuario actual
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

  // Obtener todas las estructuras
  const { data: estructuras, isLoading: isLoadingEstructuras, error, refetch } = useQuery({
    queryKey: ["estructuras"],
    queryFn: async () => {
      console.log("Fetching estructuras...");
      const { data, error } = await supabase
        .from("estructuras")
        .select("*")
        .order("tipo", { ascending: true });

      if (error) {
        console.error("Error fetching estructuras:", error);
        throw error;
      }
      
      console.log("Estructuras fetched:", data);
      return data as Estructura[];
    },
  });

  // Estructuras filtradas
  const estructurasFiltradas = estructuras?.filter(estructura => {
    const matchesTipo = !filterTipo || estructura.tipo === filterTipo;
    const matchesNombre = !filterNombre || 
      estructura.nombre.toLowerCase().includes(filterNombre.toLowerCase()) ||
      (estructura.custom_name && estructura.custom_name.toLowerCase().includes(filterNombre.toLowerCase()));
    return matchesTipo && matchesNombre;
  });

  // Organizar estructuras por niveles
  const estructurasNiveles = estructurasFiltradas?.reduce((acc, estructura) => {
    const nivel = TIPOS_ESTRUCTURA.indexOf(estructura.tipo);
    if (!acc[nivel]) acc[nivel] = [];
    acc[nivel].push(estructura);
    return acc;
  }, {} as Record<number, Estructura[]>);

  // Log para depuración
  console.log("Estado actual:", {
    estructuras,
    estructurasFiltradas,
    estructurasNiveles,
    filterTipo,
    filterNombre,
    error
  });

  const handleCreateEstructura = async () => {
    if (!newEstructura.tipo || !newEstructura.nombre) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    const { data, error } = await supabase
      .from("estructuras")
      .insert([{
        tipo: newEstructura.tipo,
        nombre: newEstructura.nombre,
        parent_id: newEstructura.parent_id,
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
    setNewEstructura({ tipo: "", nombre: "", parent_id: null });
    refetch();
  };

  if (isLoadingProfile || isLoadingEstructuras) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    console.error("Error in component:", error);
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error al cargar las estructuras
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Información del usuario */}
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold mb-4">Mi Perfil Organizacional</h2>
        <div className="space-y-2">
          <p><span className="font-medium">Nombre:</span> {userProfile?.nombre_completo}</p>
          <p><span className="font-medium">Posición:</span> {userProfile?.user_position}</p>
          <p><span className="font-medium">Email:</span> {userProfile?.email}</p>
        </div>
      </div>

      {/* Gestión de Estructuras */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Gestión de Estructuras</h2>
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
                      {TIPOS_ESTRUCTURA.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
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

                <div className="space-y-2">
                  <Label>Estructura Padre (Opcional)</Label>
                  <Select
                    value={newEstructura.parent_id?.toString() || "none"}
                    onValueChange={(value) => 
                      setNewEstructura(prev => ({ 
                        ...prev, 
                        parent_id: value === "none" ? null : parseInt(value) 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una estructura padre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {estructuras?.map((estructura) => (
                        <SelectItem 
                          key={estructura.id} 
                          value={estructura.id.toString()}
                        >
                          {estructura.custom_name || estructura.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleCreateEstructura}>
                  Crear Estructura
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
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
                    {tipo}
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

        {/* Estructuras por niveles */}
        <div className="space-y-6">
          {TIPOS_ESTRUCTURA.map((tipo, index) => {
            const estructurasDelNivel = estructurasNiveles?.[index] || [];
            if (estructurasDelNivel.length === 0) return null;

            return (
              <div key={tipo} className="space-y-2">
                <h3 className="font-medium text-lg">{tipo}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {estructurasDelNivel.map((estructura) => (
                    <div
                      key={estructura.id}
                      className="p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium">
                        {estructura.custom_name || estructura.nombre}
                      </h4>
                      {estructura.parent_id && (
                        <p className="text-sm text-muted-foreground">
                          Padre: {estructuras?.find(e => e.id === estructura.parent_id)?.nombre}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Organizacion;
