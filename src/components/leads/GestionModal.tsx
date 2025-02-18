
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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

interface GestionModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export const GestionModal = ({ lead, isOpen, onClose }: GestionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gestionar Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="notas">Notas de Gestión</Label>
            <Textarea id="notas" placeholder="Ingrese las notas de gestión..." />
          </div>
          <Button onClick={onClose}>Guardar Gestión</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
