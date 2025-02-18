
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { Pencil, ClipboardList, History } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadEstado } from "@/lib/types";
import { useEffect, useState } from "react";

interface LeadsTableProps {
  onEdit?: (lead: any) => void;
  onGestion?: (lead: any) => void;
  onHistorial?: (lead: any) => void;
  showCheckboxes?: boolean;
  selectedLeads?: number[];
  onSelectLead?: (leadId: number, selected: boolean) => void;
}

const LeadsTable = ({ 
  onEdit, 
  onGestion, 
  onHistorial,
  showCheckboxes = false,
  selectedLeads = [],
  onSelectLead
}: LeadsTableProps) => {
  const queryClient = useQueryClient();
  const [allSelected, setAllSelected] = useState(false);

  const { data: leads } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select(`
          *,
          users (nombre_completo)
        `);
      return data;
    },
  });

  useEffect(() => {
    if (leads?.length && leads.length > 0) {
      const allLeadsSelected = leads.every(lead => selectedLeads.includes(lead.id));
      setAllSelected(allLeadsSelected);
    }
  }, [selectedLeads, leads]);

  const handleSelectAll = (checked: boolean) => {
    if (!leads) return;
    
    const leadIds = leads.map(lead => lead.id);
    if (checked) {
      // Seleccionar todos los leads que no estén ya seleccionados
      leadIds.forEach(id => {
        if (!selectedLeads.includes(id)) {
          onSelectLead?.(id, true);
        }
      });
    } else {
      // Deseleccionar todos los leads
      leadIds.forEach(id => {
        if (selectedLeads.includes(id)) {
          onSelectLead?.(id, false);
        }
      });
    }
  };

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: number, newStatus: LeadEstado }) => {
      const { data: lead } = await supabase
        .from("leads")
        .select()
        .eq("id", leadId)
        .single();

      const { error } = await supabase
        .from("leads")
        .update({ estado: newStatus })
        .eq("id", leadId);

      if (error) throw error;

      await supabase.from("lead_history").insert({
        lead_id: leadId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "CAMBIO_ESTADO",
        details: JSON.stringify({
          estado_anterior: lead.estado,
          nuevo_estado: newStatus
        })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Estado actualizado correctamente");
    },
    onError: (error) => {
      toast.error("Error al actualizar el estado");
      console.error("Error updating lead status:", error);
    }
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {showCheckboxes && (
              <TableHead className="w-12">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableHead>
            )}
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Asignado A</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads?.map((lead) => (
            <TableRow key={lead.id}>
              {showCheckboxes && (
                <TableCell>
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300"
                    checked={selectedLeads.includes(lead.id)}
                    onChange={(e) => onSelectLead?.(lead.id, e.target.checked)}
                  />
                </TableCell>
              )}
              <TableCell>{lead.nombre_completo}</TableCell>
              <TableCell>{lead.email}</TableCell>
              <TableCell>{lead.telefono}</TableCell>
              <TableCell>
                <Select
                  value={lead.estado}
                  onValueChange={(value: LeadEstado) => {
                    updateLeadStatus.mutate({ leadId: lead.id, newStatus: value });
                  }}
                >
                  <SelectTrigger 
                    className={cn(
                      "w-[180px]",
                      lead.estado === "SIN_LLAMAR" && "bg-white",
                      lead.estado === "LLAMAR_DESPUES" && "bg-blue-100",
                      lead.estado === "CITA_PROGRAMADA" && "bg-yellow-100",
                      lead.estado === "MATRICULA" && "bg-green-100",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STATUSES.map((estado) => (
                      <SelectItem 
                        key={estado} 
                        value={estado}
                        className={cn(
                          estado === "SIN_LLAMAR" && "bg-white",
                          estado === "LLAMAR_DESPUES" && "bg-blue-100",
                          estado === "CITA_PROGRAMADA" && "bg-yellow-100",
                          estado === "MATRICULA" && "bg-green-100",
                        )}
                      >
                        {LEAD_STATUS_LABELS[estado]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>{lead.users?.nombre_completo}</TableCell>
              <TableCell>{format(new Date(lead.created_at), "dd/MM/yyyy")}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(lead)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onGestion?.(lead)}
                  >
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onHistorial?.(lead)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeadsTable;
