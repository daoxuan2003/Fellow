export function getPartnerPronoun(gender) {
  if (gender === 'female') return '她'
  if (gender === 'male') return '他'
  return '对方'
}
