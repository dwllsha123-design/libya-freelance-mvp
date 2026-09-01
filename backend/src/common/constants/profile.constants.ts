export const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'login',
  'register',
  'dashboard',
  'projects',
  'messages',
  'settings',
  'freelancers',
  'clients',
  'notifications',
  'auth',
  'health',
  'profile',
  'portfolio',
  'about',
  'help',
  'support',
  'terms',
  'privacy',
]);

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export const MAX_FREELANCER_SKILLS = 20;
