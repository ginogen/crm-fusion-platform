
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { es } from 'date-fns/locale';
import { addDays, startOfWeek, format } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  view?: "month" | "week" | "day";
  tasks?: any[];
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  view = "month",
  tasks = [],
  ...props
}: CalendarProps) {
  const handleTaskPosition = (taskDate: Date) => {
    const cellHeight = 128;
    const dayStart = new Date(taskDate).setHours(0, 0, 0, 0);
    const taskTime = taskDate.getTime() - dayStart;
    const dayLength = 24 * 60 * 60 * 1000;
    const topPercentage = (taskTime / dayLength) * 100;
    
    return {
      top: `${Math.min(90, topPercentage)}%`,
      left: '5%',
      width: '90%',
    };
  };

  if (view === "week") {
    const today = new Date();
    const weekStart = startOfWeek(today, { locale: es });
    const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="w-full">
        <div className="grid grid-cols-7 gap-px divide-x divide-gray-200">
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="min-h-[256px] p-2 relative">
              <div className="text-sm font-medium mb-2">
                {format(date, 'EEEE', { locale: es })}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(date, 'd', { locale: es })}
              </div>
              {tasks
                .filter(task => {
                  const taskDate = new Date(task.fecha);
                  return taskDate.toDateString() === date.toDateString();
                })
                .map((task) => {
                  const taskDate = new Date(task.fecha);
                  const style = handleTaskPosition(taskDate);
                  
                  return (
                    <div
                      key={task.id}
                      className="absolute bg-blue-100 text-blue-700 p-2 rounded text-xs hover:bg-blue-200 transition-colors cursor-pointer"
                      style={style}
                    >
                      <div className="font-medium truncate">
                        {task.tipo} {format(taskDate, 'HH:mm')}
                      </div>
                      <div className="truncate">{task.leads?.nombre_completo}</div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      locale={es}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center gap-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 text-muted-foreground hover:opacity-100"
        ),
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] h-9",
        row: "flex w-full",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          props.mode === "range" ? "[&:has([aria-selected])]:bg-accent rounded-none first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md" : ""
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal text-sm aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside: "text-muted-foreground opacity-50",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
