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
  competitionId: { endpoint: '/competitions?limit=1', property: 'competitionId' },
  seasonId: { endpoint: '/seasons?limit=1', property: 'seasonId' },
  fixtureId: { endpoint: '/fixtures?limit=1', property: 'fixtureId' },
  competitorId: { endpoint: '/competitors?limit=1', property: 'competitorId' },
  participantId: { endpoint: '/participants?limit=1', property: 'participantId' },
  datasetReleaseVersion: { endpoint: '/dataset-releases', property: 'version' },
};

function firstIdentifier(body, property = 'id') {
  const record = Array.isArray(body?.data) ? body.data[0] : null;
  const value = record?.[property];
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null;
}

function apiUrl(endpoint, apiBaseUrl) {
  return new URL(endpoint.replace(/^\//, ''), `${apiBaseUrl.replace(/\/$/, '')}/`);
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
    Object.entries(publicCollections).map(async ([key, { endpoint, property }]) => {
      if (representatives[key]) return;
      try {
        const response = await fetchImpl(apiUrl(endpoint, apiBaseUrl), {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) return;
        const body = await response.json();
        representatives[key] = firstIdentifier(body, property);
      } catch {
        // Preflight reports unresolved data without concealing why route audit is skipped.
      }
    }),
  );

  if (representatives.fixtureId && !representatives.statisticId) {
    try {
      const response = await fetchImpl(
        apiUrl(`/fixtures/${encodeURIComponent(representatives.fixtureId)}/statistics`, apiBaseUrl),
        { headers: { Accept: 'application/json' } },
      );
      if (response.ok) {
        const body = await response.json();
        const statistics = body?.data?.statistics;
        representatives.statisticId = firstIdentifier(
          Array.isArray(statistics) ? { data: statistics } : body,
          'statisticId',
        );
        const participantIds = Array.isArray(statistics)
          ? statistics
              .filter((statistic) => statistic?.scope === 'participant')
              .map((statistic) => statistic.participantId)
              .filter(
                (participantId) =>
                  typeof participantId === 'string' || typeof participantId === 'number',
              )
              .map(String)
          : [];
        representatives.comparisonPlayerAId = participantIds[0] ?? null;
        representatives.comparisonPlayerBId = participantIds[1] ?? null;
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
    ':batchReference':
      route.role === 'admin'
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
    const { fixtureId, comparisonPlayerAId, comparisonPlayerBId } = representatives;
    if (!fixtureId || !comparisonPlayerAId || !comparisonPlayerBId) return null;
    const parameters = new URLSearchParams({
      fixtureId,
      playerA: comparisonPlayerAId,
      playerB: comparisonPlayerBId,
    });
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
