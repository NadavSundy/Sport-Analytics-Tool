// Approved hosted-CI source: Gitea run 19132, commit
// 374044d1d0dbc911c18113eafa6a02bd086c2ab7. Each floor is the verified
// route/profile median less a three-point CI runner-variance allowance. Gitea
// pipeline #838 then established one additional observed shared-runner point
// for /fixtures and /sign-in mobile. These are CI regression floors, not
// production acceptance thresholds.
export const lighthouseCiBaselineFloors = {
  '/': { desktop: 97, mobile: 90 },
  '/api': { desktop: 96, mobile: 89 },
  '/competitions': { desktop: 96, mobile: 87 },
  '/seasons': { desktop: 96, mobile: 86 },
  '/fixtures': { desktop: 96, mobile: 86 },
  '/competitors': { desktop: 96, mobile: 87 },
  '/participants': { desktop: 96, mobile: 87 },
  '/dataset-releases': { desktop: 96, mobile: 88 },
  '/sign-in': { desktop: 96, mobile: 87 },
};
