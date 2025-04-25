import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export const TimePicker = ({ date, setDate }: TimePickerProps) => {
  // Si no hay fecha seleccionada, usamos la fecha actual
  const selectedDate = date || new Date();
  
  // Extraer hora y minutos
  const hours = selectedDate.getHours();
  const minutes = selectedDate.getMinutes();
  
  // Generar opciones de horas (0-23)
  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  
  // Generar opciones de minutos (0, 15, 30, 45)
  const minuteOptions = [0, 15, 30, 45];
  
  const handleHourChange = (value: string) => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setHours(parseInt(value));
    setDate(newDate);
  };
  
  const handleMinuteChange = (value: string) => {
    if (!date) return;
    const newDate = new Date(date);
    newDate.setMinutes(parseInt(value));
    setDate(newDate);
  };
  
  return (
    <div className="flex flex-col space-y-2">
      <Label htmlFor="time">Hora</Label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={hours.toString()} onValueChange={handleHourChange}>
            <SelectTrigger>
              <SelectValue placeholder="Hora" />
            </SelectTrigger>
            <SelectContent>
              {hourOptions.map((hour) => (
                <SelectItem key={hour} value={hour.toString()}>
                  {hour.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center">:</div>
        <div className="flex-1">
          <Select value={minutes.toString()} onValueChange={handleMinuteChange}>
            <SelectTrigger>
              <SelectValue placeholder="Minutos" />
            </SelectTrigger>
            <SelectContent>
              {minuteOptions.map((minute) => (
                <SelectItem key={minute} value={minute.toString()}>
                  {minute.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}; 