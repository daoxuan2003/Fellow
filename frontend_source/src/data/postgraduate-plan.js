const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function buildProgressTrack(track = {}) {
    const total = Math.max(0, Number(track.total) || 0)
    const current = clamp(Number(track.current) || 0, 0, total)
    const percent = total > 0 ? Math.round((current / total) * 100) : 0
    const remaining = Math.max(0, total - current)
    const complete = total > 0 && current >= total
    const unit = track.unit || ''
    const currentLabel = track.mode === 'position' ? `第 ${current} ${unit}` : `${current} ${unit}`
    const nextLabel = track.mode === 'position' ? `第 ${Math.min(total, current + 1)} ${unit}` : `${Math.min(total, current + 1)} ${unit}`

    let feedback = `已完成 ${current} ${unit} · 还差 ${remaining} ${unit}`
    if (track.mode === 'position') {
        feedback = complete ? `已到达 ${currentLabel}` : `目前 ${currentLabel} · 下一站 ${nextLabel}`
    } else if (complete) {
        feedback = `已完成全部 ${total} ${unit}`
    }

    return {
        ...track,
        current,
        total,
        remaining,
        percent,
        complete,
        feedback,
        ariaText: `${track.label || '学习进度'}，${current} ${unit}，共${total} ${unit}，完成${percent}%`
    }
}

const fixedPlan = {
    phase: '一轮复习',
    sourceLabel: '自主登记',
    subjects: [
        {
            id: 'organic-chemistry',
            tone: 'blue',
            name: '有机化学',
            scope: '一轮复习 · 共 24 章',
            currentSummary: '当前落点：第 6 章 · 第 22 个视频',
            tracks: [
                {
                    id: 'chapters',
                    label: '章节位置',
                    mode: 'position',
                    current: 6,
                    total: 24,
                    unit: '章',
                    quickAmounts: [1, 2, 3]
                },
                {
                    id: 'videos',
                    label: '课程视频',
                    current: 22,
                    total: 75,
                    unit: '个视频',
                    quickAmounts: [1, 3, 5]
                }
            ]
        },
        {
            id: 'math',
            tone: 'orange',
            name: '数学',
            scope: '高等数学 · 共 15 讲',
            currentSummary: '当前落点：高数第 8 讲 · 第 50 个视频',
            tracks: [
                {
                    id: 'lectures',
                    label: '高数讲次',
                    mode: 'position',
                    current: 8,
                    total: 15,
                    unit: '讲',
                    quickAmounts: [1, 2, 3]
                },
                {
                    id: 'videos',
                    label: '数学视频',
                    current: 50,
                    total: 108,
                    unit: '个视频',
                    quickAmounts: [1, 3, 5]
                }
            ],
            pending: {
                label: '线性代数',
                value: '用书待定',
                note: '范围还没有确定，暂不计入数学进度'
            }
        },
        {
            id: 'english',
            tone: 'mint',
            name: '英语',
            scope: '句句真研',
            currentSummary: '句句真研已完成 3 个视频',
            tracks: [
                {
                    id: 'videos',
                    label: '课程视频',
                    current: 3,
                    total: 34,
                    unit: '个视频',
                    quickAmounts: [1, 3, 5]
                }
            ]
        },
        {
            id: 'politics',
            tone: 'pink',
            name: '政治',
            scope: '马原 · 全书共 7 章',
            currentSummary: '马原已学 6 个考点 · 陪学讲解进行中',
            tracks: [
                {
                    id: 'knowledge-points',
                    label: '马原考点',
                    current: 6,
                    total: 95,
                    unit: '个考点',
                    quickAmounts: [1, 5, 10]
                }
            ],
            note: '当前章节没有提供，不按章节估算完成度'
        }
    ]
}

function buildCurrentSummary(subjectId, tracks) {
    const byId = Object.fromEntries(tracks.map(track => [track.id, track]))
    if (subjectId === 'organic-chemistry') {
        return `当前落点：第 ${byId.chapters.current} 章 · 已完成 ${byId.videos.current} 个视频`
    }
    if (subjectId === 'math') {
        return `当前落点：高数第 ${byId.lectures.current} 讲 · 已完成 ${byId.videos.current} 个视频`
    }
    if (subjectId === 'english') return `句句真研已完成 ${byId.videos.current} 个视频`
    if (subjectId === 'politics') return `马原已学 ${byId['knowledge-points'].current} 个考点 · 陪学讲解进行中`
    return ''
}

function findSavedSubject(source, subject) {
    const aliases = subject.id === 'organic-chemistry' ? ['有机化学', '化学'] : [subject.name]
    return (source?.subjects || []).find(item => item?.key === subject.id || aliases.includes(item?.name))
}

export function getPostgraduatePlan(source = {}) {
    const subjects = fixedPlan.subjects.map(subject => {
        const savedSubject = findSavedSubject(source, subject)
        const tracks = subject.tracks.map(track => {
            const savedTrack = (savedSubject?.progressTracks || []).find(item => item?.key === track.id)
            return buildProgressTrack({ ...track, current: savedTrack?.current ?? track.current })
        })
        return {
            ...subject,
            tracks,
            currentSummary: buildCurrentSummary(subject.id, tracks),
            complete: tracks.length > 0 && tracks.every(track => track.complete),
            statusLabel: tracks.length > 0 && tracks.every(track => track.complete) ? '本阶段完成' : '推进中'
        }
    })

    return {
        ...fixedPlan,
        subjects,
        subjectCount: subjects.length,
        trackCount: subjects.reduce((sum, subject) => sum + subject.tracks.length, 0),
        pendingCount: subjects.filter(subject => subject.pending).length
    }
}

export const POSTGRADUATE_HOME_STATUS = `${fixedPlan.phase} · ${fixedPlan.subjects.length} 科推进中`
