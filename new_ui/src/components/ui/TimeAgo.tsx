import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'

interface RelativeTimeProps {
  timestamp: number | Date
  lang?: string
  className?: string
}

const locales = {
  ru: ru,
  en: enUS,
}

export const TimeAgo: React.FC<RelativeTimeProps> = ({
  timestamp,
  lang = 'ru',
  className,
}) => {
  // Состояние для принудительного перерендеринга каждую минуту
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const utcString = timestamp.endsWith('Z') ? timestamp : `${timestamp}Z`;
  const date = new Date(utcString);
  
  // Функция из date-fns делает всю работу по склонениям
  const timeAgoText = formatDistanceToNow(date, {
    addSuffix: true,
    locale: locales[lang],
  })

  return <div className={className}>{timeAgoText}</div>
}
