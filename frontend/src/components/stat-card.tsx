export function StatCard({ value, label, accent }: { value: string; label: string; accent?: string }) {
  return (
    <article className="brand-stat-card codequest-card p-5" data-kicker="metric" data-motion-item data-motion-hover>
      <p className={`text-4xl font-black leading-none ${accent || 'text-slate-900'}`}>{value}</p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{label}</p>
    </article>
  )
}
