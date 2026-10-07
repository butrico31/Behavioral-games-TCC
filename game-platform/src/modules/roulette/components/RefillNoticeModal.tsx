import { useEffect, useRef } from 'react'
import { Coins } from 'lucide-react'
import type { RefillNoticeState } from '../hooks/useRouletteMatch'

interface RefillNoticeModalProps {
  notice: RefillNoticeState
  onClose: () => void
}

/** Aviso de que as fichas chegaram a zero e foram repostas; a mesa fica bloqueada até fechar. */
export function RefillNoticeModal({ notice, onClose }: RefillNoticeModalProps) {
  const button_ref = useRef<HTMLButtonElement>(null)
  const left = Math.max(0, notice.max - notice.used)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,36,60,.45)] px-4 font-[Outfit,system-ui,sans-serif] text-[#12151B] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refill-notice-title"
    >
      <div className="w-full max-w-md rounded-[34px] bg-white p-8 text-center shadow-[0_30px_70px_-20px_rgba(6,54,104,.45)]">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8E6]">
          <Coins className="h-7 w-7 text-[#B7791F]" />
        </span>
        <h2 id="refill-notice-title" className="mt-4 text-2xl font-black tracking-[-0.02em] [font-family:inherit]">
          Suas fichas acabaram
        </h2>
        <p className="mt-2 text-base font-medium leading-relaxed text-[#3C4654]">
          Você recebeu <strong className="text-[#0B7A43]">{notice.coins} fichas</strong> para continuar jogando.
        </p>
        <p className="mt-4 rounded-[20px] border-2 border-[#FBE7B4] bg-[#FFF8E6] px-4 py-3 text-[14px] font-semibold text-[#6B5A2A]">
          {left > 0
            ? `Reposição ${notice.used} de ${notice.max}. Ainda ${left === 1 ? 'resta 1 reposição' : `restam ${left} reposições`}.`
            : `Esta foi a última reposição (${notice.used} de ${notice.max}). Se as fichas acabarem de novo, a partida termina.`}
        </p>
        <button
          ref={button_ref}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-[#00A3F5] px-8 py-3.5 text-[17px] font-black tracking-[0.06em] text-[#08243C] transition-transform hover:-translate-y-0.5"
        >
          CONTINUAR
        </button>
      </div>
    </div>
  )
}
