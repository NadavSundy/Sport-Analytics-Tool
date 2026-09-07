import { execFileSync } from 'node:child_process';

const action = process.argv[2];
const expectedPath = '.githooks';

function git(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (error) {
    if (allowFailure) return '';
    throw error;
  }
}

if (action === 'install') {
  const existing = git(['config', '--local', '--get', 'core.hooksPath'], { allowFailure: true });

  if (existing && existing !== expectedPath) {
    throw new Error(
      `This repository already uses core.hooksPath=${existing}. Remove or integrate that hook configuration before installing the optional Sport Analytics hook.`,
    );
  }

  git(['config', '--local', 'core.hooksPath', expectedPath]);
  console.log('Optional pre-push local CI hook installed for this clone.');
  console.log('Remove it at any time with: npm run hooks:remove');
} else if (action === 'remove') {
  const existing = git(['config', '--local', '--get', 'core.hooksPath'], { allowFailure: true });

  if (!existing) {
    console.log('No local core.hooksPath is configured; nothing to remove.');
  } else if (existing !== expectedPath) {
    throw new Error(
      `Refusing to remove core.hooksPath=${existing} because it is not the Sport Analytics hook path.`,
    );
  } else {
    git(['config', '--local', '--unset', 'core.hooksPath']);
    console.log('Optional pre-push local CI hook removed from this clone.');
  }
} else {
  throw new Error('Usage: node scripts/git-hooks.mjs <install|remove>');
}
