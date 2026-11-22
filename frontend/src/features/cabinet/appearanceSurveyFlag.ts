const PREFIX = 'dvarf.appearanceSurvey.v1.'

export type SurveyFlag = 'deferred' | 'done'

export function readSurveyFlag(userId: string): SurveyFlag | null {
  try {
    const value = localStorage.getItem(PREFIX + userId)
    return value === 'deferred' || value === 'done' ? value : null
  } catch {
    return 'done'
  }
}

export function writeSurveyFlag(userId: string, flag: SurveyFlag): void {
  try {
    localStorage.setItem(PREFIX + userId, flag)
  } catch {
    /* private mode */
  }
}
