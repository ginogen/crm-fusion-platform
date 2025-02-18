
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { LeadsFilters } from "@/components/dashboard/LeadsFilters";
import { LeadsTable } from "@/components/dashboard/LeadsTable";
import TaskList from "@/components/TaskList";
import LeadEditModal from "@/components/LeadEditModal";
import GestionModal from "@/components/GestionModal";
import LeadHistorialSheet from "@/components/LeadHistorialSheet";

const Dashboard = () => {
  const [filterName, setFilterName] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAssignedTo, setFilterAssignedTo] = useState("");
  const [openName, setOpenName] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openAssigned, setOpenAssigned] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select(`
          *,
          users (nombre_completo)
        `);
      return data || [];
    },
  });

  const uniqueNames = leads ? Array.from(new Set(leads.map(lead => lead.nombre_completo))).filter(Boolean) : [];
  const uniqueEmails = leads ? Array.from(new Set(leads.map(lead => lead.email))).filter(Boolean) : [];
  const uniqueUsers = leads ? Array.from(new Set(leads.map(lead => lead.users?.nombre_completo))).filter(Boolean) : [];

  const filteredLeads = leads?.filter(lead => {
    const nameMatch = !filterName || lead.nombre_completo === filterName;
    const emailMatch = !filterEmail || lead.email === filterEmail;
    const statusMatch = !filterStatus || lead.estado === filterStatus;
    const assignedMatch = !filterAssignedTo || lead.users?.nombre_completo === filterAssignedTo;
    return nameMatch && emailMatch && statusMatch && assignedMatch;
  }) || [];

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <MetricsCards totalLeads={leads?.length || 0} />
      
      <TaskList />

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-6">Leads Recientes</h2>
        <div className="space-y-4">
          <LeadsFilters
            filterName={filterName}
            filterEmail={filterEmail}
            filterStatus={filterStatus}
            filterAssignedTo={filterAssignedTo}
            uniqueNames={uniqueNames}
            uniqueEmails={uniqueEmails}
            uniqueUsers={uniqueUsers}
            openName={openName}
            openEmail={openEmail}
            openAssigned={openAssigned}
            setOpenName={setOpenName}
            setOpenEmail={setOpenEmail}
            setOpenAssigned={setOpenAssigned}
            setFilterName={setFilterName}
            setFilterEmail={setFilterEmail}
            setFilterStatus={setFilterStatus}
            setFilterAssignedTo={setFilterAssignedTo}
          />

          <LeadsTable
            leads={filteredLeads}
            onViewLead={(lead) => {
              setSelectedLead(lead);
              setShowEditModal(true);
            }}
            onManageLead={(lead) => {
              setSelectedLead(lead);
              setShowGestionModal(true);
            }}
            onViewHistory={(lead) => {
              setSelectedLead(lead);
              setShowHistorialSheet(true);
            }}
          />
        </div>
      </Card>

      <LeadEditModal 
        lead={selectedLead} 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)} 
      />
      <GestionModal 
        lead={selectedLead} 
        isOpen={showGestionModal} 
        onClose={() => setShowGestionModal(false)} 
      />
      <LeadHistorialSheet 
        lead={selectedLead} 
        isOpen={showHistorialSheet} 
        onClose={() => setShowHistorialSheet(false)} 
      />
    </div>
  );
};

export default Dashboard;
