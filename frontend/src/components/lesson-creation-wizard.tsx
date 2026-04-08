'use client'

import { api } from '@/lib/api'
import { hasExplicitCodeTaskIntent } from '@/lib/task-intent'
import type { AppTheme } from '@/lib/theme'
import { setTheme } from '@/lib/theme'
import type { ClassroomItem, LessonCatalogItem } from '@/types'
import clsx from 'clsx'
import {
	ArrowLeft,
	ArrowRight,
	BookOpen,
	Check,
	CheckCircle2,
	ChevronRight,
	CircleHelp,
	ClipboardCheck,
	Clock3,
	Eye,
	LayoutTemplate,
	ListChecks,
	MoonStar,
	Save,
	ShieldCheck,
	Sparkles,
	SunMedium,
	X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

type AgeGroup = 'junior' | 'middle' | 'senior'
type LessonFormat = 'guided' | 'skills' | 'project' | 'revision'
type PracticeFormat = 'none' | 'text' | 'code'
type CheckMode = 'manual' | 'keywords' | 'tests'

interface JudgeTestCase {
	input: string
	expected: string
}

interface WizardState {
	title: string
	ageGroup: AgeGroup
	duration: string
	summary: string
	passingScore: string
	lessonFormat: LessonFormat
	formatNote: string
	theoryText: string
	keyPoints: string
	interactiveSteps: string
	practiceFormat: PracticeFormat
	taskTitle: string
	taskPrompt: string
	taskHints: string
	checkMode: CheckMode
	answerKeywords: string
	programmingLanguage: 'Python' | 'JavaScript'
	starterCode: string
	timeLimitMs: string
	memoryLimitMb: string
	judgeTests: JudgeTestCase[]
}

interface WizardStep {
	id: string
	title: string
	short: string
	icon: typeof LayoutTemplate
}

type NoticeTone = 'info' | 'success'

interface NoticeState {
	tone: NoticeTone
	text: string
}

interface CreatedLessonState {
	id: number
	title: string
	summary: string
}

interface LessonCreationWizardProps {
	initialClasses: ClassroomItem[]
	initialClassId?: number | null
	sourceLessonId?: number | null
}

const DRAFT_KEY = 'progyx_lesson_creation_draft_v1'

const WIZARD_STEPS: WizardStep[] = [
	{
		id: 'foundation',
		title: 'Основа',
		short: 'Базовые параметры урока',
		icon: LayoutTemplate,
	},
	{
		id: 'format',
		title: 'Формат',
		short: 'Шаблон и логика подачи',
		icon: Sparkles,
	},
	{
		id: 'content',
		title: 'Содержание',
		short: 'Теория и маршрут урока',
		icon: BookOpen,
	},
	{
		id: 'practice',
		title: 'Практика',
		short: 'Формат практического задания',
		icon: ClipboardCheck,
	},
	{
		id: 'check',
		title: 'Проверка',
		short: 'Как проверять ответ',
		icon: ShieldCheck,
	},
	{
		id: 'confirm',
		title: 'Подтверждение',
		short: 'Финальная проверка перед созданием',
		icon: ListChecks,
	},
]

const AGE_GROUP_OPTIONS: Array<{
	value: AgeGroup
	label: string
	hint: string
}> = [
	{ value: 'junior', label: 'Junior', hint: 'Для новичков и первых шагов.' },
	{ value: 'middle', label: 'Middle', hint: 'Для тех, кто уже знает базу.' },
	{
		value: 'senior',
		label: 'Senior',
		hint: 'Для опытных учеников и углубления.',
	},
]

const LESSON_FORMAT_OPTIONS: Array<{
	value: LessonFormat
	label: string
	description: string
}> = [
	{
		value: 'guided',
		label: 'Пошаговый разбор',
		description:
			'Подходит для новой темы: короткое объяснение, пример и безопасный вход в материал.',
	},
	{
		value: 'skills',
		label: 'Тренировка навыка',
		description:
			'Акцент на повторяемый прием, несколько опорных шагов и закрепление через практику.',
	},
	{
		value: 'project',
		label: 'Мини-проект',
		description:
			'Урок ведет к ощутимому результату: истории, игре, странице или небольшому инструменту.',
	},
	{
		value: 'revision',
		label: 'Повторение и закрепление',
		description:
			'Помогает быстро повторить главное перед проверкой и снять типовые ошибки.',
	},
]

const PRACTICE_OPTIONS: Array<{
	value: PracticeFormat
	label: string
	description: string
}> = [
	{
		value: 'none',
		label: 'Без встроенной практики',
		description:
			'Только теория и разбор. Практику можно назначить позже отдельным заданием.',
	},
	{
		value: 'text',
		label: 'Текстовое задание',
		description:
			'Подходит для объяснений, коротких ответов, рассуждений и мини-упражнений.',
	},
	{
		value: 'code',
		label: 'Кодовая практика',
		description:
			'Подходит для задач с редактором, стартовым кодом и автотестами.',
	},
]

const CHECK_OPTIONS: Array<{
	value: CheckMode
	label: string
	description: string
}> = [
	{
		value: 'manual',
		label: 'Ручная проверка',
		description:
			'Учитель сам читает ответ, оставляет комментарий и подтверждает результат.',
	},
	{
		value: 'keywords',
		label: 'Проверка по ключевым словам',
		description:
			'Система ищет ориентиры в ответе и помогает быстро проверить теоретические задания.',
	},
	{
		value: 'tests',
		label: 'Автопроверка тестами',
		description:
			'Для кода или формализованных ответов: есть входные данные и ожидаемый результат.',
	},
]

const METHODICAL_SECTIONS = [
	{
		title: 'Основа урока',
		description:
			'Определяет тему, аудиторию, длительность и минимальный результат для прохождения.',
		example:
			'Хорошо: «Переменные и условия», Junior, 45 минут, понятное описание результата урока.',
	},
	{
		title: 'Формат урока',
		description:
			'Помогает выбрать способ подачи: пошаговый разбор, тренировка навыка, мини-проект или повторение.',
		example:
			'Если тема новая и сложная, лучше начать с пошагового разбора и мягкого темпа.',
	},
	{
		title: 'Содержание',
		description:
			'Здесь собирается объяснение, ключевые идеи и последовательность прохождения урока.',
		example:
			'Сначала короткий жизненный пример, затем разбор по шагам и мини-итог после каждого блока.',
	},
	{
		title: 'Практика',
		description:
			'Позволяет добавить упражнение сразу в урок или вынести практику в следующее действие.',
		example:
			'Для Junior лучше короткое текстовое задание, для Senior можно предложить кодовую задачу.',
	},
	{
		title: 'Проверка',
		description:
			'Определяет, как будет проверяться ответ: вручную, по ключевым словам или тестами.',
		example:
			'Если нужен точный результат в коде, используйте автотесты. Для объяснений подходит ручная проверка.',
	},
]

const INITIAL_STATE: WizardState = {
	title: '',
	ageGroup: 'junior',
	duration: '45',
	summary: '',
	passingScore: '70',
	lessonFormat: 'guided',
	formatNote: '',
	theoryText: '',
	keyPoints: '',
	interactiveSteps: '',
	practiceFormat: 'text',
	taskTitle: '',
	taskPrompt: '',
	taskHints: '',
	checkMode: 'manual',
	answerKeywords: '',
	programmingLanguage: 'Python',
	starterCode: '',
	timeLimitMs: '2000',
	memoryLimitMb: '128',
	judgeTests: [{ input: '', expected: '' }],
}

function parseLines(value: string) {
	return value
		.split('\n')
		.map(item => item.trim())
		.filter(Boolean)
}

function foundationComplete(form: WizardState) {
	return Boolean(
		form.title.trim() &&
		form.duration.trim() &&
		form.summary.trim() &&
		form.passingScore.trim(),
	)
}

function formatComplete(form: WizardState) {
	return Boolean(form.lessonFormat)
}

function contentComplete(form: WizardState) {
	return Boolean(
		form.theoryText.trim() &&
		parseLines(form.keyPoints).length >= 2 &&
		parseLines(form.interactiveSteps).length >= 2,
	)
}

function practiceComplete(form: WizardState) {
	if (form.practiceFormat === 'none') return true
	if (!form.taskTitle.trim() || !form.taskPrompt.trim()) return false
	if (form.practiceFormat === 'text') return true
	return Boolean(form.programmingLanguage && form.starterCode.trim())
}

function checkComplete(form: WizardState) {
	if (form.practiceFormat === 'none') return true
	if (form.practiceFormat === 'code' && form.checkMode !== 'tests') return false
	if (form.checkMode === 'manual') return true
	if (form.checkMode === 'keywords') return Boolean(form.answerKeywords.trim())
	return form.judgeTests.some(
		testCase => testCase.input.trim() || testCase.expected.trim(),
	)
}

function stepComplete(stepId: string, form: WizardState) {
	switch (stepId) {
		case 'foundation':
			return foundationComplete(form)
		case 'format':
			return formatComplete(form)
		case 'content':
			return contentComplete(form)
		case 'practice':
			return practiceComplete(form)
		case 'check':
			return checkComplete(form)
		case 'confirm':
			return (
				foundationComplete(form) &&
				formatComplete(form) &&
				contentComplete(form) &&
				practiceComplete(form) &&
				checkComplete(form)
			)
		default:
			return false
	}
}

function nextButtonLabel(stepIndex: number) {
	return stepIndex === WIZARD_STEPS.length - 1 ? 'Создать урок' : 'Далее'
}

function ensureDraftShape(
	value: unknown,
): value is {
	form: WizardState
	stepIndex: number
	selectedClassId?: number | null
} {
	if (!value || typeof value !== 'object') return false
	const draft = value as {
		form?: WizardState
		stepIndex?: number
		selectedClassId?: number | null
	}
	return Boolean(draft.form) && typeof draft.stepIndex === 'number'
}

function createEmptyTest(): JudgeTestCase {
	return { input: '', expected: '' }
}

function MobileDisclosure({
	title,
	children,
	defaultOpen = false,
}: Readonly<{
	title: string
	children: React.ReactNode
	defaultOpen?: boolean
}>) {
	return (
		<details
			open={defaultOpen}
			className='group rounded-[24px] border border-slate-200 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.06)] xl:hidden'
		>
			<summary className='flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-slate-900'>
				{title}
				<ChevronRight className='h-4 w-4 text-slate-400 transition group-open:rotate-90' />
			</summary>
			<div className='border-t border-slate-100 px-5 py-4'>{children}</div>
		</details>
	)
}

function SidebarCard({
	title,
	children,
	className,
}: Readonly<{ title: string; children: React.ReactNode; className?: string }>) {
	return (
		<section
			className={clsx(
				'rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.06)]',
				className,
			)}
		>
			<h3 className='text-lg font-semibold text-slate-900'>{title}</h3>
			<div className='mt-4'>{children}</div>
		</section>
	)
}

function LabelBlock({
	label,
	required = false,
	extra,
}: Readonly<{ label: string; required?: boolean; extra?: React.ReactNode }>) {
	return (
		<div className='flex flex-wrap items-center gap-2'>
			<label className='text-sm font-semibold text-slate-900'>{label}</label>
			<span
				className={clsx(
					'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold',
					required ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500',
				)}
			>
				{required ? 'Обязательное' : 'Дополнительно'}
			</span>
			{extra}
		</div>
	)
}

export function LessonCreationWizard({
	initialClasses,
	initialClassId = null,
	sourceLessonId = null,
}: Readonly<LessonCreationWizardProps>) {
	const [form, setForm] = useState<WizardState>(INITIAL_STATE)
	const [currentStep, setCurrentStep] = useState(0)
	const [showPassingHint, setShowPassingHint] = useState(true)
	const [helpOpen, setHelpOpen] = useState(false)
	const [notice, setNotice] = useState<NoticeState | null>(null)
	const [themeMode, setThemeMode] = useState<AppTheme>('light')
	const [previewTouched, setPreviewTouched] = useState({
		ageGroup: false,
		duration: false,
	})
	const [selectedClassId, setSelectedClassId] = useState<number | null>(
		initialClassId ?? initialClasses[0]?.id ?? null,
	)
	const [catalog, setCatalog] = useState<LessonCatalogItem[]>([])
	const [catalogLoading, setCatalogLoading] = useState(false)
	const [creatingLesson, setCreatingLesson] = useState(false)
	const [lastCreatedLesson, setLastCreatedLesson] =
		useState<CreatedLessonState | null>(null)
	const [sourceLessonApplied, setSourceLessonApplied] = useState(false)

	useEffect(() => {
		const root = document.documentElement
		const syncTheme = () => {
			setThemeMode(root.dataset.theme === 'dark' ? 'dark' : 'light')
		}

		syncTheme()

		try {
			const rawDraft = window.localStorage.getItem(DRAFT_KEY)
			if (!rawDraft) return
			const parsed = JSON.parse(rawDraft) as unknown
			if (!ensureDraftShape(parsed)) return
			setForm({ ...INITIAL_STATE, ...parsed.form })
			setCurrentStep(
				Math.min(Math.max(parsed.stepIndex, 0), WIZARD_STEPS.length - 1),
			)
			if (typeof parsed.selectedClassId === 'number') {
				setSelectedClassId(parsed.selectedClassId)
			}
			setNotice({
				tone: 'info',
				text: 'Черновик восстановлен. Можно продолжить с того же шага.',
			})
		} catch {
			window.localStorage.removeItem(DRAFT_KEY)
		}

		const observer = new MutationObserver(syncTheme)
		observer.observe(root, {
			attributes: true,
			attributeFilter: ['data-theme'],
		})

		return () => {
			observer.disconnect()
		}
	}, [])

	useEffect(() => {
		if (!selectedClassId) {
			setCatalog([])
			return
		}

		let cancelled = false
		setCatalogLoading(true)

		api<{ lessons: LessonCatalogItem[] }>(
			`/teacher/lesson-catalog?classroom_id=${selectedClassId}`,
			undefined,
			'required',
		)
			.then(result => {
				if (!cancelled) {
					setCatalog(result.lessons)
				}
			})
			.catch(() => {
				if (!cancelled) {
					setCatalog([])
					setNotice({
						tone: 'info',
						text: 'Не удалось загрузить библиотеку уроков выбранного класса.',
					})
				}
			})
			.finally(() => {
				if (!cancelled) {
					setCatalogLoading(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [selectedClassId])

	useEffect(() => {
		if (!sourceLessonId || sourceLessonApplied || catalogLoading) return
		const sourceLesson = catalog.find(lesson => lesson.id === sourceLessonId)
		if (!sourceLesson) return

		setForm(current => ({
			...current,
			title: sourceLesson.title,
			summary: sourceLesson.summary,
			ageGroup: sourceLesson.module_age_group,
			duration: String(sourceLesson.duration_minutes),
			passingScore: String(sourceLesson.passing_score),
			programmingLanguage:
				sourceLesson.module_age_group === 'senior' ? 'JavaScript' : 'Python',
		}))
		setPreviewTouched({ ageGroup: true, duration: true })
		setSourceLessonApplied(true)
		setNotice({
			tone: 'info',
			text: `Черновик заполнен на основе урока «${sourceLesson.title}».`,
		})
	}, [catalog, catalogLoading, sourceLessonApplied, sourceLessonId])

	useEffect(() => {
		if (form.ageGroup === 'junior' && form.practiceFormat === 'code') {
			setForm(current => ({
				...current,
				practiceFormat: 'text',
			}))
		}
	}, [form.ageGroup, form.practiceFormat])

	useEffect(() => {
		if (form.practiceFormat === 'none') {
			setForm(current =>
				current.checkMode === 'manual'
					? current
					: {
							...current,
							checkMode: 'manual',
						},
			)
			return
		}

		if (form.practiceFormat === 'text' && form.checkMode === 'tests') {
			setForm(current => ({
				...current,
				checkMode: 'manual',
			}))
			return
		}

		if (form.practiceFormat === 'code' && form.checkMode !== 'tests') {
			setForm(current => ({
				...current,
				checkMode: 'tests',
			}))
		}
	}, [form.practiceFormat, form.checkMode])

	const previewTitle = form.title.trim() || 'Без названия'
	const previewAudience =
		currentStep === 0 && !previewTouched.ageGroup
			? 'Не указано'
			: AGE_GROUP_OPTIONS.find(item => item.value === form.ageGroup)?.label ||
				'Не указано'
	const previewDuration =
		currentStep === 0 && !previewTouched.duration
			? 'Не задано'
			: form.duration.trim()
				? `${form.duration.trim()} мин`
				: 'Не задано'
	const previewSummary = form.summary.trim() || 'Описание пока не добавлено'
	const completedSteps = WIZARD_STEPS.filter(step =>
		stepComplete(step.id, form),
	).length
	const progressPercent = Math.round(
		(completedSteps / WIZARD_STEPS.length) * 100,
	)
	const currentStepItem = WIZARD_STEPS[currentStep]
	const selectedClass =
		initialClasses.find(item => item.id === selectedClassId) || null

	function updateForm<K extends keyof WizardState>(
		field: K,
		value: WizardState[K],
	) {
		setForm(current => ({
			...current,
			[field]: value,
		}))
	}

	function saveDraft() {
		window.localStorage.setItem(
			DRAFT_KEY,
			JSON.stringify({ form, stepIndex: currentStep, selectedClassId }),
		)
		setNotice({
			tone: 'success',
			text: 'Черновик сохранен на этом устройстве. Можно вернуться к нему позже.',
		})
	}

	function toggleTheme() {
		const nextTheme: AppTheme = themeMode === 'light' ? 'dark' : 'light'
		setTheme(nextTheme)
		setThemeMode(nextTheme)
	}

	function goNext() {
		if (!stepComplete(currentStepItem.id, form)) {
			setNotice({
				tone: 'info',
				text: 'Заполните обязательные поля текущего шага, чтобы перейти дальше.',
			})
			return
		}

		if (currentStep === WIZARD_STEPS.length - 1) {
			void handleCreateLesson()
			return
		}

		setCurrentStep(step => Math.min(step + 1, WIZARD_STEPS.length - 1))
		setNotice(null)
	}

	function goBack() {
		setCurrentStep(step => Math.max(step - 1, 0))
		setNotice(null)
	}

	function updateJudgeTest(
		index: number,
		field: keyof JudgeTestCase,
		value: string,
	) {
		setForm(current => ({
			...current,
			judgeTests: current.judgeTests.map((testCase, testIndex) =>
				testIndex === index ? { ...testCase, [field]: value } : testCase,
			),
		}))
	}

	function addJudgeTest() {
		setForm(current => ({
			...current,
			judgeTests: [...current.judgeTests, createEmptyTest()],
		}))
	}

	function removeJudgeTest(index: number) {
		setForm(current => ({
			...current,
			judgeTests: current.judgeTests.filter(
				(_, testIndex) => testIndex !== index,
			),
		}))
	}

	async function handleCreateLesson() {
		if (!selectedClassId) {
			setNotice({
				tone: 'info',
				text: 'Выберите класс, в котором нужно сохранить урок.',
			})
			return
		}
		if (!stepComplete('confirm', form)) {
			setNotice({
				tone: 'info',
				text: 'Перед созданием урока заполните обязательные поля предыдущих шагов.',
			})
			return
		}
		if (form.ageGroup === 'junior' && form.practiceFormat === 'code') {
			setNotice({
				tone: 'info',
				text: 'Для Junior-уроков кодовая практика недоступна. Выберите текстовое задание.',
			})
			return
		}
		if (
			form.practiceFormat === 'text' &&
			hasExplicitCodeTaskIntent({
				title: form.taskTitle,
				prompt: form.taskPrompt,
				starterCode: form.starterCode,
			})
		) {
			setNotice({
				tone: 'info',
				text: 'Похоже, это кодовая практика. Переключите формат практики на кодовую и добавьте автотесты.',
			})
			return
		}

		const judgeTestsPayload =
			form.checkMode === 'tests'
				? form.judgeTests
						.filter(item => item.input.trim() || item.expected.trim())
						.map((item, index) => ({
							label: `Тест ${index + 1}`,
							input: item.input,
							expected: item.expected,
						}))
				: []

		if (form.practiceFormat === 'code' && judgeTestsPayload.length === 0) {
			setNotice({
				tone: 'info',
				text: 'Для кодовой практики нужен хотя бы один автотест.',
			})
			return
		}

		try {
			setCreatingLesson(true)
			const data = await api<{ lesson: CreatedLessonState }>(
				`/teacher/classes/${selectedClassId}/lessons`,
				{
					method: 'POST',
					body: JSON.stringify({
						title: form.title,
						summary: form.summary,
						age_group: form.ageGroup,
						duration_minutes: Number(form.duration),
						passing_score: Number(form.passingScore),
						theory_text: form.theoryText,
						key_points: form.keyPoints,
						interactive_steps: form.interactiveSteps,
						task_type: form.practiceFormat === 'code' ? 'code' : 'text',
						task_title:
							form.practiceFormat === 'none'
								? ''
								: form.taskTitle.trim() || `Практика: ${previewTitle}`,
						task_prompt:
							form.practiceFormat === 'none'
								? ''
								: form.taskPrompt.trim() ||
									'Выполни практическое задание по этому уроку.',
						answer_keywords:
							form.practiceFormat !== 'none' && form.checkMode === 'keywords'
								? form.answerKeywords
								: '',
						starter_code:
							form.practiceFormat === 'code' ? form.starterCode : '',
						task_hints: form.practiceFormat === 'none' ? '' : form.taskHints,
						evaluation_mode:
							form.practiceFormat === 'none'
								? 'manual'
								: form.checkMode === 'tests'
									? 'stdin_stdout'
									: form.checkMode,
						programming_language:
							form.practiceFormat === 'code'
								? form.programmingLanguage.toLowerCase()
								: null,
						judge_tests: judgeTestsPayload,
						time_limit_ms:
							form.checkMode === 'tests' ? Number(form.timeLimitMs) : null,
						memory_limit_mb:
							form.checkMode === 'tests' ? Number(form.memoryLimitMb) : null,
					}),
				},
				'required',
			)

			setLastCreatedLesson(data.lesson)
			setNotice({
				tone: 'success',
				text: 'Авторский урок создан. Его уже можно открыть и при необходимости позже назначить классу.',
			})
			window.localStorage.removeItem(DRAFT_KEY)
		} catch (error) {
			setNotice({
				tone: 'info',
				text:
					error instanceof Error ? error.message : 'Не удалось создать урок.',
			})
		} finally {
			setCreatingLesson(false)
		}
	}

	function renderFoundationStep() {
		return (
			<div className='space-y-6'>
				<header className='space-y-2'>
					<h2 className='text-[clamp(1.6rem,3vw,2rem)] font-bold text-slate-900'>
						Шаг 1. Основная информация
					</h2>
					<p className='max-w-3xl text-sm leading-6 text-slate-600 md:text-base'>
						Сначала задайте базовые параметры урока.
					</p>
				</header>

				<div className='grid gap-5'>
					<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
						<LabelBlock label='Название урока' required />
						<input
							className='mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
							placeholder='Например: Переменные и условия'
							value={form.title}
							onChange={event => updateForm('title', event.target.value)}
						/>
					</div>

					<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
						<LabelBlock label='Для кого урок' required />
						<div className='mt-3 grid gap-3 sm:grid-cols-3'>
							{AGE_GROUP_OPTIONS.map(option => (
								<button
									key={option.value}
									type='button'
									className={clsx(
										'rounded-2xl border px-4 py-3 text-left transition',
										form.ageGroup === option.value
											? 'border-sky-600 bg-sky-600 text-white shadow-[0_14px_30px_rgba(2,132,199,0.25)]'
											: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
									)}
									onClick={() => {
										setPreviewTouched(current => ({
											...current,
											ageGroup: true,
										}))
										updateForm('ageGroup', option.value)
									}}
								>
									<div className='flex items-center justify-between gap-3'>
										<span className='text-base font-semibold'>
											{option.label}
										</span>
										{form.ageGroup === option.value ? (
											<Check className='h-4 w-4' />
										) : null}
									</div>
									<p
										className={clsx(
											'mt-2 text-sm leading-5',
											form.ageGroup === option.value
												? 'text-sky-50/90'
												: 'text-slate-500',
										)}
									>
										{option.hint}
									</p>
								</button>
							))}
						</div>
					</div>

					<div className='grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]'>
						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock
								label='Длительность урока'
								required
								extra={<CircleHelp className='h-4 w-4 text-slate-400' />}
							/>
							<div className='mt-3 flex items-center gap-3'>
								<input
									className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
									value={form.duration}
									onChange={event => {
										setPreviewTouched(current => ({
											...current,
											duration: true,
										}))
										updateForm(
											'duration',
											event.target.value.replace(/[^\d]/g, ''),
										)
									}}
								/>
								<span className='rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-500'>
									мин
								</span>
							</div>
						</div>

						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock label='Краткое описание' required />
							<textarea
								className='mt-3 min-h-[124px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
								placeholder='В 1–2 предложениях: что ученик поймет или чему научится.'
								value={form.summary}
								onChange={event => updateForm('summary', event.target.value)}
							/>
							<p className='mt-2 text-sm text-slate-500'>
								Лучше писать простым языком: какой результат ученик заметит
								после урока.
							</p>
						</div>
					</div>

					<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
						<LabelBlock
							label='Минимальный результат для прохождения'
							required
						/>
						<div className='mt-3 flex flex-wrap items-center gap-3'>
							<div className='inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3'>
								<input
									className='w-14 border-none bg-transparent text-base font-semibold text-slate-900 outline-none'
									value={form.passingScore}
									onChange={event =>
										updateForm(
											'passingScore',
											event.target.value.replace(/[^\d]/g, ''),
										)
									}
								/>
								<span className='text-base font-semibold text-slate-500'>
									%
								</span>
							</div>
							{!showPassingHint ? (
								<button
									type='button'
									className='inline-flex items-center gap-2 text-sm font-medium text-sky-700'
									onClick={() => setShowPassingHint(true)}
								>
									<CircleHelp className='h-4 w-4' />
									Что это значит?
								</button>
							) : null}
						</div>

						{showPassingHint ? (
							<div className='mt-4 rounded-[24px] border border-sky-100 bg-white p-5 shadow-[0_16px_40px_rgba(2,132,199,0.1)]'>
								<h3 className='text-lg font-semibold text-slate-900'>
									Что значит порог успешного прохождения?
								</h3>
								<p className='mt-3 text-sm leading-7 text-slate-600 md:text-base'>
									Порог успешного прохождения — это минимальный процент, который
									ученик должен набрать для успешного завершения урока.
									Например, если указано 70%, значит ученик должен набрать 70%
									или более, чтобы урок считался пройденным.
								</p>
								<div className='mt-4 flex justify-end'>
									<button
										type='button'
										className='inline-flex min-h-11 items-center justify-center rounded-full bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700'
										onClick={() => setShowPassingHint(false)}
									>
										Понял, закрыть
									</button>
								</div>
							</div>
						) : null}
					</div>
				</div>
			</div>
		)
	}

	function renderFormatStep() {
		return (
			<div className='space-y-6'>
				<header className='space-y-2'>
					<h2 className='text-[clamp(1.45rem,3vw,1.85rem)] font-bold text-slate-900'>
						Шаг 2. Формат урока
					</h2>
					<p className='max-w-3xl text-sm leading-6 text-slate-600 md:text-base'>
						Выберите, как именно будет идти урок: через разбор, тренировку
						навыка, мини-проект или повторение.
					</p>
				</header>

				<div className='grid gap-4 lg:grid-cols-2'>
					{LESSON_FORMAT_OPTIONS.map(option => (
						<button
							key={option.value}
							type='button'
							className={clsx(
								'rounded-[24px] border p-5 text-left transition',
								form.lessonFormat === option.value
									? 'border-sky-600 bg-white shadow-[0_20px_45px_rgba(2,132,199,0.12)]'
									: 'border-slate-200 bg-slate-50/70 hover:border-slate-300',
							)}
							onClick={() => updateForm('lessonFormat', option.value)}
						>
							<div className='flex items-start justify-between gap-3'>
								<h3 className='text-lg font-semibold text-slate-900'>
									{option.label}
								</h3>
								{form.lessonFormat === option.value ? (
									<span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white'>
										<Check className='h-4 w-4' />
									</span>
								) : null}
							</div>
							<p className='mt-3 text-sm leading-6 text-slate-600'>
								{option.description}
							</p>
						</button>
					))}
				</div>

				<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
					<LabelBlock label='Методическая пометка' />
					<textarea
						className='mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
						placeholder='Например: сначала жизненный пример, затем объяснение и короткая практика в конце.'
						value={form.formatNote}
						onChange={event => updateForm('formatNote', event.target.value)}
					/>
				</div>
			</div>
		)
	}

	function renderContentStep() {
		return (
			<div className='space-y-6'>
				<header className='space-y-2'>
					<h2 className='text-[clamp(1.45rem,3vw,1.85rem)] font-bold text-slate-900'>
						Шаг 3. Содержание
					</h2>
					<p className='max-w-3xl text-sm leading-6 text-slate-600 md:text-base'>
						Добавьте объяснение, ключевые идеи и маршрут прохождения урока,
						чтобы ученик понимал логику движения.
					</p>
				</header>

				<div className='space-y-5'>
					<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
						<LabelBlock label='Объяснение темы' required />
						<textarea
							className='mt-3 min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
							placeholder='Объясните тему простым языком: от примера к правилу и затем к выводу.'
							value={form.theoryText}
							onChange={event => updateForm('theoryText', event.target.value)}
						/>
					</div>

					<div className='grid gap-5 lg:grid-cols-2'>
						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock label='Ключевые идеи' required />
							<textarea
								className='mt-3 min-h-[170px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
								placeholder={
									'Каждая идея с новой строки.\nНапример:\nЧто такое переменная\nКак работает условие\nКакая ошибка встречается чаще всего'
								}
								value={form.keyPoints}
								onChange={event => updateForm('keyPoints', event.target.value)}
							/>
						</div>

						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock label='Маршрут урока' required />
							<textarea
								className='mt-3 min-h-[170px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
								placeholder={
									'Каждый шаг с новой строки.\nНапример:\nПоказать пример\nРазобрать условие\nДать мини-вопрос\nПодвести итог'
								}
								value={form.interactiveSteps}
								onChange={event =>
									updateForm('interactiveSteps', event.target.value)
								}
							/>
						</div>
					</div>
				</div>
			</div>
		)
	}

	function renderPracticeStep() {
		return (
			<div className='space-y-6'>
				<header className='space-y-2'>
					<h2 className='text-[clamp(1.45rem,3vw,1.85rem)] font-bold text-slate-900'>
						Шаг 4. Практика
					</h2>
					<p className='max-w-3xl text-sm leading-6 text-slate-600 md:text-base'>
						Решите, нужна ли встроенная практика, и выберите формат
						практического задания без лишнего перегруза.
					</p>
				</header>

				<div className='grid gap-4 lg:grid-cols-3'>
					{PRACTICE_OPTIONS.map(option => (
						<button
							key={option.value}
							type='button'
							disabled={option.value === 'code' && form.ageGroup === 'junior'}
							className={clsx(
								'rounded-[24px] border p-5 text-left transition',
								option.value === 'code' &&
									form.ageGroup === 'junior' &&
									'cursor-not-allowed opacity-55',
								form.practiceFormat === option.value
									? 'border-sky-600 bg-white shadow-[0_20px_45px_rgba(2,132,199,0.12)]'
									: 'border-slate-200 bg-slate-50/70 hover:border-slate-300',
							)}
							onClick={() => updateForm('practiceFormat', option.value)}
						>
							<div className='flex items-start justify-between gap-3'>
								<h3 className='text-lg font-semibold text-slate-900'>
									{option.label}
								</h3>
								{form.practiceFormat === option.value ? (
									<span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white'>
										<Check className='h-4 w-4' />
									</span>
								) : null}
							</div>
							<p className='mt-3 text-sm leading-6 text-slate-600'>
								{option.description}
							</p>
							{option.value === 'code' && form.ageGroup === 'junior' ? (
								<p className='mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>
									Для Junior недоступно
								</p>
							) : null}
						</button>
					))}
				</div>

				{form.practiceFormat === 'none' ? (
					<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-600'>
						Практика не добавлена в сам урок. После создания урок можно будет
						отдельно назначить классу и выдать задание позже.
					</div>
				) : (
					<div className='space-y-5'>
						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock label='Название практики' required />
							<input
								className='mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
								placeholder='Например: Мини-практика по условиям'
								value={form.taskTitle}
								onChange={event => updateForm('taskTitle', event.target.value)}
							/>
						</div>

						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock label='Формулировка задания' required />
							<textarea
								className='mt-3 min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
								placeholder='Опишите, что именно должен сделать ученик и какой результат ожидается.'
								value={form.taskPrompt}
								onChange={event => updateForm('taskPrompt', event.target.value)}
							/>
						</div>

						<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
							<LabelBlock label='Подсказки для ученика' />
							<textarea
								className='mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
								placeholder={
									'Каждая подсказка с новой строки.\nНапример:\nСначала выдели условие\nПроверь результат на простом примере'
								}
								value={form.taskHints}
								onChange={event => updateForm('taskHints', event.target.value)}
							/>
						</div>

						{form.practiceFormat === 'code' ? (
							<div className='grid gap-5 lg:grid-cols-[minmax(0,0.48fr)_minmax(0,1fr)]'>
								<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
									<LabelBlock label='Язык задания' required />
									<div className='mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1'>
										{(['Python', 'JavaScript'] as const).map(language => (
											<button
												key={language}
												type='button'
												className={clsx(
													'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
													form.programmingLanguage === language
														? 'border-sky-600 bg-sky-600 text-white'
														: 'border-slate-200 bg-white text-slate-700',
												)}
												onClick={() =>
													updateForm('programmingLanguage', language)
												}
											>
												{language}
											</button>
										))}
									</div>
								</div>

								<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
									<LabelBlock label='Стартовый код' required />
									<textarea
										className='mt-3 min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 font-mono text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
										placeholder={'def solve():\n    pass'}
										value={form.starterCode}
										onChange={event =>
											updateForm('starterCode', event.target.value)
										}
									/>
								</div>
							</div>
						) : null}
					</div>
				)}
			</div>
		)
	}

	function renderCheckStep() {
		return (
			<div className='space-y-6'>
				<header className='space-y-2'>
					<h2 className='text-[clamp(1.45rem,3vw,1.85rem)] font-bold text-slate-900'>
						Шаг 5. Проверка
					</h2>
					<p className='max-w-3xl text-sm leading-6 text-slate-600 md:text-base'>
						Выберите, как проверять ответ: вручную, по ключевым словам или
						автотестами.
					</p>
				</header>

				{form.practiceFormat === 'none' ? (
					<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-600'>
						Встроенная практика не выбрана, поэтому отдельная проверка на этом
						шаге не требуется.
					</div>
				) : (
					<>
						<div className='grid gap-4 lg:grid-cols-3'>
							{CHECK_OPTIONS.filter(option =>
								form.practiceFormat === 'code'
									? option.value === 'tests'
									: option.value !== 'tests',
							).map(option => (
								<button
									key={option.value}
									type='button'
									className={clsx(
										'rounded-[24px] border p-5 text-left transition',
										form.checkMode === option.value
											? 'border-sky-600 bg-white shadow-[0_20px_45px_rgba(2,132,199,0.12)]'
											: 'border-slate-200 bg-slate-50/70 hover:border-slate-300',
									)}
									onClick={() => updateForm('checkMode', option.value)}
								>
									<div className='flex items-start justify-between gap-3'>
										<h3 className='text-lg font-semibold text-slate-900'>
											{option.label}
										</h3>
										{form.checkMode === option.value ? (
											<span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-white'>
												<Check className='h-4 w-4' />
											</span>
										) : null}
									</div>
									<p className='mt-3 text-sm leading-6 text-slate-600'>
										{option.description}
									</p>
								</button>
							))}
						</div>

						{form.checkMode === 'manual' ? (
							<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 text-sm leading-7 text-slate-600'>
								Это самый безопасный режим для открытых ответов и рассуждений.
								Ученик завершает урок, а итог подтверждает учитель.
							</div>
						) : null}

						{form.checkMode === 'keywords' ? (
							<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
								<LabelBlock label='Ключевые слова для автопроверки' required />
								<textarea
									className='mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
									placeholder='Например: переменная, условие, ветвление'
									value={form.answerKeywords}
									onChange={event =>
										updateForm('answerKeywords', event.target.value)
									}
								/>
							</div>
						) : null}

						{form.checkMode === 'tests' ? (
							<div className='space-y-4'>
								<div className='grid gap-5 lg:grid-cols-[minmax(0,0.34fr)_minmax(0,0.34fr)_minmax(0,0.32fr)]'>
									<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
										<LabelBlock label='Тайм-лимит' required />
										<div className='mt-3 flex items-center gap-3'>
											<input
												className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
												value={form.timeLimitMs}
												onChange={event =>
													updateForm(
														'timeLimitMs',
														event.target.value.replace(/[^\d]/g, ''),
													)
												}
											/>
											<span className='rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-500'>
												мс
											</span>
										</div>
									</div>

									<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
										<LabelBlock label='Память' required />
										<div className='mt-3 flex items-center gap-3'>
											<input
												className='w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
												value={form.memoryLimitMb}
												onChange={event =>
													updateForm(
														'memoryLimitMb',
														event.target.value.replace(/[^\d]/g, ''),
													)
												}
											/>
											<span className='rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-500'>
												MB
											</span>
										</div>
									</div>

									<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'>
										<LabelBlock label='Рекомендация' />
										<p className='mt-3 text-sm leading-6 text-slate-600'>
											Для первого релиза урока достаточно 2–3 тестов: базовый,
											граничный и один на типичную ошибку.
										</p>
									</div>
								</div>

								{form.judgeTests.map((testCase, index) => (
									<div
										key={`test-${index}`}
										className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5'
									>
										<div className='flex items-center justify-between gap-3'>
											<h3 className='text-base font-semibold text-slate-900'>
												Тест {index + 1}
											</h3>
											{form.judgeTests.length > 1 ? (
												<button
													type='button'
													className='inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600'
													onClick={() => removeJudgeTest(index)}
												>
													Удалить
												</button>
											) : null}
										</div>
										<div className='mt-4 grid gap-4 lg:grid-cols-2'>
											<div>
												<LabelBlock label='Входные данные' required />
												<textarea
													className='mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
													value={testCase.input}
													onChange={event =>
														updateJudgeTest(index, 'input', event.target.value)
													}
												/>
											</div>
											<div>
												<LabelBlock label='Ожидаемый результат' required />
												<textarea
													className='mt-3 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
													value={testCase.expected}
													onChange={event =>
														updateJudgeTest(
															index,
															'expected',
															event.target.value,
														)
													}
												/>
											</div>
										</div>
									</div>
								))}

								<button
									type='button'
									className='inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700'
									onClick={addJudgeTest}
								>
									Добавить тест
								</button>
							</div>
						) : null}
					</>
				)}
			</div>
		)
	}

	function renderConfirmStep() {
		return (
			<div className='space-y-6'>
				<header className='space-y-2'>
					<h2 className='text-[clamp(1.45rem,3vw,1.85rem)] font-bold text-slate-900'>
						Шаг 6. Подтверждение
					</h2>
					<p className='max-w-3xl text-sm leading-6 text-slate-600 md:text-base'>
						Проверьте собранную структуру урока перед публикацией. Назначить
						урок классу можно позже, это вынесено из этого сценария.
					</p>
				</header>

				<div className='grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]'>
					<div className='rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.06)]'>
						<h3 className='text-lg font-semibold text-slate-900'>
							Что войдет в урок
						</h3>
						<div className='mt-5 grid gap-4 md:grid-cols-2'>
							<div className='rounded-[22px] border border-slate-200 bg-slate-50/70 p-4'>
								<p className='text-sm font-medium text-slate-500'>Основа</p>
								<p className='mt-2 text-base font-semibold text-slate-900'>
									{previewTitle}
								</p>
								<p className='mt-1 text-sm text-slate-600'>
									Для: {previewAudience}
								</p>
								<p className='mt-1 text-sm text-slate-600'>
									Время: {previewDuration}
								</p>
							</div>
							<div className='rounded-[22px] border border-slate-200 bg-slate-50/70 p-4'>
								<p className='text-sm font-medium text-slate-500'>
									Формат урока
								</p>
								<p className='mt-2 text-base font-semibold text-slate-900'>
									{
										LESSON_FORMAT_OPTIONS.find(
											option => option.value === form.lessonFormat,
										)?.label
									}
								</p>
								<p className='mt-1 text-sm text-slate-600'>
									{form.formatNote.trim() ||
										'Дополнительная методическая заметка не добавлена.'}
								</p>
							</div>
							<div className='rounded-[22px] border border-slate-200 bg-slate-50/70 p-4'>
								<p className='text-sm font-medium text-slate-500'>Практика</p>
								<p className='mt-2 text-base font-semibold text-slate-900'>
									{
										PRACTICE_OPTIONS.find(
											option => option.value === form.practiceFormat,
										)?.label
									}
								</p>
								<p className='mt-1 text-sm text-slate-600'>
									{form.practiceFormat === 'none'
										? 'Практика вынесена из урока.'
										: form.taskTitle || 'Название практики пока не добавлено'}
								</p>
							</div>
							<div className='rounded-[22px] border border-slate-200 bg-slate-50/70 p-4'>
								<p className='text-sm font-medium text-slate-500'>Проверка</p>
								<p className='mt-2 text-base font-semibold text-slate-900'>
									{form.practiceFormat === 'none'
										? 'Не требуется'
										: CHECK_OPTIONS.find(
												option => option.value === form.checkMode,
											)?.label}
								</p>
								<p className='mt-1 text-sm text-slate-600'>
									{form.checkMode === 'keywords'
										? `Ключевые слова: ${form.answerKeywords || 'не добавлены'}`
										: form.checkMode === 'tests'
											? `Тестов добавлено: ${form.judgeTests.length}`
											: 'Учитель подтверждает результат вручную.'}
								</p>
							</div>
						</div>
					</div>

					<div className='rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.06)]'>
						<h3 className='text-lg font-semibold text-slate-900'>
							Финальный checklist
						</h3>
						<ul className='mt-5 space-y-3'>
							{[
								foundationComplete(form)
									? 'Основные параметры заполнены и понятны ученику.'
									: 'Проверьте название, описание и порог прохождения.',
								formatComplete(form)
									? 'Выбран понятный формат урока.'
									: 'Выберите формат урока.',
								contentComplete(form)
									? 'Есть теория, ключевые идеи и шаги прохождения.'
									: 'Добавьте содержание урока.',
								practiceComplete(form)
									? 'Практика настроена без перегруза.'
									: 'Проверьте формат практики.',
								checkComplete(form)
									? 'Сценарий проверки согласован с форматом задания.'
									: 'Уточните, как проверять ответ.',
							].map(item => (
								<li
									key={item}
									className='flex items-start gap-3 rounded-[22px] border border-slate-200 bg-slate-50/70 px-4 py-3'
								>
									<CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-600' />
									<span className='text-sm leading-6 text-slate-700'>
										{item}
									</span>
								</li>
							))}
						</ul>
						<div className='mt-5 rounded-[22px] border border-sky-100 bg-sky-50/70 px-4 py-4 text-sm leading-6 text-slate-700'>
							После создания урок можно будет позже назначить классу. Создание
							класса, список учеников и проверка работ не смешиваются с этим
							сценарием.
						</div>
					</div>
				</div>
			</div>
		)
	}

	function renderStepBody() {
		switch (currentStepItem.id) {
			case 'foundation':
				return renderFoundationStep()
			case 'format':
				return renderFormatStep()
			case 'content':
				return renderContentStep()
			case 'practice':
				return renderPracticeStep()
			case 'check':
				return renderCheckStep()
			case 'confirm':
				return renderConfirmStep()
			default:
				return null
		}
	}

	return (
		<main>
			<div className='page-shell mx-auto max-w-7xl pb-32 md:pb-36'>
				<section className='rounded-[32px] border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8'>
					<div className='flex flex-col gap-6'>
						<div className='flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between'>
							<div className='space-y-4'>
								<nav className='flex flex-wrap items-center gap-2 text-sm text-slate-500'>
									<Link
										href='/teacher'
										className='transition hover:text-slate-900'
									>
										Кабинет учителя
									</Link>
									<ChevronRight className='h-4 w-4' />
									<span>Уроки</span>
									<ChevronRight className='h-4 w-4' />
									<span className='font-semibold text-slate-900'>
										Создание урока
									</span>
								</nav>
								<div className='max-w-3xl space-y-3'>
									<div className='inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600'>
										<LayoutTemplate className='h-4 w-4 text-sky-600' />
										Шаг {currentStep + 1} из {WIZARD_STEPS.length}
									</div>
									<h1 className='text-[clamp(2rem,4.8vw,3.4rem)] font-black tracking-[-0.04em] text-slate-900'>
										Создание урока
									</h1>
									<p className='max-w-2xl text-base leading-7 text-slate-600 md:text-lg'>
										Соберите урок по шагам: тема, содержание, практика, проверка
										и публикация.
									</p>
								</div>
								<div className='max-w-xl'>
									<div className='flex items-center justify-between text-sm text-slate-500'>
										<span>Прогресс заполнения</span>
										<span>{progressPercent}%</span>
									</div>
									<div className='mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100'>
										<div
											className='h-full rounded-full bg-sky-600 transition-all'
											style={{ width: `${progressPercent}%` }}
										/>
									</div>
								</div>
							</div>

							<div className='flex flex-wrap items-center gap-3 xl:max-w-[27rem] xl:justify-end'>
								<button
									type='button'
									className='inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
									onClick={toggleTheme}
								>
									{themeMode === 'light' ? (
										<MoonStar className='h-4 w-4' />
									) : (
										<SunMedium className='h-4 w-4' />
									)}
									{themeMode === 'light' ? 'Темная тема' : 'Светлая тема'}
								</button>
								<button
									type='button'
									className='inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
									onClick={saveDraft}
								>
									<Save className='h-4 w-4' />
									Сохранить черновик
								</button>
								<button
									type='button'
									className='inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700'
									onClick={() => setHelpOpen(true)}
								>
									<BookOpen className='h-4 w-4' />
									Методическая помощь
								</button>
								<Link
									href='/teacher'
									className='inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300'
								>
									Отменить
								</Link>
							</div>
						</div>

						{notice ? (
							<div
								className={clsx(
									'flex items-start gap-3 rounded-[24px] border px-4 py-4 text-sm leading-6',
									notice.tone === 'success'
										? 'border-emerald-200 bg-white text-slate-700'
										: 'border-slate-200 bg-slate-50/70 text-slate-700',
								)}
							>
								{notice.tone === 'success' ? (
									<CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-600' />
								) : (
									<CircleHelp className='mt-0.5 h-5 w-5 shrink-0 text-sky-600' />
								)}
								<p>{notice.text}</p>
							</div>
						) : null}

						<div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]'>
							<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4'>
								<p className='text-sm font-semibold text-slate-900'>
									Куда сохранить урок
								</p>
							</div>
							<div className='rounded-[24px] border border-slate-200 bg-white/90 p-4'>
								<label className='text-sm font-semibold text-slate-900'>
									Класс для сохранения
								</label>
								<select
									className='mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'
									value={selectedClassId ?? ''}
									onChange={event =>
										setSelectedClassId(
											event.target.value ? Number(event.target.value) : null,
										)
									}
								>
									{initialClasses.length === 0 ? (
										<option value=''>Нет доступных классов</option>
									) : null}
									{initialClasses.map(item => (
										<option key={item.id} value={item.id}>
											{item.name}
										</option>
									))}
								</select>
								<p className='mt-2 text-xs leading-5 text-slate-500'>
									{selectedClass
										? `Урок будет создан в библиотеке класса «${selectedClass.name}».`
										: 'Сначала создайте или выберите класс в кабинете учителя.'}
								</p>
							</div>
						</div>

						{lastCreatedLesson ? (
							<div className='flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-emerald-200 bg-white px-4 py-4'>
								<div>
									<p className='text-sm font-semibold text-emerald-700'>
										Последний созданный урок
									</p>
									<p className='mt-1 text-lg font-bold text-slate-900'>
										{lastCreatedLesson.title}
									</p>
									<p className='mt-1 text-sm leading-6 text-slate-600'>
										{lastCreatedLesson.summary}
									</p>
								</div>
								<Link
									href={`/lessons/${lastCreatedLesson.id}`}
									className='inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white'
								>
									Открыть урок
								</Link>
							</div>
						) : null}
					</div>
				</section>

				<section className='mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_20rem]'>
					<div className='rounded-[32px] border border-white/70 bg-white/85 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6 lg:p-8'>
						<div className='mb-6 flex flex-wrap gap-2 md:hidden'>
							{WIZARD_STEPS.map((step, index) => (
								<button
									key={step.id}
									type='button'
									className={clsx(
										'rounded-full border px-3 py-2 text-xs font-semibold transition',
										currentStep === index
											? 'border-sky-600 bg-sky-600 text-white'
											: stepComplete(step.id, form)
												? 'border-emerald-200 bg-white text-slate-700'
												: 'border-slate-200 bg-white text-slate-500',
									)}
									onClick={() => setCurrentStep(index)}
								>
									{index + 1}. {step.title}
								</button>
							))}
						</div>

						{renderStepBody()}
					</div>

					<aside className='hidden space-y-5 xl:block'>
						<SidebarCard title='Этапы урока' className='sticky top-24'>
							<ul className='space-y-2'>
								{WIZARD_STEPS.map((step, index) => {
									const StepIcon = step.icon
									const active = currentStep === index
									const done = stepComplete(step.id, form)
									return (
										<li key={step.id}>
											<button
												type='button'
												className={clsx(
													'flex w-full items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition',
													active
														? 'border-sky-600 bg-sky-50/70'
														: 'border-slate-200 bg-white hover:border-slate-300',
												)}
												onClick={() => setCurrentStep(index)}
											>
												<span
													className={clsx(
														'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
														active
															? 'bg-sky-600 text-white'
															: done
																? 'bg-emerald-100 text-emerald-700'
																: 'bg-slate-100 text-slate-500',
													)}
												>
													{done && !active ? (
														<Check className='h-4 w-4' />
													) : (
														<StepIcon className='h-4 w-4' />
													)}
												</span>
												<span className='min-w-0 flex-1'>
													<span className='block text-sm font-semibold text-slate-900'>
														{step.title}
													</span>
													<span className='mt-0.5 block text-xs leading-5 text-slate-500'>
														{step.short}
													</span>
												</span>
											</button>
										</li>
									)
								})}
							</ul>
						</SidebarCard>

						<SidebarCard title='Предпросмотр урока'>
							<div className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-4'>
								<p className='text-xl font-bold text-slate-900'>
									{previewTitle}
								</p>
								<div className='mt-4 space-y-2 text-sm leading-6 text-slate-600'>
									<p>
										<span className='font-semibold text-slate-900'>Для:</span>{' '}
										{previewAudience}
									</p>
									<p>
										<span className='font-semibold text-slate-900'>Время:</span>{' '}
										{previewDuration}
									</p>
									<p>
										<span className='font-semibold text-slate-900'>
											Описание:
										</span>{' '}
										{previewSummary}
									</p>
								</div>
							</div>
						</SidebarCard>

						<SidebarCard title='Совет по шагу 1'>
							<p className='text-sm leading-7 text-slate-600'>
								Задайте уровень:
								<br />
								Junior — для новичков,
								<br />
								Middle — для тех, кто имеет базу,
								<br />
								Senior — для опытных учеников.
							</p>
						</SidebarCard>
					</aside>
				</section>

				<div className='mt-6 space-y-4 xl:hidden'>
					<MobileDisclosure title='Этапы урока' defaultOpen>
						<ul className='space-y-2'>
							{WIZARD_STEPS.map((step, index) => (
								<li key={`mobile-${step.id}`}>
									<button
										type='button'
										className={clsx(
											'flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left transition',
											currentStep === index
												? 'border-sky-600 bg-sky-50/70'
												: 'border-slate-200 bg-white',
										)}
										onClick={() => setCurrentStep(index)}
									>
										<span className='text-sm font-semibold text-slate-900'>
											{index + 1}. {step.title}
										</span>
										<span className='text-xs text-slate-500'>{step.short}</span>
									</button>
								</li>
							))}
						</ul>
					</MobileDisclosure>

					<MobileDisclosure title='Предпросмотр урока'>
						<div className='rounded-[20px] border border-slate-200 bg-slate-50/70 p-4'>
							<p className='text-lg font-bold text-slate-900'>{previewTitle}</p>
							<div className='mt-3 space-y-2 text-sm leading-6 text-slate-600'>
								<p>
									<span className='font-semibold text-slate-900'>Для:</span>{' '}
									{previewAudience}
								</p>
								<p>
									<span className='font-semibold text-slate-900'>Время:</span>{' '}
									{previewDuration}
								</p>
								<p>
									<span className='font-semibold text-slate-900'>
										Описание:
									</span>{' '}
									{previewSummary}
								</p>
							</div>
						</div>
					</MobileDisclosure>

					<MobileDisclosure title='Совет по шагу 1'>
						<p className='text-sm leading-7 text-slate-600'>
							Задайте уровень:
							<br />
							Junior — для новичков,
							<br />
							Middle — для тех, кто имеет базу,
							<br />
							Senior — для опытных учеников.
						</p>
					</MobileDisclosure>
				</div>
			</div>

			<div className='fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/95 px-4 pb-[calc(max(env(safe-area-inset-bottom),0.75rem))] pt-3 shadow-[0_-16px_40px_rgba(15,23,42,0.08)] backdrop-blur'>
				<div className='mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div className='flex items-center gap-3 text-sm text-slate-500'>
						<span className='inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sky-600'>
							{currentStepItem.id === 'practice' ? (
								<ClipboardCheck className='h-5 w-5' />
							) : currentStepItem.id === 'check' ? (
								<ShieldCheck className='h-5 w-5' />
							) : currentStepItem.id === 'confirm' ? (
								<Eye className='h-5 w-5' />
							) : currentStepItem.id === 'content' ? (
								<BookOpen className='h-5 w-5' />
							) : currentStepItem.id === 'format' ? (
								<Sparkles className='h-5 w-5' />
							) : (
								<Clock3 className='h-5 w-5' />
							)}
						</span>
						<div>
							<p className='font-semibold text-slate-900'>
								{currentStepItem.title}
							</p>
							<p>{currentStepItem.short}</p>
						</div>
					</div>

					<div className='grid grid-cols-2 gap-3 sm:flex sm:items-center'>
						<button
							type='button'
							className='inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition disabled:cursor-not-allowed disabled:opacity-40'
							onClick={goBack}
							disabled={currentStep === 0}
						>
							<ArrowLeft className='h-4 w-4' />
							Назад
						</button>
						<button
							type='button'
							className='inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50'
							onClick={goNext}
							disabled={creatingLesson}
						>
							{creatingLesson ? 'Создаем урок…' : nextButtonLabel(currentStep)}
							<ArrowRight className='h-4 w-4' />
						</button>
					</div>
				</div>
			</div>

			{helpOpen ? (
				<div className='fixed inset-0 z-50'>
					<button
						type='button'
						className='absolute inset-0 bg-slate-900/45'
						aria-label='Закрыть методическую помощь'
						onClick={() => setHelpOpen(false)}
					/>
					<div className='absolute inset-x-0 bottom-0 top-16 overflow-hidden rounded-t-[28px] border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.2)] md:inset-y-0 md:right-0 md:left-auto md:w-[32rem] md:rounded-none md:rounded-l-[32px]'>
						<div className='flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6'>
							<div>
								<p className='text-sm font-semibold uppercase tracking-[0.18em] text-sky-700'>
									Методическая помощь
								</p>
								<h2 className='mt-1 text-xl font-bold text-slate-900'>
									Как заполнять урок по шагам
								</h2>
							</div>
							<button
								type='button'
								className='inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600'
								onClick={() => setHelpOpen(false)}
							>
								<X className='h-5 w-5' />
							</button>
						</div>

						<div className='h-full overflow-y-auto px-5 py-5 pb-24 sm:px-6'>
							<div className='space-y-4'>
								{METHODICAL_SECTIONS.map(section => (
									<section
										key={section.title}
										className='rounded-[24px] border border-slate-200 bg-slate-50/70 p-5'
									>
										<h3 className='text-lg font-semibold text-slate-900'>
											{section.title}
										</h3>
										<p className='mt-3 text-sm leading-7 text-slate-600'>
											{section.description}
										</p>
										<div className='mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-700'>
											<span className='font-semibold text-slate-900'>
												Пример хорошего заполнения:
											</span>
											<br />
											{section.example}
										</div>
									</section>
								))}
							</div>
						</div>
					</div>
				</div>
			) : null}
		</main>
	)
}
