
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LeadEditModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

const LeadEditModal = ({ lead, isOpen, onClose }: LeadEditModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Lead</DialogTitle>
        </DialogHeader>
        {lead && (
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-medium">Nombre</p>
              <p className="text-sm text-muted-foreground">{lead.nombre_completo}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{lead.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Teléfono</p>
              <p className="text-sm text-muted-foreground">{lead.telefono}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadEditModal;
