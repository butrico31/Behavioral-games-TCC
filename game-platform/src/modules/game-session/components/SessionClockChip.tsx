import { Clock } from "lucide-react"

/**
 * Hora em que a sessão termina, no cabeçalho. É hora fixa, não contagem regressiva: relógio
 * correndo pressiona a decisão, e num dilema do prisioneiro repetido isso mudaria o
 * comportamento que a pesquisa quer medir. Quem encerra a partida é sempre o servidor.
 */
export function SessionClockChip({ sessionEndsAt }: { sessionEndsAt: number | null }) {
  if (sessionEndsAt === null) return null

  const hora = new Date(sessionEndsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  return (
    <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#DCEFFB] bg-white/90 px-3.5 py-1.5 text-[12.5px] font-bold text-[#0069C4]">
      <Clock className="h-4 w-4" />
      Sessão até {hora}
    </span>
  )
}
