
import { Card } from "@/components/ui/card";
import { CalendarCheck2, Users, Calendar, GraduationCap } from "lucide-react";

const Dashboard = () => {
  const metrics = [
    {
      title: "Leads Asignados",
      value: "156",
      icon: Users,
      trend: "+12%",
    },
    {
      title: "Por Evacuar",
      value: "23",
      icon: CalendarCheck2,
      trend: "-5%",
    },
    {
      title: "Citas Programadas",
      value: "45",
      icon: Calendar,
      trend: "+8%",
    },
    {
      title: "Matrículas",
      value: "89",
      icon: GraduationCap,
      trend: "+15%",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </p>
                <h3 className="text-2xl font-bold mt-2">{metric.value}</h3>
                <p
                  className={`text-sm mt-1 ${
                    metric.trend.startsWith("+")
                      ? "text-emerald-600"
                      : "text-rose-600"
                  }`}
                >
                  {metric.trend} vs prev. month
                </p>
              </div>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
