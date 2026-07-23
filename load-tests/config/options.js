import { THRESHOLDS, PROFILES } from './thresholds.js'

const PROFILE = __ENV.PROFILE || 'average'

export const options = {
  scenarios: {
    [PROFILE]: {
      executor: 'ramping-vus',
      ...PROFILES[PROFILE],
    },
  },
  thresholds: THRESHOLDS,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
}
