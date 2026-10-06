import { useState } from 'react'
import { Mail } from 'lucide-react'
import { Toast } from '../../../shared/components/Toast'
import { useToast } from '../../../shared/hooks/useToast'
import { sendMatchResultByEmail } from '../services/mailReportService'
import { validateEmail } from '../../../shared/utils/validation'

interface MatchEmailSenderProps {
  sessionId: string
  matchId: string
}

/** Reenvia o relatório de UMA partida por e-mail (mesmo endpoint do envio automático no fim). */
export function MatchEmailSender({ sessionId, matchId }: MatchEmailSenderProps) {
  const { toast, showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!validateEmail(email.trim())) {
      showToast('error', 'Digite um e-mail válido')
      return
    }

    setSending(true)
    try {
      await sendMatchResultByEmail(sessionId, matchId, email.trim())
      showToast('success', 'Relatório da partida enviado para o e-mail informado')
      setOpen(false)
      setEmail('')
    } catch {
      showToast('error', 'Não foi possível enviar o relatório por e-mail')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setOpen((v) => !v)} className="btn-secondary w-full sm:w-auto">
        <Mail className="h-4 w-4" />
        Enviar por e-mail
      </button>

      {open && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="email@exemplo.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <button type="button" onClick={handleSend} disabled={sending} className="btn-primary w-full sm:w-auto">
            {sending ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}
