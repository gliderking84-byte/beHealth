import { useState, useRef } from 'react'
import {
  Camera, User, Mail, Calendar, Save,
  Lock, Fingerprint, Eye, EyeOff, CheckCircle, Shield
} from 'lucide-react'
import { Card, Button, SectionTitle } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cn('p-4 space-y-3', className)}>{children}</Card>
}

// ─── Input field ──────────────────────────────────────────────────────────────
function Field({
  icon: Icon, label, value, onChange, type = 'text', placeholder, disabled
}: {
  icon: React.ElementType; label: string; value: string
  onChange?: (v: string) => void; type?: string
  placeholder?: string; disabled?: boolean
}) {
  const [showPwd, setShowPwd] = useState(false)
  const isPwd = type === 'password'

  return (
    <div>
      <label className="text-xs text-gray-500 font-medium mb-1.5 flex items-center gap-1.5">
        <Icon size={11} className="text-gray-400" />
        {label}
      </label>
      <div className="relative">
        <input
          type={isPwd && showPwd ? 'text' : type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'input pr-10',
            disabled && 'bg-surface-muted text-gray-400 cursor-not-allowed'
          )}
        />
        {isPwd && (
          <button
            type="button"
            onClick={() => setShowPwd((x) => !x)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────
function ToggleRow({
  icon: Icon, label, sublabel, value, onChange, disabled, disabledReason
}: {
  icon: React.ElementType; label: string; sublabel?: string
  value: boolean; onChange: (v: boolean) => void
  disabled?: boolean; disabledReason?: string
}) {
  return (
    <div className={cn('flex items-center gap-3', disabled && 'opacity-50')}>
      <div className="w-8 h-8 rounded-xl bg-surface-muted flex items-center justify-center text-gray-500 flex-shrink-0">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 font-medium">{label}</p>
        {(sublabel || (disabled && disabledReason)) && (
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">
            {disabled && disabledReason ? disabledReason : sublabel}
          </p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={cn(
          'relative w-10 h-6 rounded-full transition-all duration-200 flex-shrink-0',
          value ? 'bg-brand-600' : 'bg-gray-200',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200',
          value ? 'translate-x-4' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}

// ─── Avatar uploader ──────────────────────────────────────────────────────────
function AvatarUploader({ profile, onUpload }: {
  profile: { name: string; surname: string; avatarUrl?: string }
  onUpload: (dataUrl: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const initials = `${profile.name[0] ?? ''}${profile.surname[0] ?? ''}`.toUpperCase()

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onUpload(ev.target!.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col items-center py-2">
      <div
        className="relative w-20 h-20 rounded-full cursor-pointer group"
        onClick={() => fileRef.current?.click()}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="avatar"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-400 to-teal-600 flex items-center justify-center text-white text-2xl font-semibold font-display">
            {initials || <User size={28} />}
          </div>
        )}
        {/* Overlay on hover */}
        <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Camera size={18} className="text-white" />
        </div>
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        className="mt-2 text-xs text-brand-600 font-medium hover:text-brand-800 transition-colors"
      >
        Cambia foto
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  )
}

// ─── Profile page ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { lang, profile, updateProfile, preferences, setBiometric } = useStore()
  const isIt = lang === 'it'

  // Local editable state
  const [name,     setName]     = useState(profile.name)
  const [surname,  setSurname]  = useState(profile.surname ?? '')
  const [age,      setAge]      = useState(String(profile.age))
  const [email,    setEmail]    = useState(profile.email ?? '')
  const [sex,      setSex]      = useState(profile.sex)
  const [pwd,      setPwd]      = useState('')
  const [pwdConf,  setPwdConf]  = useState('')
  const [saved,    setSaved]    = useState(false)
  const [pwdError, setPwdError] = useState('')

  // Biometric support detection
  const biometricSupported = typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    typeof (window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } })
      .PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable === 'function'

  async function handleBiometricToggle(enabled: boolean) {
    if (!biometricSupported) return
    if (enabled) {
      try {
        // Trigger a platform authenticator prompt so the user grants permission
        const available = await (window as unknown as {
          PublicKeyCredential: { isUserVerifyingPlatformAuthenticatorAvailable: () => Promise<boolean> }
        }).PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (available) setBiometric(true)
        else alert(isIt ? 'Biometria non disponibile su questo dispositivo.' : 'Biometrics not available on this device.')
      } catch {
        setBiometric(false)
      }
    } else {
      setBiometric(false)
    }
  }

  function handleSave() {
    setPwdError('')
    if (pwd && pwd !== pwdConf) {
      setPwdError(isIt ? 'Le password non coincidono.' : 'Passwords do not match.')
      return
    }
    updateProfile({
      name:    name.trim() || profile.name,
      surname: surname.trim(),
      age:     parseInt(age) || profile.age,
      email:   email.trim(),
      sex,
    })
    setSaved(true)
    setPwd(''); setPwdConf('')
    setTimeout(() => setSaved(false), 2500)
  }

  const SEX_OPTIONS = [
    { value: 'male',   labelEn: 'Male',   labelIt: 'Maschio' },
    { value: 'female', labelEn: 'Female', labelIt: 'Femmina' },
    { value: 'other',  labelEn: 'Other',  labelIt: 'Altro' },
  ] as const

  return (
    <div className="space-y-4 animate-slide-up pb-4">
      <h1 className="font-display text-base font-semibold text-gray-900">
        {isIt ? 'Il tuo profilo' : 'Your profile'}
      </h1>

      {/* ── Avatar ───────────────────────────────────────────────────────── */}
      <Section>
        <AvatarUploader
          profile={{ name, surname, avatarUrl: profile.avatarUrl }}
          onUpload={(url) => updateProfile({ avatarUrl: url })}
        />
      </Section>

      {/* ── Personal info ─────────────────────────────────────────────────── */}
      <Section>
        <SectionTitle icon={<User size={14} />}>
          {isIt ? 'Informazioni personali' : 'Personal info'}
        </SectionTitle>

        <div className="grid grid-cols-2 gap-3">
          <Field icon={User} label={isIt ? 'Nome' : 'First name'}
            value={name} onChange={setName} placeholder="Luca" />
          <Field icon={User} label={isIt ? 'Cognome' : 'Last name'}
            value={surname} onChange={setSurname} placeholder="Rossi" />
        </div>

        <Field icon={Mail} label="Email"
          value={email} onChange={setEmail}
          type="email" placeholder="luca@email.com" />

        <div className="grid grid-cols-2 gap-3">
          <Field icon={Calendar} label={isIt ? 'Età' : 'Age'}
            value={age} onChange={setAge} type="number" placeholder="35" />

          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              {isIt ? 'Sesso biologico' : 'Biological sex'}
            </label>
            <div className="flex gap-1.5">
              {SEX_OPTIONS.map(({ value, labelEn, labelIt }) => (
                <button
                  key={value}
                  onClick={() => setSex(value)}
                  className={cn(
                    'flex-1 py-2 text-[11px] font-medium rounded-xl border transition-all',
                    sex === value
                      ? 'bg-brand-50 border-brand-400 text-brand-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {isIt ? labelIt : labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── Security ─────────────────────────────────────────────────────── */}
      <Section>
        <SectionTitle icon={<Lock size={14} />}>
          {isIt ? 'Sicurezza' : 'Security'}
        </SectionTitle>

        <Field icon={Lock} label={isIt ? 'Nuova password' : 'New password'}
          value={pwd} onChange={setPwd} type="password"
          placeholder={isIt ? 'Lascia vuoto per non cambiare' : 'Leave blank to keep current'} />

        <Field icon={Lock} label={isIt ? 'Conferma password' : 'Confirm password'}
          value={pwdConf} onChange={setPwdConf} type="password"
          placeholder={isIt ? 'Ripeti la password' : 'Repeat password'} />

        {pwdError && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <Shield size={11} /> {pwdError}
          </p>
        )}

        <ToggleRow
          icon={Fingerprint}
          label={isIt ? 'Accesso biometrico' : 'Biometric login'}
          sublabel={isIt ? 'Face ID / Touch ID' : 'Face ID / Touch ID'}
          value={preferences.biometricEnabled}
          onChange={handleBiometricToggle}
          disabled={!biometricSupported}
          disabledReason={isIt ? 'Non supportato su questo dispositivo' : 'Not supported on this device'}
        />
      </Section>

      {/* ── Save button ───────────────────────────────────────────────────── */}
      <Button
        variant="primary"
        onClick={handleSave}
        className="w-full"
      >
        {saved
          ? <><CheckCircle size={14} /> {isIt ? 'Salvato!' : 'Saved!'}</>
          : <><Save size={14} /> {isIt ? 'Salva modifiche' : 'Save changes'}</>
        }
      </Button>
    </div>
  )
}
