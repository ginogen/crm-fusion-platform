import * as React from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"

interface AvailabilityStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  userId: string
}

export function AvailabilityStatus({ userId, className, ...props }: AvailabilityStatusProps) {
  const [isAvailable, setIsAvailable] = React.useState(false)
  const [startTime, setStartTime] = React.useState<Date | null>(null)
  const [elapsedTime, setElapsedTime] = React.useState("00:00:00")
  const timerRef = React.useRef<NodeJS.Timeout>()

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const updateTimer = React.useCallback(() => {
    if (startTime) {
      const seconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
      setElapsedTime(formatTime(seconds))
    }
  }, [startTime])

  const handleToggle = async (checked: boolean) => {
    setIsAvailable(checked)
    
    if (checked) {
      // Iniciar nuevo registro
      const now = new Date()
      setStartTime(now)
      
      try {
        await supabase
          .from('user_time_records')
          .insert({
            user_id: userId,
            start_time: now.toISOString(),
          })
      } catch (error) {
        console.error('Error al crear registro de tiempo:', error)
      }
    } else {
      // Finalizar registro actual
      const endTime = new Date()
      const durationSeconds = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : 0
      
      try {
        const { data: records } = await supabase
          .from('user_time_records')
          .select('id')
          .eq('user_id', userId)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)

        if (records?.[0]?.id) {
          await supabase
            .from('user_time_records')
            .update({
              end_time: endTime.toISOString(),
              duration_seconds: durationSeconds
            })
            .eq('id', records[0].id)
        }
      } catch (error) {
        console.error('Error al actualizar registro de tiempo:', error)
      }

      setStartTime(null)
      setElapsedTime("00:00:00")
    }
  }

  React.useEffect(() => {
    if (isAvailable) {
      timerRef.current = setInterval(updateTimer, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isAvailable, updateTimer])

  // Verificar si hay un registro activo al cargar el componente
  React.useEffect(() => {
    const checkActiveRecord = async () => {
      try {
        const { data: records } = await supabase
          .from('user_time_records')
          .select('start_time')
          .eq('user_id', userId)
          .is('end_time', null)
          .order('start_time', { ascending: false })
          .limit(1)

        if (records?.[0]?.start_time) {
          const startTime = new Date(records[0].start_time)
          setStartTime(startTime)
          setIsAvailable(true)
          updateTimer()
        }
      } catch (error) {
        console.error('Error al verificar registro activo:', error)
      }
    }

    checkActiveRecord()
  }, [userId])

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <span className={cn(
        "text-sm font-medium",
        isAvailable ? "text-green-500" : "text-red-500 font-semibold"
      )}>
        {isAvailable ? elapsedTime : (
          <span className="flex items-center">
            <span className="h-2 w-2 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
            Estoy en cita
          </span>
        )}
      </span>
      <Switch
        checked={isAvailable}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  )
} 