
import { Card } from "@/components/ui/card";

const TaskList = () => {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-6">Tareas Pendientes</h2>
      <div className="text-sm text-muted-foreground">
        No hay tareas pendientes
      </div>
    </Card>
  );
};

export default TaskList;
