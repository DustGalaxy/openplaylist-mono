import React from 'react'
import type { ReadNotification } from '../../types'

interface VariantProps {
  data: ReadNotification['data']
}

export const SystemVariant: React.FC<VariantProps> = ({ data }) => {
  const isError = data.level === 'error'

  return (
    <div className="text-sm leading-normal">
      <div
        className={`font-semibold ${isError ? 'text-rose-400' : 'text-text-main'}`}
      >
        {data.title}
      </div>
      {data.message && (
        <p className="text-xs text-text-placeholder mt-0.5">{data.message}</p>
      )}
    </div>
  )
}
