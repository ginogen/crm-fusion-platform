
import { useState } from "react";
import LeadsTable from "@/components/leads/LeadsTable";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

const Reasignar = () => {
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showGestionModal, setShowGestionModal] = useState(false);
  const [showHistorialSheet, setShowHistorialSheet] = useState(false);

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
        onEdit={(lead) => {
          setSelectedLead(lead);
          setShowEditModal(true);
        }}
        onGestion={(lead) => {
          setSelectedLead(lead);
          setShowGestionModal(true);
        }}
        onHistorial={(lead) => {
          setSelectedLead(lead);
          setShowHistorialSheet(true);
        }}
      />

      {/* Modal de Edición */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Contenido del modal de edición...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Gestión */}
      <Dialog open={showGestionModal} onOpenChange={setShowGestionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Contenido del modal de gestión...</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet de Historial */}
      <Sheet open={showHistorialSheet} onOpenChange={setShowHistorialSheet}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Historial del Lead</SheetTitle>
            <SheetDescription>
              Información completa y acciones realizadas
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {selectedLead && (
              <>
                <div className="space-y-4">
                  <h3 className="font-semibold">Información del Lead</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Nombre:</span> {selectedLead.nombre_completo}</p>
                    <p><span className="font-medium">Email:</span> {selectedLead.email}</p>
                    <p><span className="font-medium">Teléfono:</span> {selectedLead.telefono}</p>
                    <p><span className="font-medium">Estado:</span> {selectedLead.estado}</p>
                    <p><span className="font-medium">Asignado a:</span> {selectedLead.users?.nombre_completo}</p>
                    <p><span className="font-medium">Fecha de creación:</span> {format(new Date(selectedLead.created_at), "dd/MM/yyyy HH:mm")}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-semibold">Historial de Acciones</h3>
                  <div className="space-y-4">
                    {/* Aquí iría el historial de acciones */}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Reasignar;
