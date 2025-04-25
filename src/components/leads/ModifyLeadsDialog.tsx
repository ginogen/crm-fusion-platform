import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import type { LeadEstado } from "@/lib/types";
import { SearchableSelect, type OptionType } from "@/components/ui/searchable-select";
import { useState } from "react";

interface ModifyLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeads: number[];
}

const ModifyLeadsDialog = ({ isOpen, onClose, selectedLeads }: ModifyLeadsDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedEstado, setSelectedEstado] = useState<string>("");
  
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

  const userOptions: OptionType[] = users?.map(user => ({
    value: user.id,
    label: user.nombre_completo || user.email
  })) || [];

  const estadoOptions: OptionType[] = LEAD_STATUSES.map(estado => ({
    value: estado,
    label: LEAD_STATUS_LABELS[estado]
  }));

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
    const userId = selectedUserId || undefined;
    const estado = selectedEstado as LeadEstado | undefined;
    
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
            <SearchableSelect
              options={userOptions}
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              placeholder={
                isLoading ? "Cargando usuarios..." : 
                error ? "Error al cargar usuarios" :
                "Seleccionar usuario..."
              }
              emptyMessage="No hay usuarios disponibles"
              disabled={isLoading || !!error}
              name="userId"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cambiar Estado</label>
            <SearchableSelect
              options={estadoOptions}
              value={selectedEstado}
              onValueChange={setSelectedEstado}
              placeholder="Seleccionar estado..."
              emptyMessage="No hay estados disponibles"
              name="estado"
            />
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
