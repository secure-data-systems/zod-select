import { execSync } from 'child_process';

const EXCLUDE_BRANCHES = ['master', 'main'];

// Get the current branch name
const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();

// Get all local branches except the current one
const branches = execSync('git branch', { encoding: 'utf8' })
  .split('\n')
  .map(branch => branch.replace('*', '').trim())
  .filter(branch => branch && branch !== currentBranch && (EXCLUDE_BRANCHES.indexOf(branch) < 0));

// Delete each branch
branches.forEach(branch => {
  console.log(`Deleting branch: ${branch}`);
  execSync(`git branch -D ${branch}`, { stdio: 'inherit' });
});

console.log(`All local branches except '${currentBranch}' have been deleted.`);