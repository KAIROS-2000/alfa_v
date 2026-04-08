import { serverApi } from '@/lib/server-api'
import { SiteHeader } from '@/components/site-header'
import { LessonPlayer, type LessonPlayerPayload } from '@/components/lesson-player'

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params
  const initialData = await serverApi<LessonPlayerPayload>(`/lessons/${lessonId}`).catch(() => null)
  return (
    <main>
      <SiteHeader />
      <div className="page-shell mx-auto max-w-7xl">
        <LessonPlayer lessonId={Number(lessonId)} initialData={initialData} />
      </div>
    </main>
  )
}
