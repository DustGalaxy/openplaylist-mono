import React from 'react'
import { PlaceholderWidget } from './PlaceholderWidget'
import type { PlaceholderWidgetProps } from '../types'

export const PlaceholderPage: React.FC<PlaceholderWidgetProps> = (props) => {
  return <PlaceholderWidget asPage {...props} />
}

export default PlaceholderPage
