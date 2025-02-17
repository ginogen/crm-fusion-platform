
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
    const cellHeight = 128; // altura de la celda en píxeles
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

  const modifiers = {
    hasTasks: tasks.map(task => new Date(task.fecha)),
  };

  const modifiersStyles = {
    hasTasks: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
    },
  };

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      locale={es}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-between pt-1 relative items-center px-8",
        caption_label: "text-base font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "size-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground rounded-md w-full h-10 font-normal text-[0.9rem] flex items-center justify-center",
        row: "flex w-full mt-0",
        cell: cn(
          "relative min-h-[128px] w-full text-center text-sm p-0 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 border border-border",
          view === "week" && "min-h-[256px]",
          view === "day" && "min-h-[512px]"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal absolute top-1 right-1 aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      footer={
        <div className="space-y-2">
          {tasks.map((task) => {
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
      }
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
