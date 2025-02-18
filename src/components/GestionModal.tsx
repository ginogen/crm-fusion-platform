
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GestionModalProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

const GestionModal = ({ lead, isOpen, onClose }: GestionModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Gestión</DialogTitle>
        </DialogHeader>
        {lead && (
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-medium">Nombre</p>
              <p className="text-sm text-muted-foreground">{lead.nombre_completo}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Estado Actual</p>
              <p className="text-sm text-muted-foreground">{lead.estado}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GestionModal;
