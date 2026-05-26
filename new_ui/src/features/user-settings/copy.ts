/** User-facing strings for /settings — ready for future i18n. */
export const settingsCopy = {
  eyebrow: 'Account',
  title: 'Settings',
  subtitle: 'Manage your account and integrations',
  unauthTitle: 'Settings',
  unauthMessage: 'You need to log in first to manage your account.',
  unauthCta: 'Go to Login',
  tabs: {
    profile: 'Profile',
    account: 'Account',
    integrations: 'Integrations',
  },
  emailNotConfirmedTitle: 'Email is not confirmed',
  emailNotConfirmedBody: (email?: string) =>
    `Confirm ${email ?? 'your email'} to keep classic login and account recovery fully available.`,
} as const
