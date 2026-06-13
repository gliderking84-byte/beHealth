import { useStore } from '@/store/useStore'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, AlertTriangle, Scale, Mail } from 'lucide-react'

interface Section {
  icon: React.ReactNode
  titleIt: string
  titleEn: string
  contentIt: string[]
  contentEn: string[]
}

const SECTIONS: Section[] = [
  {
    icon: <AlertTriangle size={16} />,
    titleIt: 'Disclaimer medico',
    titleEn: 'Medical disclaimer',
    contentIt: [
      'BeHealth è uno strumento di supporto personale alla salute e NON costituisce consulenza medica professionale.',
      'Le analisi, i piani alimentari e i consigli generati dall\'AI sono puramente informativi e non sostituiscono in alcun modo la diagnosi, la prescrizione o il trattamento da parte di un medico qualificato.',
      'In caso di sintomi, patologie sospette o dubbi sulla propria salute, consultare sempre un medico o uno specialista abilitato.',
      'Non ritardare né evitare di consultare un professionista sanitario sulla base delle informazioni fornite da BeHealth.',
    ],
    contentEn: [
      'BeHealth is a personal health support tool and does NOT constitute professional medical advice.',
      'AI-generated analyses, meal plans and recommendations are purely informational and do not in any way replace diagnosis, prescription or treatment by a qualified physician.',
      'In case of symptoms, suspected conditions or health concerns, always consult a licensed doctor or specialist.',
      'Do not delay or avoid seeking professional medical advice based on information provided by BeHealth.',
    ],
  },
  {
    icon: <Shield size={16} />,
    titleIt: 'Dati e privacy',
    titleEn: 'Data & privacy',
    contentIt: [
      'Tutti i dati sanitari inseriti in BeHealth (valori ematici, referti, profilo) sono archiviati esclusivamente sul dispositivo dell\'utente via localStorage.',
      'Nessun dato personale o sanitario viene trasmesso a server di terze parti, eccetto le richieste anonimizzate all\'API AI per la generazione dei contenuti.',
      'L\'utente è responsabile del backup dei propri dati tramite la funzione Esporta disponibile nelle Impostazioni.',
      'BeHealth non è responsabile per la perdita di dati dovuta a cancellazione del browser, reset del dispositivo o altri eventi.',
    ],
    contentEn: [
      'All health data entered in BeHealth (blood values, reports, profile) is stored exclusively on the user\'s device via localStorage.',
      'No personal or health data is transmitted to third-party servers, except anonymized requests to the AI API for content generation.',
      'The user is responsible for backing up their data using the Export function available in Settings.',
      'BeHealth is not responsible for data loss due to browser deletion, device reset or other events.',
    ],
  },
  {
    icon: <Scale size={16} />,
    titleIt: 'Limitazione di responsabilità',
    titleEn: 'Limitation of liability',
    contentIt: [
      'BeHealth è fornito "così com\'è" senza garanzie di accuratezza, completezza o idoneità per uno scopo specifico.',
      'Gli sviluppatori di BeHealth non sono responsabili per danni diretti, indiretti, incidentali o consequenziali derivanti dall\'uso o dall\'impossibilità di usare l\'applicazione.',
      'L\'utente utilizza BeHealth a proprio rischio e responsabilità, consapevole che le informazioni fornite dall\'AI possono contenere errori.',
      'In nessun caso la responsabilità degli sviluppatori potrà superare l\'importo eventualmente pagato dall\'utente per l\'utilizzo del servizio.',
    ],
    contentEn: [
      'BeHealth is provided "as is" without warranties of accuracy, completeness or fitness for a specific purpose.',
      'The developers of BeHealth are not liable for direct, indirect, incidental or consequential damages arising from the use or inability to use the application.',
      'The user uses BeHealth at their own risk, aware that AI-provided information may contain errors.',
      'In no event shall the developers\' liability exceed the amount paid by the user for the service.',
    ],
  },
  {
    icon: <Mail size={16} />,
    titleIt: 'Contatti',
    titleEn: 'Contact',
    contentIt: [
      'Per domande sui presenti Termini & Condizioni o sull\'applicazione, contattare: legal@behealth.app',
      'Ultimo aggiornamento: Giugno 2026',
    ],
    contentEn: [
      'For questions about these Terms & Conditions or the application, contact: legal@behealth.app',
      'Last updated: June 2026',
    ],
  },
]

export default function TermsPage() {
  const { lang } = useStore()
  const navigate  = useNavigate()
  const isIt      = lang === 'it'

  return (
    <div className="space-y-4 pb-8 animate-slide-up">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-xl bg-surface-muted dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            {isIt ? 'Termini & Condizioni' : 'Terms & Conditions'}
          </h1>
          <p className="text-xs text-gray-400">
            {isIt ? 'Versione 1.0 — Giugno 2026' : 'Version 1.0 — June 2026'}
          </p>
        </div>
      </div>

      {/* Beta warning banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-3 flex items-start gap-2.5">
        <AlertTriangle size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          {isIt
            ? 'BeHealth è attualmente in fase Beta pubblica (v0.5.0-beta). Alcune funzionalità potrebbero essere incomplete o soggette a modifiche.'
            : 'BeHealth is currently in Public Beta (v0.5.0-beta). Some features may be incomplete or subject to change.'}
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map((s, i) => (
        <div key={i} className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-surface-muted dark:bg-gray-900/40">
            <span className="text-brand-600 dark:text-brand-400">{s.icon}</span>
            <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              {isIt ? s.titleIt : s.titleEn}
            </h2>
          </div>
          <div className="px-4 py-3 space-y-2">
            {(isIt ? s.contentIt : s.contentEn).map((line, j) => (
              <p key={j} className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed">
                {line}
              </p>
            ))}
          </div>
        </div>
      ))}

      {/* Acceptance note */}
      <p className="text-[10px] text-center text-gray-400 dark:text-gray-600 px-4">
        {isIt
          ? 'Utilizzando BeHealth accetti i presenti Termini & Condizioni. Se non accetti, interrompi l\'utilizzo dell\'applicazione.'
          : 'By using BeHealth you agree to these Terms & Conditions. If you do not agree, stop using the application.'}
      </p>
    </div>
  )
}
