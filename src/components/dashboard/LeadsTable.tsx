
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, ClipboardList, History } from "lucide-react";

interface Lead {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  estado: string;
  users?: {
    nombre_completo: string;
  };
}

interface LeadsTableProps {
  leads: Lead[];
  onViewLead: (lead: Lead) => void;
  onManageLead: (lead: Lead) => void;
  onViewHistory: (lead: Lead) => void;
}

export const LeadsTable = ({ leads, onViewLead, onManageLead, onViewHistory }: LeadsTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Asignado a</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>{lead.nombre_completo}</TableCell>
            <TableCell>{lead.email}</TableCell>
            <TableCell>{lead.telefono}</TableCell>
            <TableCell>{lead.estado}</TableCell>
            <TableCell>{lead.users?.nombre_completo}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button size="icon" variant="ghost" onClick={() => onViewHistory(lead)}>
                  <History className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onManageLead(lead)}>
                  <ClipboardList className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onViewLead(lead)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
