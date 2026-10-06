import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicShell } from './components/PublicShell';
import { HomePage } from './features/home/HomePage';
import { ApiExplorerLoadingIndicator } from './features/api-explorer/ApiExplorerLoadingIndicator';
import { ApiExplorerRouteFrame } from './features/api-explorer/ApiExplorerRouteFrame';
import {
  AccessibilityStatementPage,
  PrivacyNoticePage,
  TermsOfUsePage,
} from './features/policies/PolicyPages';

function lazyNamed<T, K extends keyof T>(load: () => Promise<T>, component: K) {
  return lazy(() => load().then((module) => ({ default: module[component] as ComponentType })));
}

const publicBrowsePages = () => import('./pages/PublicBrowsePages');
const CompetitionDetailPage = lazyNamed(publicBrowsePages, 'CompetitionDetailPage');
const CompetitionsPage = lazyNamed(publicBrowsePages, 'CompetitionsPage');
const CompetitorDetailPage = lazyNamed(publicBrowsePages, 'CompetitorDetailPage');
const CompetitorsPage = lazyNamed(publicBrowsePages, 'CompetitorsPage');
const FixtureDetailPage = lazyNamed(publicBrowsePages, 'FixtureDetailPage');
const FixturePlayersPage = lazyNamed(publicBrowsePages, 'FixturePlayersPage');
const FixturesPage = lazyNamed(publicBrowsePages, 'FixturesPage');
const NotFoundPage = lazyNamed(publicBrowsePages, 'NotFoundPage');
const ParticipantDetailPage = lazyNamed(publicBrowsePages, 'ParticipantDetailPage');
const ParticipantsPage = lazyNamed(publicBrowsePages, 'ParticipantsPage');
const SeasonDetailPage = lazyNamed(publicBrowsePages, 'SeasonDetailPage');
const SeasonsPage = lazyNamed(publicBrowsePages, 'SeasonsPage');

const authPages = () => import('./features/auth/AuthPages');
const AccountPage = lazyNamed(authPages, 'AccountPage');
const AuthenticationCallbackPage = lazyNamed(authPages, 'AuthenticationCallbackPage');
const AuthenticationPage = lazyNamed(authPages, 'AuthenticationPage');

const SubmissionPage = lazyNamed(
  () => import('./features/submissions/SubmissionPage'),
  'SubmissionPage',
);
const BatchReportsPage = lazyNamed(
  () => import('./features/submissions/BatchReportsPage'),
  'BatchReportsPage',
);
const statisticsPages = () => import('./features/statistics/StatisticsPages');
const FixtureStatisticDetailPage = lazyNamed(statisticsPages, 'FixtureStatisticDetailPage');
const FixtureStatisticsPage = lazyNamed(statisticsPages, 'FixtureStatisticsPage');
const PlayerComparisonPage = lazyNamed(
  () => import('./features/statistics/PlayerComparisonPage'),
  'PlayerComparisonPage',
);
const AdminUsersPage = lazyNamed(() => import('./features/admin/AdminUsersPage'), 'AdminUsersPage');
const AdministrationPage = lazyNamed(
  () => import('./features/admin/AdministrationPage'),
  'AdministrationPage',
);
const AdminApiConsumersPage = lazyNamed(
  () => import('./features/admin/AdminApiConsumersPage'),
  'AdminApiConsumersPage',
);
const BatchReviewWorkspacePage = lazyNamed(
  () => import('./features/reviews/BatchReviewWorkspacePage'),
  'BatchReviewWorkspacePage',
);
const datasetReleasePages = () => import('./features/dataset-releases/DatasetReleasePages');
const DatasetReleaseCataloguePage = lazyNamed(datasetReleasePages, 'DatasetReleaseCataloguePage');
const DatasetReleaseDetailPage = lazyNamed(datasetReleasePages, 'DatasetReleaseDetailPage');
const AdminDatasetReleasePage = lazyNamed(
  () => import('./features/dataset-releases/AdminDatasetReleasePage'),
  'AdminDatasetReleasePage',
);

const ApiExplorerContent = lazy(() =>
  import('./features/api-explorer/ApiExplorerPage').then(({ ApiExplorerContent }) => ({
    default: ApiExplorerContent,
  })),
);

export function PublicApp() {
  return (
    <PublicShell>
      <div className="route-content">
        <Suspense
          fallback={
            <div className="content-boundary" role="status" aria-label="Loading page">
              Loading page…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/api"
              element={
                <ApiExplorerRouteFrame>
                  <Suspense
                    fallback={
                      <div className="api-explorer-route-loading" role="status">
                        <ApiExplorerLoadingIndicator label="Loading API Explorer" />
                        Loading API Explorer…
                      </div>
                    }
                  >
                    <ApiExplorerContent />
                  </Suspense>
                </ApiExplorerRouteFrame>
              }
            />

            <Route path="/competitions" element={<CompetitionsPage />} />
            <Route path="/competitions/:competitionId" element={<CompetitionDetailPage />} />

            <Route path="/seasons" element={<SeasonsPage />} />
            <Route path="/seasons/:seasonId" element={<SeasonDetailPage />} />

            <Route path="/fixtures" element={<FixturesPage />} />
            <Route path="/fixtures/:fixtureId" element={<FixtureDetailPage />} />
            <Route path="/fixtures/:fixtureId/players" element={<FixturePlayersPage />} />
            <Route path="/fixtures/:fixtureId/statistics" element={<FixtureStatisticsPage />} />
            <Route
              path="/fixtures/:fixtureId/statistics/:statisticId"
              element={<FixtureStatisticDetailPage />}
            />

            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/competitors/:competitorId" element={<CompetitorDetailPage />} />

            <Route path="/participants" element={<ParticipantsPage />} />
            <Route path="/participants/compare" element={<PlayerComparisonPage />} />
            <Route path="/participants/:participantId" element={<ParticipantDetailPage />} />

            <Route path="/dataset-releases" element={<DatasetReleaseCataloguePage />} />
            <Route path="/dataset-releases/:version" element={<DatasetReleaseDetailPage />} />

            <Route path="/sign-in" element={<AuthenticationPage />} />
            <Route path="/auth/callback" element={<AuthenticationCallbackPage />} />
            <Route path="/account" element={<Navigate to="/account/overview" replace />} />
            <Route path="/account/:section" element={<AccountPage />} />
            <Route path="/submissions/new" element={<SubmissionPage />} />
            <Route
              path="/submissions/batches/new"
              element={<Navigate to="/submissions/new" replace />}
            />
            <Route path="/submissions/batches" element={<BatchReportsPage />} />
            <Route path="/submissions/batches/:batchReference" element={<BatchReportsPage />} />
            <Route path="/admin" element={<AdministrationPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/api-consumers" element={<AdminApiConsumersPage />} />
            <Route path="/admin/api-consumers/:consumerId" element={<AdminApiConsumersPage />} />
            <Route path="/admin/dataset-releases/new" element={<AdminDatasetReleasePage />} />
            <Route path="/reviews/batches" element={<BatchReviewWorkspacePage />} />
            <Route path="/reviews/batches/:batchReference" element={<BatchReviewWorkspacePage />} />
            <Route path="/privacy" element={<PrivacyNoticePage />} />
            <Route path="/terms" element={<TermsOfUsePage />} />
            <Route path="/accessibility" element={<AccessibilityStatementPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
    </PublicShell>
  );
}

function App() {
  return <PublicApp />;
}

export default App;
