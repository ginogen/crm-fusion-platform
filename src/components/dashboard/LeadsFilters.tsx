
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from "@/lib/constants";

interface LeadsFiltersProps {
  filterName: string;
  filterEmail: string;
  filterStatus: string;
  filterAssignedTo: string;
  uniqueNames: string[];
  uniqueEmails: string[];
  uniqueUsers: string[];
  openName: boolean;
  openEmail: boolean;
  openAssigned: boolean;
  setOpenName: (open: boolean) => void;
  setOpenEmail: (open: boolean) => void;
  setOpenAssigned: (open: boolean) => void;
  setFilterName: (name: string) => void;
  setFilterEmail: (email: string) => void;
  setFilterStatus: (status: string) => void;
  setFilterAssignedTo: (user: string) => void;
}

export const LeadsFilters = ({
  filterName,
  filterEmail,
  filterStatus,
  filterAssignedTo,
  uniqueNames,
  uniqueEmails,
  uniqueUsers,
  openName,
  openEmail,
  openAssigned,
  setOpenName,
  setOpenEmail,
  setOpenAssigned,
  setFilterName,
  setFilterEmail,
  setFilterStatus,
  setFilterAssignedTo,
}: LeadsFiltersProps) => {
  return (
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
          </PopoverContent>
        </Popover>
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Estado</label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar estado..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {LEAD_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
