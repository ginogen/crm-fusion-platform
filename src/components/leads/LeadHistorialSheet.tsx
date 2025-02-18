
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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

interface LeadHistorialSheetProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
}

export const LeadHistorialSheet = ({ lead, isOpen, onClose }: LeadHistorialSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Historial del Lead</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <p>Historial de {lead.nombre_completo}</p>
          {/* Aquí iría el listado del historial */}
        </div>
      </SheetContent>
    </Sheet>
  );
};
