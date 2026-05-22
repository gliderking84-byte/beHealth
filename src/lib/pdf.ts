import jsPDF from 'jspdf'
import type { SavedAnalysis } from '@/types'

// Strip HTML tags for plain text
function stripHtml(html: string): string {
  return html
    .replace(/<h4[^>]*>/gi, '\n')
    .replace(/<\/h4>/gi, '\n')
    .replace(/<li[^>]*>/gi, '  • ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Wrap text to fit page width
function wrapText(doc: jsPDF, text: string, _x: number, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth)
}

export function exportAnalysisPDF(analysis: SavedAnalysis, patientName: string, lang: 'it' | 'en' = 'it') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW  = doc.internal.pageSize.getWidth()
  const pageH  = doc.internal.pageSize.getHeight()
  const margin = 18
  const contentW = pageW - margin * 2
  let y = margin

  const BRAND   = [99, 153, 34]    as [number, number, number]
  const TEAL    = [15, 110, 86]    as [number, number, number]
  const DARK    = [17, 24, 39]     as [number, number, number]
  const GRAY    = [107, 114, 128]  as [number, number, number]
  const LIGHT   = [245, 245, 240]  as [number, number, number]
  const RED     = [239, 68, 68]    as [number, number, number]
  const AMBER   = [245, 158, 11]   as [number, number, number]

  // ── Helper: new page check ─────────────────────────────────────────────────
  function checkPage(needed = 15) {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('BeHealth', margin, 14)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(lang === 'it' ? 'Report Analisi Personalizzata' : 'Personalized Analysis Report', margin + 40, 14)

  // Date top-right
  doc.setFontSize(8)
  const dateStr = new Date(analysis.date).toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
  doc.text(dateStr, pageW - margin, 14, { align: 'right' })

  y = 32

  // ── Patient info card ──────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.roundedRect(margin, y, contentW, 22, 3, 3, 'F')
  doc.setTextColor(...DARK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(patientName, margin + 4, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(`Health Score: ${analysis.healthScore}/100`, margin + 4, y + 15)
  doc.text(
    `${lang === 'it' ? 'Livello dettaglio' : 'Detail level'}: ${analysis.detailLevel}`,
    margin + 60, y + 15
  )
  doc.text(analysis.title, pageW - margin - 4, y + 8, { align: 'right' })

  y += 30

  // ── Lab values snapshot ────────────────────────────────────────────────────
  if (analysis.labSnapshot.length > 0) {
    doc.setTextColor(...TEAL)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(lang === 'it' ? '📊 Valori Ematici al momento dell\'analisi' : '📊 Blood Values at Time of Analysis', margin, y)
    y += 6

    const colW = (contentW - 4) / 3
    let col = 0

    analysis.labSnapshot.forEach((v) => {
      checkPage(12)
      const x = margin + col * (colW + 2)

      const statusColor: [number, number, number] =
        v.status === 'bad'  ? RED :
        v.status === 'warn' ? AMBER :
        BRAND

      doc.setFillColor(
        v.status === 'bad'  ? 254 : v.status === 'warn' ? 255 : 234,
        v.status === 'bad'  ? 226 : v.status === 'warn' ? 243 : 243,
        v.status === 'bad'  ? 226 : v.status === 'warn' ? 199 : 222
      )
      doc.roundedRect(x, y, colW, 10, 2, 2, 'F')

      doc.setTextColor(...DARK)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(v.name.slice(0, 18), x + 2, y + 4)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...statusColor)
      doc.setFontSize(8)
      doc.text(`${v.value} ${v.unit}`, x + 2, y + 9)

      col++
      if (col >= 3) { col = 0; y += 13 }
    })
    if (col > 0) y += 13
    y += 4
  }

  // ── AI Analysis text ───────────────────────────────────────────────────────
  checkPage(20)
  doc.setFillColor(...TEAL)
  doc.rect(margin, y, contentW, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(lang === 'it' ? '🤖 Analisi AI — Dr.ssa Marchetti' : '🤖 AI Analysis — Dr. Marchetti', margin + 3, y + 5.5)
  y += 12

  const plainText = stripHtml(analysis.aiText)
  const lines = plainText.split('\n')

  lines.forEach((line) => {
    if (!line.trim()) { y += 2; return }
    checkPage(8)

    const isBullet  = line.startsWith('  •')
    const isSection = line.length < 60 && line === line.toUpperCase() && line.trim().length > 3

    if (isSection) {
      y += 2
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...TEAL)
      doc.text(line.trim(), margin, y)
      y += 5
    } else if (isBullet) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      const wrapped = wrapText(doc, line.trim(), margin + 4, contentW - 6)
      wrapped.forEach((wl) => {
        checkPage(5)
        doc.text(wl, margin + 4, y)
        y += 4.5
      })
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...DARK)
      const wrapped = wrapText(doc, line.trim(), margin, contentW)
      wrapped.forEach((wl) => {
        checkPage(5)
        doc.text(wl, margin, y)
        y += 5
      })
    }
  })

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  checkPage(20)
  y += 6
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(margin, y, contentW, 16, 2, 2, 'F')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  const disclaimer = lang === 'it'
    ? 'Questa analisi ha scopo puramente informativo e non costituisce diagnosi medica. Consulta sempre il tuo medico curante prima di prendere qualsiasi decisione clinica.'
    : 'This analysis is for informational purposes only and does not constitute medical diagnosis. Always consult your doctor before making any clinical decisions.'
  const dLines = wrapText(doc, disclaimer, margin + 3, contentW - 6)
  dLines.forEach((dl, i) => {
    doc.text(dl, margin + 3, y + 5 + i * 4)
  })
  y += 22

  // ── Footer on every page ───────────────────────────────────────────────────
  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFillColor(...BRAND)
    doc.rect(0, pageH - 8, pageW, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('BeHealth — AI Health Dashboard', margin, pageH - 3)
    doc.text(`${p} / ${totalPages}`, pageW - margin, pageH - 3, { align: 'right' })
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  const filename = `BeHealth-Analisi-${new Date(analysis.date).toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
}
