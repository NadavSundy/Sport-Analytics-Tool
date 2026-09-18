import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicShell } from './components/PublicShell';
import { HomePage } from './features/home/HomePage';
import {
  CompetitionDetailPage,
  CompetitionsPage,
  CompetitorDetailPage,
  CompetitorsPage,
  FixtureDetailPage,
  FixturesPage,
  NotFoundPage,
  ParticipantDetailPage,
  ParticipantsPage,
  SeasonDetailPage,
  SeasonsPage,
} from './pages/PublicBrowsePages';
import {
  AccountPage,
  AuthenticationCallbackPage,
  AuthenticationPage,
} from './features/auth/AuthPages';
import { SubmissionPage } from './features/submissions/SubmissionPage';
import { BatchReportsPage } from './features/submissions/BatchReportsPage';
import {
  FixtureStatisticDetailPage,
  FixtureStatisticsPage,
} from './features/statistics/StatisticsPages';
import { AdminUsersPage } from './features/admin/AdminUsersPage';
import { BatchReviewWorkspacePage } from './features/reviews/BatchReviewWorkspacePage';
import {
  DatasetReleaseCataloguePage,
  DatasetReleaseDetailPage,
} from './features/dataset-releases/DatasetReleasePages';
import { AdminDatasetReleasePage } from './features/dataset-releases/AdminDatasetReleasePage';

const ApiExplorerPage = lazy(() =>
  import('./features/api-explorer/ApiExplorerPage').then(({ ApiExplorerPage }) => ({
    default: ApiExplorerPage,
  })),
);

export function PublicApp() {
  return (
    <PublicShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/api"
          element={
            <Suspense
              fallback={
                <div className="content-boundary api-explorer-route-loading" role="status">
                  Loading API Explorer…
                </div>
              }
            >
              <ApiExplorerPage />
            </Suspense>
          }
        />

        <Route path="/competitions" element={<CompetitionsPage />} />
        <Route path="/competitions/:competitionId" element={<CompetitionDetailPage />} />

        <Route path="/seasons" element={<SeasonsPage />} />
        <Route path="/seasons/:seasonId" element={<SeasonDetailPage />} />

        <Route path="/fixtures" element={<FixturesPage />} />
        <Route path="/fixtures/:fixtureId" element={<FixtureDetailPage />} />
        <Route path="/fixtures/:fixtureId/statistics" element={<FixtureStatisticsPage />} />
        <Route
          path="/fixtures/:fixtureId/statistics/:statisticId"
          element={<FixtureStatisticDetailPage />}
        />

        <Route path="/competitors" element={<CompetitorsPage />} />
        <Route path="/competitors/:competitorId" element={<CompetitorDetailPage />} />

        <Route path="/participants" element={<ParticipantsPage />} />
        <Route path="/participants/:participantId" element={<ParticipantDetailPage />} />

        <Route path="/dataset-releases" element={<DatasetReleaseCataloguePage />} />
        <Route path="/dataset-releases/:version" element={<DatasetReleaseDetailPage />} />

        <Route path="/sign-in" element={<AuthenticationPage />} />
        <Route path="/auth/callback" element={<AuthenticationCallbackPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/submissions/new" element={<SubmissionPage />} />
        <Route
          path="/submissions/batches/new"
          element={<Navigate to="/submissions/new" replace />}
        />
        <Route path="/submissions/batches" element={<BatchReportsPage />} />
        <Route path="/submissions/batches/:batchReference" element={<BatchReportsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/dataset-releases/new" element={<AdminDatasetReleasePage />} />
        <Route path="/reviews/batches" element={<BatchReviewWorkspacePage />} />
        <Route path="/reviews/batches/:batchReference" element={<BatchReviewWorkspacePage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </PublicShell>
  );
}

function App() {
  return <PublicApp />;
}

export default App;
