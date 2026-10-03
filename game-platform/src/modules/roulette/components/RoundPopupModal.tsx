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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-popup-title"
    >
      <div className="surface-panel w-full max-w-md p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-primary/15">
            <Megaphone className="h-5 w-5 text-primary" />
          </span>
          <div>
            <p className="heading-kicker">Rodada {String(round).padStart(2, '0')}</p>
            <h2 id="round-popup-title" className="text-2xl text-foreground">
              Aviso do professor
            </h2>
          </div>
        </div>

        <p className="surface-subtle mb-6 whitespace-pre-line break-words p-5 text-base leading-relaxed text-foreground">
          {message}
        </p>

        <button ref={button_ref} type="button" onClick={onClose} className="btn-primary w-full">
          Entendi
        </button>
      </div>
    </div>
  )
}
