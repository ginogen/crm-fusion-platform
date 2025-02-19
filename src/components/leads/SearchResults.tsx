import { Button } from "@/components/ui/button";
import { Eye, ClipboardList } from "lucide-react";

type Lead = {
  id: string;
  nombre_completo: string;
  email: string;
  telefono: string;
  estado: string;
  origen: string;
}

interface SearchResultsProps {
  results: Lead[];
  visible: boolean;
  onClose: () => void;
  onEditLead: (lead: Lead) => void;
  onGestionLead: (lead: Lead) => void;
}

export const SearchResults = ({ 
  results, 
  visible, 
  onClose,
  onEditLead,
  onGestionLead 
}: SearchResultsProps) => {
  if (!visible) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-lg border max-h-[400px] overflow-y-auto">
      {results.length === 0 ? (
        <div className="p-4 text-sm text-gray-500 text-center">
          No se encontraron resultados
        </div>
      ) : (
        <div className="divide-y">
          {results.map((lead) => (
            <div key={lead.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
              <div>
                <p className="font-medium">{lead.nombre_completo}</p>
                <p className="text-sm text-gray-500">{lead.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEditLead(lead)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onGestionLead(lead)}
                >
                  <ClipboardList className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 