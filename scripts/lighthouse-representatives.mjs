import process from 'node:process';

export const lighthouseRepresentativeEnvironment = {
  competitionId: 'LIGHTHOUSE_COMPETITION_ID',
  seasonId: 'LIGHTHOUSE_SEASON_ID',
  fixtureId: 'LIGHTHOUSE_FIXTURE_ID',
  statisticId: 'LIGHTHOUSE_STATISTIC_ID',
  competitorId: 'LIGHTHOUSE_COMPETITOR_ID',
  participantId: 'LIGHTHOUSE_PARTICIPANT_ID',
  datasetReleaseVersion: 'LIGHTHOUSE_DATASET_RELEASE_VERSION',
  submissionBatchReference: 'LIGHTHOUSE_SUBMISSION_BATCH_ID',
  reviewBatchReference: 'LIGHTHOUSE_REVIEW_BATCH_ID',
  apiConsumerId: 'LIGHTHOUSE_API_CONSUMER_ID',
};

const publicCollections = {
  competitionId: '/competitions?limit=1',
  seasonId: '/seasons?limit=1',
  fixtureId: '/fixtures?limit=1',
  competitorId: '/competitors?limit=1',
  participantId: '/participants?limit=1',
  datasetReleaseVersion: '/dataset-releases',
};

function firstIdentifier(body, property = 'id') {
  const record = Array.isArray(body?.data) ? body.data[0] : null;
  const value = record?.[property];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

export async function resolveLighthouseRepresentatives({
  apiBaseUrl = process.env.LIGHTHOUSE_API_BASE_URL ?? process.env.VITE_API_BASE_URL,
  environment = process.env,
  fetchImpl = fetch,
} = {}) {
  const representatives = Object.fromEntries(
    Object.entries(lighthouseRepresentativeEnvironment).map(([key, variable]) => [
      key,
      environment[variable] || null,
    ]),
  );
  if (!apiBaseUrl) return representatives;

  await Promise.all(
    Object.entries(publicCollections).map(async ([key, endpoint]) => {
      if (representatives[key]) return;
      try {
        const response = await fetchImpl(new URL(endpoint, apiBaseUrl), {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const body = await response.json();
        representatives[key] = firstIdentifier(body, key === 'datasetReleaseVersion' ? 'version' : 'id');
      } catch {
        // Preflight reports unresolved data without concealing why route audit is skipped.
      }
    }),
  );

  if (representatives.fixtureId && !representatives.statisticId) {
    try {
      const response = await fetchImpl(
        new URL(`/fixtures/${encodeURIComponent(representatives.fixtureId)}/statistics`, apiBaseUrl),
        { headers: { Accept: 'application/json' } },
      );
      if (response.ok) {
        const body = await response.json();
        representatives.statisticId = firstIdentifier(body?.data?.statistics ? { data: body.data.statistics } : body);
      }
    } catch {
      // The fixture remains useful for its non-statistic detail routes.
    }
  }
  return representatives;
}

export function resolveLighthouseRoutePath(route, representatives) {
  const replacements = {
    ':competitionId': representatives.competitionId,
    ':seasonId': representatives.seasonId,
    ':fixtureId': representatives.fixtureId,
    ':statisticId': representatives.statisticId,
    ':competitorId': representatives.competitorId,
    ':participantId': representatives.participantId,
    ':version': representatives.datasetReleaseVersion,
    ':batchReference': route.role === 'admin'
      ? representatives.reviewBatchReference
      : representatives.submissionBatchReference,
    ':consumerId': representatives.apiConsumerId,
  };
  let path = route.path;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (!path.includes(placeholder)) continue;
    if (!value) return null;
    path = path.replaceAll(placeholder, encodeURIComponent(value));
  }
  if (path === '/participants/compare') {
    const { fixtureId, participantId } = representatives;
    if (!fixtureId || !participantId) return null;
    const parameters = new URLSearchParams({ fixtureId, playerA: participantId, playerB: participantId });
    return `${path}?${parameters}`;
  }
  if (path === '/account/:section') return '/account/overview';
  return path;
}

export function lighthouseRepresentativePreflight(representatives) {
  return Object.entries(lighthouseRepresentativeEnvironment).map(([key, variable]) => ({
    representative: key,
    source: representatives[key] ? (process.env[variable] ? 'override' : 'discovered') : 'missing',
  }));
}
