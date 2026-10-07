import { useEffect, useRef } from 'react'
import { Megaphone } from 'lucide-react'

interface RoundPopupModalProps {
  round: number
  message: string
  onClose: () => void
}

/**
 * Mensagem do professor antes do giro de uma rodada. O texto vem da configuração da sessão e é
 * exibido como texto puro (whitespace-pre-line mantém as quebras de linha que ele digitou).
 */
export function RoundPopupModal({ round, message, onClose }: RoundPopupModalProps) {
  const button_ref = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    button_ref.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,36,60,.45)] px-4 backdrop-blur-sm font-[Outfit,system-ui,sans-serif] text-[#12151B]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-popup-title"
    >
      <div className="w-full max-w-md rounded-[34px] bg-white p-8 shadow-[0_30px_70px_-20px_rgba(6,54,104,.45)]">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-[#E9F6FE]">
            <Megaphone className="h-5 w-5 text-[#0069C4]" />
          </span>
          <div>
            <p className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[#0069C4]">Rodada {round}</p>
            <h2 id="round-popup-title" className="text-2xl font-black tracking-[-0.02em] [font-family:inherit]">
              Aviso do professor
            </h2>
          </div>
        </div>

        <p className="mb-6 whitespace-pre-line break-words rounded-[20px] border-2 border-[#E6EEF6] bg-[#F7FAFD] p-5 text-base font-medium leading-relaxed text-[#3C4654]">
          {message}
        </p>

        <button ref={button_ref} type="button" onClick={onClose} className="w-full rounded-full bg-[#00A3F5] px-8 py-3.5 text-[17px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5">
          ENTENDI
        </button>
      </div>
    </div>
  )
}
