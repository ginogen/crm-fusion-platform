import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
import { Loader2, Plus, Search, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
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
}

interface EstructuraVinculadaProps {
  estructura: Estructura;
  usuarios: UserProfile[];
  isOpen: boolean;
  onToggle: () => void;
  estructuraPadre?: Estructura | null;
}

const EstructuraVinculada = ({ estructura, usuarios, isOpen, onToggle, estructuraPadre }: EstructuraVinculadaProps) => {
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
                  
                  return (
                    <div key={usuario.id} className="p-3 bg-slate-50 rounded-md">
                      <p className="font-medium">{usuario.nombre_completo}</p>
                      <p className="text-sm text-muted-foreground">{usuario.user_position}</p>
                      <p className="text-sm text-muted-foreground">{usuario.email}</p>
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

const Organizacion = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVinculacionModalOpen, setIsVinculacionModalOpen] = useState(false);
  const [selectedEstructura, setSelectedEstructura] = useState<Estructura | null>(null);
  const [estructurasSeleccionadas, setEstructurasSeleccionadas] = useState<number[]>([]);
  const [filterTipo, setFilterTipo] = useState<string>("");
  const [filterNombre, setFilterNombre] = useState("");
  const [expandedEstructuras, setExpandedEstructuras] = useState<number[]>([]);
  const [newEstructura, setNewEstructura] = useState({
    tipo: "",
    nombre: "",
    parent_estructura_id: null as number | null,
  });

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
      const { data, error } = await supabase
        .from("users")
        .select(`
          id,
          user_position,
          email,
          nombre_completo,
          estructura_id,
          supervisor_id
        `);

      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }

      const usuariosPorEstructura: Record<number, UserProfile[]> = {};
      data.forEach((usuario) => {
        if (usuario.estructura_id) {
          if (!usuariosPorEstructura[usuario.estructura_id]) {
            usuariosPorEstructura[usuario.estructura_id] = [];
          }
          usuariosPorEstructura[usuario.estructura_id].push(usuario);
        }
      });

      return usuariosPorEstructura;
    },
  });

  const estructurasFiltradas = estructuras?.filter(estructura => {
    const matchesTipo = !filterTipo || estructura.tipo === filterTipo;
    const matchesNombre = !filterNombre || 
      estructura.nombre.toLowerCase().includes(filterNombre.toLowerCase()) ||
      (estructura.custom_name && estructura.custom_name.toLowerCase().includes(filterNombre.toLowerCase()));
    return matchesTipo && matchesNombre;
  });

  const estructurasNiveles = estructurasFiltradas?.reduce((acc, estructura) => {
    const nivel = TIPOS_ESTRUCTURA.indexOf(estructura.tipo);
    if (!acc[nivel]) acc[nivel] = [];
    acc[nivel].push(estructura);
    return acc;
  }, {} as Record<number, Estructura[]>);

  const handleVincularEstructuras = async () => {
    if (!selectedEstructura || estructurasSeleccionadas.length === 0) {
      toast.error("Por favor seleccione al menos una estructura para vincular");
      return;
    }

    const updates = estructurasSeleccionadas.map(id => {
      const estructura = estructuras?.find(e => e.id === id);
      if (!estructura) {
        throw new Error(`Estructura ${id} no encontrada`);
      }
      
      return {
        id,
        parent_estructura_id: selectedEstructura.id,
        nombre: estructura.nombre,
        tipo: estructura.tipo
      };
    });

    const { error } = await supabase
      .from("estructuras")
      .upsert(updates);

    if (error) {
      console.error("Error vinculando estructuras:", error);
      toast.error("Error al vincular las estructuras");
      return;
    }

    toast.success("Estructuras vinculadas exitosamente");
    setIsVinculacionModalOpen(false);
    setEstructurasSeleccionadas([]);
    refetch();
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
    const { error } = await supabase
      .from("estructuras")
      .delete()
      .eq("id", estructuraId);

    if (error) {
      console.error("Error deleting estructura:", error);
      toast.error("Error al eliminar la estructura");
      return;
    }

    toast.success("Estructura eliminada exitosamente");
    refetch();
    setIsVinculacionModalOpen(false);
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

                <Button className="w-full" onClick={handleCreateEstructura}>
                  Crear Estructura
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                      className="relative p-4 bg-white rounded-lg border hover:shadow-md transition-shadow group"
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedEstructura(estructura);
                          setIsVinculacionModalOpen(true);
                        }}
                      >
                        <h4 className="font-medium">
                          {estructura.custom_name || estructura.nombre}
                        </h4>
                        <div className="space-y-1 mt-2">
                          {estructura.parent_estructura_id && (
                            <p className="text-sm text-muted-foreground">
                              Vinculada a: {
                                estructuras?.find(e => e.id === estructura.parent_estructura_id)?.nombre ||
                                'Estructura no encontrada'
                              } ({
                                estructuras?.find(e => e.id === estructura.parent_estructura_id)?.tipo ||
                                'Tipo desconocido'
                              })
                            </p>
                          )}
                          {estructura.hijos && estructura.hijos.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              Estructuras vinculadas: {estructura.hijos.length}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará la estructura "{estructura.custom_name || estructura.nombre}" y no se puede deshacer.
                              {estructura.hijos && estructura.hijos.length > 0 && (
                                <p className="mt-2 text-destructive">
                                  Advertencia: Esta estructura tiene {estructura.hijos.length} estructura(s) vinculada(s).
                                </p>
                              )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteEstructura(estructura.id);
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={isVinculacionModalOpen} onOpenChange={setIsVinculacionModalOpen}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Estructura: {selectedEstructura?.custom_name || selectedEstructura?.nombre} ({selectedEstructura?.tipo})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div>
              <h3 className="text-lg font-medium mb-4">Estructuras Vinculadas</h3>
              <div className="space-y-2">
                {/* Estructuras superiores */}
                {selectedEstructura?.parent_estructura_id && (
                  <div className="relative">
                    <EstructuraVinculada
                      estructura={estructuras?.find(e => e.id === selectedEstructura.parent_estructura_id)!}
                      usuarios={usuariosPorEstructura?.[selectedEstructura.parent_estructura_id] || []}
                      isOpen={expandedEstructuras.includes(selectedEstructura.parent_estructura_id)}
                      onToggle={() => toggleEstructura(selectedEstructura.parent_estructura_id!)}
                      estructuraPadre={null}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleDesvincularEstructura(selectedEstructura.id)}
                    >
                      Desvincular
                    </Button>
                  </div>
                )}

                {/* Estructuras inferiores */}
                {estructuras
                  ?.filter(e => e.parent_estructura_id === selectedEstructura?.id)
                  .map(estructura => {
                    const usuariosDeEstructura = usuariosPorEstructura?.[estructura.id] || [];
                    
                    return (
                      <div key={estructura.id} className="relative">
                        <EstructuraVinculada
                          estructura={estructura}
                          usuarios={usuariosDeEstructura}
                          isOpen={expandedEstructuras.includes(estructura.id)}
                          onToggle={() => toggleEstructura(estructura.id)}
                          estructuraPadre={selectedEstructura}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => handleDesvincularEstructura(estructura.id)}
                        >
                          Desvincular
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              <Label>Vincular Nueva Estructura</Label>
              <Select
                value={estructurasSeleccionadas[0]?.toString()}
                onValueChange={(value) => {
                  const id = parseInt(value);
                  setEstructurasSeleccionadas(prev => 
                    prev.includes(id) 
                      ? prev.filter(x => x !== id)
                      : [...prev, id]
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estructuras..." />
                </SelectTrigger>
                <SelectContent>
                  {estructuras?.filter(e => e.id !== selectedEstructura?.id).map((estructura) => (
                    <SelectItem key={estructura.id} value={estructura.id.toString()}>
                      {estructura.custom_name || estructura.nombre} ({estructura.tipo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsVinculacionModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleVincularEstructuras}>
              Vincular
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organizacion;
