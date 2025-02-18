
import { useState } from "react";
import LeadsTable from "@/components/leads/LeadsTable";

const Reasignar = () => {
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);

  const handleSelectLead = (leadId: number, selected: boolean) => {
    if (selected) {
      setSelectedLeads(prev => [...prev, leadId]);
    } else {
      setSelectedLeads(prev => prev.filter(id => id !== leadId));
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reasignar</h1>
        <div className="flex gap-2">
          {selectedLeads.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {selectedLeads.length} leads seleccionados
            </p>
          )}
        </div>
      </div>

      <LeadsTable 
        showCheckboxes={true}
        selectedLeads={selectedLeads}
        onSelectLead={handleSelectLead}
      />
    </div>
  );
};

export default Reasignar;
