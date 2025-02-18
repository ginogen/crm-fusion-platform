
import { Card } from "@/components/ui/card";
import { Users, CalendarCheck2, Calendar, GraduationCap } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  change: string;
  changeColor: "text-emerald-600" | "text-rose-600";
  icon: React.ReactNode;
}

const MetricCard = ({ title, value, change, changeColor, icon }: MetricCardProps) => {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-2">{value}</h3>
          <p className={`text-sm mt-1 ${changeColor}`}>{change}</p>
        </div>
        {icon}
      </div>
    </Card>
  );
};

export const MetricsCards = ({ totalLeads }: { totalLeads: number }) => {
  const metrics = [
    {
      title: "Leads Asignados",
      value: totalLeads,
      change: "+12% vs mes anterior",
      changeColor: "text-emerald-600" as const,
      icon: <Users className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Por Evacuar",
      value: 0,
      change: "-5% vs prev. month",
      changeColor: "text-rose-600" as const,
      icon: <CalendarCheck2 className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Citas Programadas",
      value: 0,
      change: "+8% vs prev. month",
      changeColor: "text-emerald-600" as const,
      icon: <Calendar className="h-5 w-5 text-muted-foreground" />,
    },
    {
      title: "Matrículas",
      value: 0,
      change: "+15% vs prev. month",
      changeColor: "text-emerald-600" as const,
      icon: <GraduationCap className="h-5 w-5 text-muted-foreground" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  );
};
