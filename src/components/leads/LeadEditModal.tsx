
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Lead {
  id: number;
  nombre_completo: string;
  email: string;
  telefono: string;
  estado: string;
  created_at: string;
  users?: {
    nombre_completo: string;
  };
}

interface LeadEditModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadEditModal = ({ lead, isOpen, onClose }: LeadEditModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="nombre">Nombre Completo</Label>
            <Input id="nombre" defaultValue={lead.nombre_completo} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={lead.email} />
          </div>
          <div>
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" type="tel" defaultValue={lead.telefono} />
          </div>
          <Button onClick={onClose}>Guardar Cambios</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
