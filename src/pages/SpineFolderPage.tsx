import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, FileDown, FolderOpen, Folder, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import type { SpineSession } from '@/types'


// Strip emoji and non-latin unicode that jsPDF default fonts cannot render
function sanitizePdf(text: string): string {
  return (text ?? '')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[•·]/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\u2026/g, '...')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/[^\x00-\xFF]/g, '')
    .trim()
}

// ─── Urgency helpers ──────────────────────────────────────────────────────────

const URG_COLOR: Record<string, { dot: string; badge: string; text: string }> = {
  URGENTE:      { dot: '#EF4444', badge: 'bg-red-50 border-red-200 text-red-700',    text: 'text-red-700'    },
  SIGNIFICATIVO:{ dot: '#F59E0B', badge: 'bg-amber-50 border-amber-200 text-amber-700', text: 'text-amber-700' },
  MODERATO:     { dot: '#EAB308', badge: 'bg-yellow-50 border-yellow-200 text-yellow-700', text: 'text-yellow-700' },
  LIEVE:        { dot: '#639922', badge: 'bg-brand-50 border-brand-200 text-brand-700',  text: 'text-brand-700'  },
}
const URG_CODE: Record<string, string> = { URGENTE:'🔴', SIGNIFICATIVO:'🟠', MODERATO:'🟡', LIEVE:'🟢' }

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ s, isIt, onViewAnalysis, onViewRehab, onDelete }: {
  s: SpineSession; isIt: boolean
  onViewAnalysis: () => void
  onViewRehab: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const urg = URG_COLOR[s.urgency] ?? URG_COLOR.MODERATO

  return (
    <div className={cn(
      'rounded-2xl border bg-white overflow-hidden transition-all',
      open ? 'border-gray-200 shadow-sm' : 'border-gray-100'
    )}>
      {/* Header row */}
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-center gap-3 p-4 text-left">
        {/* Urgency dot */}
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
          style={{ background: urg.dot }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 truncate">{s.fileName}</p>
            <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border', urg.badge)}>
              {URG_CODE[s.urgency]} {s.urgency}
            </span>
          </div>
          {s.summary && (
            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{s.summary}</p>
          )}
        </div>

        {open
          ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />}
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
          {/* Analysis preview */}
          {s.analysis.quadro && (
            <div>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {isIt ? 'Quadro clinico' : 'Clinical picture'}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">{s.analysis.quadro}</p>
            </div>
          )}
          {s.analysis.diagnosi && (
            <div>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                {isIt ? 'Diagnosi' : 'Diagnosis'}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">{s.analysis.diagnosi}</p>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onViewAnalysis}
              className="flex-1 py-2 text-xs font-medium bg-brand-50 text-brand-700 rounded-xl hover:bg-brand-100 transition-colors border border-brand-200">
              {isIt ? '📋 Vedi analisi completa' : '📋 Full analysis'}
            </button>
            <button onClick={onViewRehab}
              className="flex-1 py-2 text-xs font-medium bg-surface-muted text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
              {isIt ? '🧘 Riabilitativo' : '🧘 Rehab plan'}
            </button>
          </div>

          {/* Delete row */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors">
              <Trash2 size={12} />
              {isIt ? 'Elimina referto' : 'Delete report'}
            </button>
          ) : (
            <div className="flex items-center gap-2 p-2 bg-red-50 rounded-xl">
              <p className="flex-1 text-[11px] text-red-700 font-medium">
                {isIt ? 'Confermi eliminazione?' : 'Confirm delete?'}
              </p>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1 text-xs text-gray-500 bg-white rounded-lg border border-gray-200">
                {isIt ? 'No' : 'No'}
              </button>
              <button onClick={onDelete}
                className="px-2.5 py-1 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
                {isIt ? 'Sì' : 'Yes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Month folder ─────────────────────────────────────────────────────────────

function MonthFolder({ label, sessions, defaultOpen, isIt, onViewAnalysis, onViewRehab, onDelete, onDeleteFolder }: {
  label: string; sessions: SpineSession[]; defaultOpen: boolean; isIt: boolean
  onViewAnalysis: (s: SpineSession) => void
  onViewRehab: (s: SpineSession) => void
  onDelete: (s: SpineSession) => void
  onDeleteFolder: () => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [confirmFolder, setConfirmFolder] = useState(false)

  return (
    <div className="space-y-2">
      {/* Folder header */}
      <div className="flex items-center gap-2.5 py-1">
        <button onClick={() => setOpen(x => !x)}
          className="flex items-center gap-2.5 flex-1 text-left group py-1">
          <div className="text-brand-600 transition-transform">
            {open
              ? <FolderOpen size={18} className="text-brand-500" />
              : <Folder size={18} className="text-gray-400 group-hover:text-brand-400" />}
          </div>
          <span className={cn('text-sm font-semibold transition-colors',
            open ? 'text-brand-800 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-800')}>
            {label}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            — {sessions.length} {isIt ? (sessions.length === 1 ? 'referto' : 'referti') : (sessions.length === 1 ? 'report' : 'reports')}
          </span>
          <div className="ml-auto">
            {open
              ? <ChevronDown size={13} className="text-gray-400" />
              : <ChevronRight size={13} className="text-gray-400" />}
          </div>
        </button>

        {/* Per-folder delete */}
        {!confirmFolder ? (
          <button onClick={() => setConfirmFolder(true)}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <Trash2 size={13} />
          </button>
        ) : (
          <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/20 rounded-xl px-2 py-1 border border-red-200 dark:border-red-800 flex-shrink-0">
            <span className="text-[10px] text-red-700 dark:text-red-400 font-medium whitespace-nowrap">
              {isIt ? 'Elimina folder?' : 'Delete folder?'}
            </span>
            <button onClick={() => setConfirmFolder(false)}
              className="text-[10px] text-gray-500 px-1.5 py-0.5 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600 ml-1">
              No
            </button>
            <button onClick={onDeleteFolder}
              className="text-[10px] font-medium text-white bg-red-500 px-1.5 py-0.5 rounded-md hover:bg-red-600">
              {isIt ? 'Sì' : 'Yes'}
            </button>
          </div>
        )}
      </div>

      {/* Sessions inside folder */}
      {open && (
        <div className="pl-6 space-y-2 border-l-2 border-brand-100 ml-2">
          {sessions.map(s => (
            <SessionCard key={s.id} s={s} isIt={isIt}
              onViewAnalysis={() => onViewAnalysis(s)}
              onViewRehab={() => onViewRehab(s)}
              onDelete={() => onDelete(s)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SpineFolderPage() {
  const { lang, profile, spineSessions, deleteSpineSession } = useStore()
  const navigate = useNavigate()
  const isIt = lang === 'it'

  // Group sessions by month
  const byMonth: Record<string, SpineSession[]> = {}
  spineSessions.forEach(s => {
    const d = new Date(s.date)
    const key = d.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { month: 'long', year: 'numeric' })
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(s)
  })
  const months = Object.entries(byMonth)

  function handleViewAnalysis(s: SpineSession) {
    // Store selection in sessionStorage and navigate to spine
    sessionStorage.setItem('spineLoadSession', s.id)
    navigate('/spine?load=' + s.id)
  }

  function generateSummaryPDF() {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const m = 14, cW = pageW - m * 2
      let y = m

      const BRAND = [99, 153, 34]   as [number,number,number]
      const DARK  = [17, 24, 39]    as [number,number,number]
      const GRAY  = [107,114,128]   as [number,number,number]
      const WHITE = [255,255,255]   as [number,number,number]
      const LIGHT = [245,248,240]   as [number,number,number]

      const cp = (need=8) => { if (y+need > pageH-m) { doc.addPage(); y=m } }
      const S = sanitizePdf

      // Header
      doc.setFillColor(...BRAND); doc.rect(0,0,pageW,22,'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(...WHITE)
      doc.text('BeHealth', m, 13)
      doc.setFontSize(9); doc.setFont('helvetica','normal')
      doc.text(S(isIt ? 'Sintesi Cartella Clinica Ortopedica' : 'Orthopedic Clinical Summary'), m+32, 13)
      doc.text(S(new Date().toLocaleDateString(isIt?'it-IT':'en-GB')), pageW-m, 13, {align:'right'})
      y = 28

      // Patient
      doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK)
      doc.text(S(profile.name), m, y)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
      doc.text(S(`${profile.age ?? '-'} ${isIt?'anni':'years'} - ${spineSessions.length} ${isIt?'referti':'reports'} - ${isIt?'Specialista Ortopedico & Fisiatra':'Orthopedic & Physiatry Specialist'}`), m, y+5)
      y += 14

      // Column widths
      const c = { n:8, file:52, date:22, urg:26, diag: cW-108 }

      // Table header
      doc.setFillColor(...BRAND); doc.rect(m, y, cW, 7, 'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...WHITE)
      let cx = m+2
      doc.text('#', cx, y+5); cx += c.n
      doc.text(S(isIt?'Referto':'Report'), cx, y+5); cx += c.file
      doc.text(S(isIt?'Data':'Date'), cx, y+5); cx += c.date
      doc.text('Urgenza', cx, y+5); cx += c.urg
      doc.text(S(isIt?'Diagnosi principale':'Main diagnosis'), cx, y+5)
      y += 8

      const urgColors: Record<string,[number,number,number]> = {
        URGENTE:[220,38,38], SIGNIFICATIVO:[245,158,11], MODERATO:[180,140,8], LIEVE:[99,153,34]
      }

      spineSessions.forEach((s, i) => {
        const diag = S((s.analysis.diagnosi || s.summary || '-').slice(0, 120))
        const lines = doc.splitTextToSize(diag, c.diag - 4)
        const rowH  = Math.max(9, lines.length * 4.5 + 4)
        cp(rowH)

        if (i % 2 === 0) { doc.setFillColor(...LIGHT); doc.rect(m, y, cW, rowH, 'F') }

        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...DARK)
        let rx = m+2
        doc.text(String(i+1), rx, y+5.5); rx += c.n
        doc.text(S(s.fileName.slice(0, 30)), rx, y+5.5); rx += c.file
        doc.text(S(new Date(s.date).toLocaleDateString(isIt?'it-IT':'en-GB')), rx, y+5.5); rx += c.date

        const uc = urgColors[s.urgency] ?? GRAY as [number,number,number]
        doc.setTextColor(...uc); doc.setFont('helvetica','bold')
        doc.text(S(s.urgency.slice(0,11)), rx, y+5.5); rx += c.urg
        doc.setTextColor(...DARK); doc.setFont('helvetica','normal')
        doc.text(lines, rx, y+4)
        y += rowH
      })

      // Footer
      const pages = (doc as unknown as {internal:{pages:unknown[]}}).internal.pages.length - 1
      for (let p=1; p<=pages; p++) {
        doc.setPage(p)
        doc.setFillColor(245,245,240); doc.rect(0,pageH-12,pageW,12,'F')
        doc.setFontSize(7); doc.setTextColor(...GRAY)
        doc.text(S(isIt?'BeHealth AI - Sintesi clinica, non sostituisce la visita medica':'BeHealth AI - Clinical summary, not a substitute for medical consultation'), m, pageH-5)
        doc.text(S(`${p} / ${pages}`), pageW-m, pageH-5, {align:'right'})
      }

      doc.save(S(`sintesi-ortopedica-${new Date().toLocaleDateString('it-IT').replace(/\//g,'-')}.pdf`))
    })
  }

  function generatePDF() {
    import('jspdf').then(({ default: jsPDF }) => {
      const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const pageH = doc.internal.pageSize.getHeight()
      const m = 18, cW = pageW - m * 2
      let y = m

      const BRAND = [99, 153, 34]   as [number,number,number]
      const DARK  = [17, 24, 39]    as [number,number,number]
      const GRAY  = [107,114,128]   as [number,number,number]
      const WHITE = [255,255,255]   as [number,number,number]
      const LIGHT = [245,248,240]   as [number,number,number]

      const cp = (need=10) => { if (y+need > pageH-m) { doc.addPage(); y=m } }
      const h2 = (title: string) => {
        cp(10)
        doc.setFillColor(...LIGHT)
        doc.roundedRect(m, y, cW, 7, 1,1,'F')
        doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...BRAND)
        doc.text(sanitizePdf(title.toUpperCase()), m+3, y+4.8)
        y += 10
      }
      const body = (text: string) => {
        if (!text) return
        doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...DARK)
        const lines = doc.splitTextToSize(sanitizePdf(text), cW)
        lines.forEach((l:string)=>{ cp(4.5); doc.text(sanitizePdf(l),m,y); y+=4.2 })
        y += 3
      }

      // Cover
      doc.setFillColor(...BRAND); doc.rect(0,0,pageW,30,'F')
      doc.setFont('helvetica','bold'); doc.setFontSize(17); doc.setTextColor(...WHITE)
      doc.text(sanitizePdf('BeHealth'), m, 14)
      doc.setFontSize(10); doc.setFont('helvetica','normal')
      doc.text(sanitizePdf(isIt ? 'Cartella Clinica Ortopedica' : 'Orthopedic Clinical Folder'), m+36, 14)
      doc.setFontSize(8)
      doc.text(sanitizePdf(new Date().toLocaleDateString(isIt?'it-IT':'en-GB')), pageW-m, 14, {align:'right'})
      y = 38

      // Patient
      doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...DARK)
      doc.text(sanitizePdf(profile.name), m, y)
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY)
      doc.text(sanitizePdf(`${profile.age ?? '-'} ${isIt?'anni':'years'} - ${spineSessions.length} ${isIt?'sessioni':'sessions'}`), m, y+5)
      y += 14

      // Each session
      months.forEach(([monthLabel, sessions]) => {
        cp(12)
        doc.setFillColor(...BRAND); doc.rect(m, y, cW, 8,'F')
        doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...WHITE)
        doc.text(sanitizePdf(monthLabel.toUpperCase()), m+3, y+5.5)
        y += 11

        sessions.forEach((s, i) => {
          cp(14)
          const urgPrefix: Record<string,string> = {URGENTE:'[!]',SIGNIFICATIVO:'[~]',MODERATO:'[-]',LIEVE:'[v]'}
          doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...DARK)
          doc.text(sanitizePdf(`${urgPrefix[s.urgency]??''} ${s.fileName}`), m, y)
          doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY)
          doc.text(sanitizePdf(new Date(s.date).toLocaleDateString(isIt?'it-IT':'en-GB') + ' - ' + s.urgency), m, y+4)
          y += 8
          const a = s.analysis
          h2(isIt?'Quadro Clinico':'Clinical Picture'); body(a.quadro)
          h2(isIt?'Diagnosi':'Diagnosis'); body(a.diagnosi)
          if (a.redFlags) { h2('Red Flags'); body(a.redFlags) }
          h2(isIt?'Piano di Gestione':'Management Plan'); body(a.piano)
          h2(isIt?'Protocollo Riabilitativo':'Rehabilitation'); body(a.riabilitazione)
          if (a.esami) { h2(isIt?'Esami':'Tests'); body(a.esami) }
          if (i < sessions.length - 1) { y += 4; cp(2) }
        })
        y += 6
      })

      // Footer on every page
      const pages = (doc as unknown as {internal:{pages:unknown[]}}).internal.pages.length - 1
      for (let p=1; p<=pages; p++) {
        doc.setPage(p)
        doc.setFillColor(245,245,240); doc.rect(0,pageH-12,pageW,12,'F')
        doc.setFontSize(7); doc.setTextColor(...GRAY)
        doc.text(sanitizePdf(isIt?'Generato da BeHealth AI - non sostituisce la visita specialistica':'Generated by BeHealth AI - not a substitute for specialist consultation'), m, pageH-5)
        doc.text(sanitizePdf(`${p} / ${pages}`), pageW-m, pageH-5, {align:'right'})
      }

      doc.save(`cartella-ortopedica-${new Date().toLocaleDateString('it-IT').replace(/\//g,'-')}.pdf`)
    })
  }

  if (spineSessions.length === 0) return (
    <div className="flex flex-col items-center justify-center flex-1 text-center gap-4 py-16 animate-slide-up">
      <span className="text-5xl">🗂</span>
      <p className="text-sm font-medium text-gray-500">
        {isIt ? 'Nessuna sessione salvata' : 'No sessions saved yet'}
      </p>
      <p className="text-xs text-gray-400 max-w-xs">
        {isIt ? 'Carica il tuo primo referto dallo Specialista Ortopedico per iniziare la cartella clinica.' : 'Upload your first report from the Orthopedic Specialist to start your clinical folder.'}
      </p>
      <button onClick={() => navigate('/spine')}
        className="text-xs text-brand-600 font-medium hover:underline mt-2">
        {isIt ? '→ Vai allo Specialista' : '→ Go to Specialist'}
      </button>
    </div>
  )

  return (
    <div className="space-y-4 animate-slide-up pb-8">

      {/* Header card */}
      <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-base font-semibold text-gray-900 flex items-center gap-2">
              🗂 {isIt ? 'Cartella Clinica' : 'Clinical Folder'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {profile.name}
              {profile.age ? ` · ${profile.age} ${isIt ? 'anni' : 'yrs'}` : ''}
              {` · ${spineSessions.length} ${isIt ? (spineSessions.length === 1 ? 'sessione' : 'sessioni') : (spineSessions.length === 1 ? 'session' : 'sessions')}`}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {isIt ? 'Specialista Ortopedico & Fisiatra' : 'Orthopedic & Physiatry Specialist'}
            </p>
          </div>
          <span className="text-4xl">🩻</span>
        </div>

        {/* PDF buttons */}
        <div className="mt-4 flex gap-2">
          <button onClick={generateSummaryPDF}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-surface-muted text-brand-700 dark:text-brand-400 rounded-xl text-xs font-medium hover:bg-brand-50 dark:hover:bg-brand-900/20 border border-brand-200 dark:border-brand-700 transition-all">
            <FileDown size={13} />
            {isIt ? 'PDF Sintesi' : 'Summary PDF'}
          </button>
          <button onClick={generatePDF}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-medium hover:bg-brand-700 active:scale-[0.98] transition-all">
            <FileDown size={13} />
            {isIt ? 'PDF Completo' : 'Full PDF'}
          </button>
        </div>
      </div>

      {/* Month folders */}
      <div className="space-y-4">
        {months.map(([label, sessions], i) => (
          <MonthFolder
            key={label}
            label={label}
            sessions={sessions}
            defaultOpen={i === 0}
            isIt={isIt}
            onViewAnalysis={handleViewAnalysis}
            onViewRehab={s => navigate(`/spine/rehab?id=${s.id}`)}
            onDelete={s => deleteSpineSession(s.id)}
            onDeleteFolder={() => sessions.forEach(s => deleteSpineSession(s.id))}
          />
        ))}
      </div>

    </div>
  )
}
