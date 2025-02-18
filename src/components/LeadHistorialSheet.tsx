
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface LeadHistorialSheetProps {
  lead: any;
  isOpen: boolean;
  onClose: () => void;
}

const LeadHistorialSheet = ({ lead, isOpen, onClose }: LeadHistorialSheetProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Historial del Lead</SheetTitle>
        </SheetHeader>
        {lead && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground">
              No hay registros de historial disponibles
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default LeadHistorialSheet;
