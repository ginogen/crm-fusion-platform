import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format, addDays } from "date-fns";
import { 
  CalendarCheck2, 
  Users, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  Search,
  Eye, 
  ClipboardList, 
  History
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LEAD_STATUSES, MANAGEMENT_TYPES, LEAD_STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [openStatus, setOpenStatus] = useState(false);
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

  // Solo calculamos los valores únicos si tenemos datos
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Leads Asignados
              </p>
              <h3 className="text-2xl font-bold mt-2">{leads?.length || 0}</h3>
              <p className="text-sm mt-1 text-emerald-600">+12% vs mes anterior</p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
        
        <Card key={"Por Evacuar"} className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Por Evacuar
              </p>
              <h3 className="text-2xl font-bold mt-2">0</h3>
              <p className="text-sm mt-1 text-rose-600">-5% vs prev. month</p>
            </div>
            <CalendarCheck2 className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card key={"Citas Programadas"} className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Citas Programadas
              </p>
              <h3 className="text-2xl font-bold mt-2">0</h3>
              <p className="text-sm mt-1 text-emerald-600">+8% vs prev. month</p>
            </div>
            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        <Card key={"Matrículas"} className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Matrículas
              </p>
              <h3 className="text-2xl font-bold mt-2">0</h3>
              <p className="text-sm mt-1 text-emerald-600">+15% vs prev. month</p>
            </div>
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      <TaskList />

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-6">Leads Recientes</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Nombre</label>
              <Popover open={openName} onOpenChange={setOpenName}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openName}
                    className="w-full justify-between"
                  >
                    {filterName || "Seleccionar nombre..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  {leads && leads.length > 0 ? (
                    <Command>
                      <CommandInput placeholder="Buscar nombre..." />
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        {uniqueNames.map((name) => (
                          <CommandItem
                            key={name}
                            value={name}
                            onSelect={() => {
                              setFilterName(name === filterName ? "" : name);
                              setOpenName(false);
                            }}
                          >
                            {name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <Popover open={openEmail} onOpenChange={setOpenEmail}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openEmail}
                    className="w-full justify-between"
                  >
                    {filterEmail || "Seleccionar email..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  {leads && leads.length > 0 ? (
                    <Command>
                      <CommandInput placeholder="Buscar email..." />
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        {uniqueEmails.map((email) => (
                          <CommandItem
                            key={email}
                            value={email}
                            onSelect={() => {
                              setFilterEmail(email === filterEmail ? "" : email);
                              setOpenEmail(false);
                            }}
                          >
                            {email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Estado</label>
              <Popover open={openStatus} onOpenChange={setOpenStatus}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openStatus}
                    className="w-full justify-between"
                  >
                    {filterStatus || "Seleccionar estado..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  {leads && leads.length > 0 ? (
                    <Command>
                      <CommandInput placeholder="Buscar estado..." />
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        {LEAD_STATUSES.map((status) => (
                          <CommandItem
                            key={status}
                            value={status}
                            onSelect={() => {
                              setFilterStatus(status === filterStatus ? "" : status);
                              setOpenStatus(false);
                            }}
                          >
                            {status}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Asignado a</label>
              <Popover open={openAssigned} onOpenChange={setOpenAssigned}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openAssigned}
                    className="w-full justify-between"
                  >
                    {filterAssignedTo || "Seleccionar usuario..."}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  {leads && leads.length > 0 ? (
                    <Command>
                      <CommandInput placeholder="Buscar usuario..." />
                      <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                      <CommandGroup>
                        {uniqueUsers.map((user) => (
                          <CommandItem
                            key={user}
                            value={user}
                            onSelect={() => {
                              setFilterAssignedTo(user === filterAssignedTo ? "" : user);
                              setOpenAssigned(false);
                            }}
                          >
                            {user}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No hay datos disponibles
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{lead.nombre_completo}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.telefono}</TableCell>
                  <TableCell>{lead.estado}</TableCell>
                  <TableCell>{lead.users?.nombre_completo}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="ghost" onClick={() => {
                        setSelectedLead(lead);
                        setShowHistorialSheet(true);
                      }}>
                        <History className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => {
                        setSelectedLead(lead);
                        setShowGestionModal(true);
                      }}>
                        <ClipboardList className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => {
                        setSelectedLead(lead);
                        setShowEditModal(true);
                      }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <LeadEditModal lead={selectedLead} isOpen={showEditModal} onClose={() => setShowEditModal(false)} />
      <GestionModal lead={selectedLead} isOpen={showGestionModal} onClose={() => setShowGestionModal(false)} />
      <LeadHistorialSheet lead={selectedLead} isOpen={showHistorialSheet} onClose={() => setShowHistorialSheet(false)} />
    </div>
  );
};

export default Dashboard;
