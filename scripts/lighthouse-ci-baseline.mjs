// Approved hosted-CI source: Gitea run 1563, Lighthouse job 3, commit
// 32d05c8cf2c42b6d3fc520da3441464a1df5fe6f. Each floor is the lowest of the
// three observed Performance runs for that route/profile, so the existing
// median gate tolerates the measured CI variance without using production data.
export const lighthouseCiBaselineFloors = {
  '/': { desktop: 100, mobile: 81 },
  '/api': { desktop: 99, mobile: 84 },
  '/competitions': { desktop: 99, mobile: 88 },
  '/seasons': { desktop: 99, mobile: 87 },
  '/fixtures': { desktop: 99, mobile: 88 },
  '/competitors': { desktop: 99, mobile: 89 },
  '/participants': { desktop: 99, mobile: 88 },
  '/dataset-releases': { desktop: 99, mobile: 90 },
  '/sign-in': { desktop: 99, mobile: 90 },
};
