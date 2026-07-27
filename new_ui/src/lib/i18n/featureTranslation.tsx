import React, { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'

const FeatureNsContext = createContext<string | undefined>(undefined)

/** Wrap a feature's root component once with the feature's namespace. */
export function FeatureI18nProvider({
  ns,
  children,
}: {
  ns: string
  children: React.ReactNode
}) {
  return (
    <FeatureNsContext.Provider value={ns}>{children}</FeatureNsContext.Provider>
  )
}

/** Use inside a <FeatureI18nProvider> subtree — no ns string needed at call site. */
export function useFeatureTranslation() {
  const ns = useContext(FeatureNsContext)
  return { ...useTranslation(ns), tc: useTranslation().t } // ns undefined -> defaultNS ('common')
}
