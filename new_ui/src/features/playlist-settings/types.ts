export interface PlatformCapabilities {
  contentSettings: boolean
  chatRoles: boolean
  donationRules: boolean
  labelKey: string
  icon: any
}

// Record<Platform, X> is exhaustive by construction — TypeScript refuses to compile
// if a new Platform enum value is added without an entry here. That's the guardrail:
// forgetting to declare capabilities for a new platform becomes a compile error, not a silent gap.
