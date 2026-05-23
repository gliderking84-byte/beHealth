import { useState } from 'react'
import { Shield, ChevronDown, ChevronUp, ExternalLink, CheckCircle } from 'lucide-react'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0 overflow-hidden',
        value ? 'bg-brand-600' : 'bg-gray-200'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200',
        value ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(x => !x)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-surface-muted transition-colors"
      >
        <span className="text-xs font-semibold text-gray-700">{title}</span>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-3 pb-3 text-[11px] text-gray-500 leading-relaxed space-y-2">
          {children}
        </div>
      )}
    </div>
  )
}

export default function PrivacyPage() {
  const { lang, gdprConsents, setGdprConsents } = useStore()
  const isIt = lang === 'it'
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setGdprConsents({ acceptedAt: new Date().toISOString().split('T')[0] })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const CONSENTS = [
    {
      key: 'dataRetention' as const,
      required: true,
      titleIt: 'Archiviazione dati sanitari',
      titleEn: 'Health data storage',
      descIt: 'Necessario per salvare i tuoi valori ematici e il profilo di salute sul dispositivo. Non disattivabile.',
      descEn: 'Required to save your blood values and health profile on your device. Cannot be disabled.',
    },
    {
      key: 'personalisation' as const,
      required: false,
      titleIt: 'Personalizzazione AI',
      titleEn: 'AI personalisation',
      descIt: 'Consente all\'AI di utilizzare i tuoi dati sanitari per fornire raccomandazioni personalizzate.',
      descEn: 'Allows AI to use your health data to provide personalised recommendations.',
    },
    {
      key: 'analytics' as const,
      required: false,
      titleIt: 'Analytics utilizzo',
      titleEn: 'Usage analytics',
      descIt: 'Raccolta anonima di dati sull\'uso dell\'app per migliorare l\'esperienza.',
      descEn: 'Anonymous collection of app usage data to improve the experience.',
    },
    {
      key: 'marketing' as const,
      required: false,
      titleIt: 'Comunicazioni salute',
      titleEn: 'Health communications',
      descIt: 'Ricezione di consigli e aggiornamenti sulla salute via notifica.',
      descEn: 'Receive health tips and app updates via notification.',
    },
  ]

  return (
    <div className="space-y-4 animate-slide-up pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
          <Shield size={20} />
        </div>
        <div>
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? 'Privacy & GDPR' : 'Privacy & GDPR'}
          </h1>
          <p className="text-xs text-gray-500">
            {isIt ? 'Gestisci i tuoi consensi e i tuoi dati' : 'Manage your consents and data'}
          </p>
        </div>
      </div>

      {/* GDPR notice */}
      <Card className="p-4 border-brand-100 bg-brand-50/30">
        <p className="text-xs text-gray-600 leading-relaxed">
          {isIt
            ? 'BeHealth tratta i tuoi dati sanitari (categoria speciale ai sensi dell\'Art. 9 GDPR) esclusivamente per fornirti il servizio. I dati sono salvati localmente sul tuo dispositivo e non vengono condivisi con terze parti senza il tuo consenso esplicito.'
            : 'BeHealth processes your health data (special category under GDPR Art. 9) exclusively to provide the service. Data is stored locally on your device and is not shared with third parties without your explicit consent.'}
        </p>
        {gdprConsents.acceptedAt && (
          <p className="text-[10px] text-brand-600 mt-2 flex items-center gap-1">
            <CheckCircle size={10} />
            {isIt ? `Consensi aggiornati il ${gdprConsents.acceptedAt}` : `Consents updated on ${gdprConsents.acceptedAt}`}
          </p>
        )}
      </Card>

      {/* Consent toggles */}
      <Card className="p-4">
        <SectionTitle icon={<Shield size={14} />}>
          {isIt ? 'Gestione consensi' : 'Consent management'}
        </SectionTitle>
        <div className="space-y-4">
          {CONSENTS.map(({ key, required, titleIt, titleEn, descIt, descEn }) => (
            <div key={key} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <p className="text-sm font-medium text-gray-800">{isIt ? titleIt : titleEn}</p>
                  {required && (
                    <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                      {isIt ? 'Necessario' : 'Required'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{isIt ? descIt : descEn}</p>
              </div>
              <Toggle
                value={gdprConsents[key]}
                onChange={required ? () => {} : (v) => setGdprConsents({ [key]: v })}
              />
            </div>
          ))}
        </div>

        <Button variant="primary" onClick={handleSave} className="w-full mt-4">
          {saved
            ? <><CheckCircle size={13} /> {isIt ? 'Salvato!' : 'Saved!'}</>
            : (isIt ? 'Salva preferenze' : 'Save preferences')
          }
        </Button>
      </Card>

      {/* Legal sections */}
      <Card className="p-4">
        <SectionTitle icon={<Shield size={14} />}>
          {isIt ? 'Informativa legale' : 'Legal information'}
        </SectionTitle>
        <div className="space-y-2">
          <LegalSection title={isIt ? 'Titolare del trattamento' : 'Data controller'}>
            <p>{isIt ? 'BeHealth è il titolare del trattamento dei dati personali raccolti tramite questa applicazione.' : 'BeHealth is the data controller for personal data collected through this application.'}</p>
          </LegalSection>

          <LegalSection title={isIt ? 'Dati trattati (Art. 9 GDPR)' : 'Data processed (GDPR Art. 9)'}>
            <p>{isIt
              ? 'Trattiamo dati sanitari di categoria speciale: valori ematici, stato di salute percepito, obiettivi di benessere. Base giuridica: consenso esplicito dell\'interessato (Art. 9 par. 2 lett. a GDPR).'
              : 'We process special category health data: blood values, perceived health status, wellness goals. Legal basis: explicit consent of the data subject (GDPR Art. 9(2)(a)).'}</p>
          </LegalSection>

          <LegalSection title={isIt ? 'Dove sono i tuoi dati' : 'Where your data lives'}>
            <p>{isIt
              ? 'I tuoi dati sono salvati esclusivamente sul dispositivo tramite localStorage. Le chiamate all\'AI (Anthropic Claude) trasmettono dati anonimi/pseudonimi al server solo durante l\'analisi e non vengono conservati.'
              : 'Your data is stored exclusively on your device via localStorage. AI calls (Anthropic Claude) transmit anonymous/pseudonymous data to the server only during analysis and are not retained.'}</p>
          </LegalSection>

          <LegalSection title={isIt ? 'I tuoi diritti GDPR' : 'Your GDPR rights'}>
            <p>{isIt
              ? 'Hai diritto di: accesso (Art. 15), rettifica (Art. 16), cancellazione (Art. 17), limitazione (Art. 18), portabilità (Art. 20), opposizione (Art. 21). Puoi esercitarli dalle Impostazioni → Gestione Dati o contattando privacy@behealth.app'
              : 'You have the right to: access (Art. 15), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), portability (Art. 20), objection (Art. 21). Exercise them via Settings → Data Management or contact privacy@behealth.app'}</p>
          </LegalSection>

          <LegalSection title={isIt ? 'Periodo di conservazione' : 'Retention period'}>
            <p>{isIt
              ? 'I dati sono conservati sul dispositivo finché non vengono eliminati manualmente dall\'utente o tramite il reset dell\'app. Non è prevista cancellazione automatica.'
              : 'Data is retained on the device until manually deleted by the user or via app reset. No automatic deletion is scheduled.'}</p>
          </LegalSection>
        </div>
      </Card>

      {/* Version + contact */}
      <div className="text-center space-y-1">
        <p className="text-[10px] text-gray-400">BeHealth v0.1.0 · {isIt ? 'Ultimo aggiornamento' : 'Last updated'}: 2025</p>
        <a href="mailto:privacy@behealth.app" className="text-[10px] text-brand-600 flex items-center justify-center gap-1">
          privacy@behealth.app <ExternalLink size={9} />
        </a>
      </div>
    </div>
  )
}
