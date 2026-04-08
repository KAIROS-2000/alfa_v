import { serverApi } from '@/lib/server-api'
import { LessonCreationWizard } from '@/components/lesson-creation-wizard'
import { SiteHeader } from '@/components/site-header'
import { TeacherOverviewData } from '@/types'

interface TeacherLessonCreationPageProps {
  searchParams?: Promise<{
    classId?: string
    fromLessonId?: string
  }>
}

export default async function TeacherLessonCreationPage({ searchParams }: TeacherLessonCreationPageProps) {
  const params = await searchParams
  const initialOverview = await serverApi<TeacherOverviewData>('/teacher/overview').catch(() => null)
  const initialClassId = params?.classId ? Number(params.classId) : null
  const sourceLessonId = params?.fromLessonId ? Number(params.fromLessonId) : null

  return (
    <main>
      <SiteHeader />
      <LessonCreationWizard
        initialClasses={initialOverview?.classes || []}
        initialClassId={Number.isFinite(initialClassId) ? initialClassId : null}
        sourceLessonId={Number.isFinite(sourceLessonId) ? sourceLessonId : null}
      />
    </main>
  )
}
