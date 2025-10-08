const YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365.2425;

function parseDate(value) {
  return value ? new Date(value + 'T00:00:00') : null;
}

function yearsBetween(laterDate, earlierDate) {
  const ms = laterDate.getTime() - earlierDate.getTime();
  return ms / YEAR_IN_MS;
}

function describeStatus(primaryName, partnerName, isOk) {
  return isOk
    ? `${primaryName} & ${partnerName} satisfied the guideline during this period.`
    : `${primaryName} & ${partnerName} did not satisfy the guideline during this period.`;
}

function addYears(date, years) {
  const ms = date.getTime() + years * YEAR_IN_MS;
  return new Date(ms);
}

function computeRelationshipMetrics(primary, partner) {
  const primaryBirth = parseDate(primary.birthdate);
  const partnerBirth = parseDate(partner.birthdate);
  if (!primaryBirth || !partnerBirth) {
    return null;
  }
  const start = parseDate(partner.startDate);
  const end = partner.endDate ? parseDate(partner.endDate) : null;
  if (!start) {
    return null;
  }
  const olderIsPrimary = primaryBirth < partnerBirth;
  const olderBirth = olderIsPrimary ? primaryBirth : partnerBirth;
  const youngerBirth = olderIsPrimary ? partnerBirth : primaryBirth;
  const olderName = olderIsPrimary ? primary.name : partner.name;
  const youngerName = olderIsPrimary ? partner.name : primary.name;
  const startOlderAge = yearsBetween(start, olderBirth);
  const startYoungerAge = yearsBetween(start, youngerBirth);
  const ageGap = yearsBetween(youngerBirth, olderBirth);
  const minYoungAge = Math.max(0, ageGap + 14);
  const thresholdDate = addYears(youngerBirth, minYoungAge);
  const okAtStart = start >= thresholdDate;
  const okAtEnd = !end || end >= thresholdDate;
  const okDuring = okAtStart && okAtEnd;

  return {
    start,
    end,
    olderName,
    youngerName,
    startOlderAge,
    startYoungerAge,
    okAtStart,
    okDuring,
    becomesOkDate: thresholdDate,
    minYoungAge,
    olderBirth,
    youngerBirth,
    ageGap,
    thresholdDate
  };
}

function formatDate(date) {
  if (!date) return '—';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

window.RelationshipUtils = {
  YEAR_IN_MS,
  parseDate,
  yearsBetween,
  computeRelationshipMetrics,
  formatDate,
  describeStatus,
  addYears
};
