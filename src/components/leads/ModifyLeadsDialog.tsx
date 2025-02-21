import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import type { LeadEstado } from "@/lib/types";

interface ModifyLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: number[];
}

const ModifyLeadsDialog = ({ isOpen, onClose, selectedLeads }: ModifyLeadsDialogProps) => {
  const queryClient = useQueryClient();
  
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, nombre_completo")
        .order('nombre_completo');
      
      if (error) {
        console.error("Error fetching users:", error);
        throw error;
      }
      return data || [];
    },
  });

  const updateLeads = useMutation({
    mutationFn: async ({ userId, estado }: { userId?: string, estado?: LeadEstado }) => {
      const updateData: { asignado_a?: string, estado?: LeadEstado } = {};
      
      if (userId) updateData.asignado_a = userId;
      if (estado) updateData.estado = estado;

      // Si no hay nada que actualizar, salimos
      if (Object.keys(updateData).length === 0) return;

      const { error } = await supabase
        .from("leads")
        .update(updateData)
        .in("id", selectedLeads);

      if (error) throw error;

      // Registrar la acción en el historial para cada lead
      const userId_auth = (await supabase.auth.getUser()).data.user?.id;
      
      await Promise.all(selectedLeads.map(leadId => 
        supabase.from("lead_history").insert({
          lead_id: leadId,
          user_id: userId_auth,
          action: "MODIFICACIÓN_MASIVA",
          details: JSON.stringify({
            asignado_a: userId,
            estado: estado,
            total_leads_modificados: selectedLeads.length
          })
        })
      ));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Leads actualizados correctamente");
      onClose();
    },
    onError: (error) => {
      toast.error("Error al actualizar los leads");
      console.error("Error updating leads:", error);
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = formData.get("userId")?.toString();
    const estado = formData.get("estado")?.toString() as LeadEstado | undefined;
    
    updateLeads.mutate({ userId, estado });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modificar {selectedLeads.length} lead(s)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Asignar a</label>
            <Select name="userId">
              <SelectTrigger disabled={isLoading}>
                <SelectValue placeholder={
                  isLoading ? "Cargando usuarios..." : 
                  error ? "Error al cargar usuarios" :
                  "Seleccionar usuario..."
                } />
              </SelectTrigger>
              <SelectContent>
                {isLoading ? (
                  <SelectItem value="loading" disabled>Cargando...</SelectItem>
                ) : error ? (
                  <SelectItem value="error" disabled>Error al cargar usuarios</SelectItem>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nombre_completo || user.email}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>No hay usuarios disponibles</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cambiar Estado</label>
            <Select name="estado">
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado..." />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {LEAD_STATUS_LABELS[estado]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Actualizar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModifyLeadsDialog;
