const desktopSettings = {
  formFactor: 'desktop',
  throttling: {
    rttMs: 40,
    throughputKbps: 10_240,
    requestLatencyMs: 0,
    downloadThroughputKbps: 0,
    uploadThroughputKbps: 0,
    cpuSlowdownMultiplier: 1,
  },
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
  emulatedUserAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
};

const mobileSettings = {
  formFactor: 'mobile',
  throttling: {
    rttMs: 150,
    throughputKbps: 1638.4,
    requestLatencyMs: 562.5,
    downloadThroughputKbps: 1474.56,
    uploadThroughputKbps: 675,
    cpuSlowdownMultiplier: 4,
  },
  screenEmulation: {
    mobile: true,
    width: 412,
    height: 823,
    deviceScaleFactor: 1.75,
    disabled: false,
  },
  emulatedUserAgent:
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
};

export const lighthouseProfiles = [
  { name: 'desktop', settings: desktopSettings },
  { name: 'mobile', settings: mobileSettings },
];

export function selectLighthouseProfiles(selection) {
  if (!selection) return lighthouseProfiles;
  const names = new Set(
    selection
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  );
  const profiles = lighthouseProfiles.filter((profile) => names.has(profile.name));
  if (profiles.length !== names.size)
    throw new Error('LIGHTHOUSE_PROFILES must name desktop and/or mobile.');
  return profiles;
}
