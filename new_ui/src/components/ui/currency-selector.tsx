import React from 'react'

import { currencies as AllCurrencies } from 'country-data-list'
import type { SelectProps } from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

// data

// shadcn
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// radix-ui

// constants
import { allCurrencies, customCurrencies } from '@/lib/constants/currencies'

// types
export interface Currency {
  code: string
  decimals: number
  name: string
  number: string
  symbol?: string
}

interface CurrencySelectProps extends Omit<SelectProps, 'onValueChange'> {
  onValueChange?: (value: string) => void
  onCurrencySelect?: (currency: Currency) => void
  name: string
  placeholder?: string
  currencies?: 'custom' | 'all'
  variant?: 'default' | 'small'
  valid?: boolean
  className?: string
}

// Кэш для каждого типа валют
const currenciesCache = new Map<string, Array<Currency>>()

const getUniqueCurrencies = (type: string): Array<Currency> => {
  if (currenciesCache.has(type)) {
    return currenciesCache.get(type)!
  }

  const currencyMap = new Map<string, Currency>()

  AllCurrencies.all.forEach((currency: Currency) => {
    if (currency.code && currency.name && currency.symbol) {
      let shouldInclude = false

      switch (type) {
        case 'custom':
          shouldInclude = customCurrencies.includes(currency.code)
          break
        case 'all':
          shouldInclude = !allCurrencies.includes(currency.code)
          break
        default:
          shouldInclude = !allCurrencies.includes(currency.code)
      }

      if (shouldInclude) {
        // Special handling for Euro
        if (currency.code === 'EUR') {
          currencyMap.set(currency.code, {
            code: currency.code,
            name: 'Euro',
            symbol: currency.symbol,
            decimals: currency.decimals,
            number: currency.number,
          })
        } else {
          currencyMap.set(currency.code, {
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol,
            decimals: currency.decimals,
            number: currency.number,
          })
        }
      }
    }
  })

  const result = Array.from(currencyMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  currenciesCache.set(type, result)
  return result
}

const CurrencySelectComponent = React.forwardRef<
  HTMLButtonElement,
  CurrencySelectProps
>(
  (
    {
      value,
      onValueChange,
      onCurrencySelect,
      name,
      placeholder = 'Select currency',
      currencies = 'withdrawal',
      variant = 'default',
      valid = true,
      className = '',
      ...props
    },
    ref,
  ) => {
    const [selectedCurrency, setSelectedCurrency] =
      React.useState<Currency | null>(null)

    const uniqueCurrencies = getUniqueCurrencies(currencies)

    const handleValueChange = (newValue: string) => {
      const fullCurrencyData = uniqueCurrencies.find(
        (curr) => curr.code === newValue,
      )
      if (fullCurrencyData) {
        setSelectedCurrency(fullCurrencyData)
        if (onValueChange) {
          onValueChange(newValue)
        }
        if (onCurrencySelect) {
          onCurrencySelect(fullCurrencyData)
        }
      }
    }

    void selectedCurrency

    return (
      <Select
        value={value}
        onValueChange={handleValueChange}
        {...props}
        name={name}
        data-valid={valid}
      >
        <SelectTrigger
          className={cn(
            'w-full',
            variant === 'small' && 'w-fit gap-2',
            'border-0 bg-level-2 active:ring-1 rounded-md',
            !valid && 'ring-destructive',
            className,
          )}
          data-valid={valid}
          ref={ref}
        >
          {value && variant === 'small' ? (
            <SelectValue placeholder={placeholder}>
              <span>{value}</span>
            </SelectValue>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent className="bg-level-2 border-0">
          <SelectGroup className="">
            {uniqueCurrencies.map((currency) => (
              <SelectItem
                key={currency?.code}
                value={currency?.code || ''}
                className=" focus:bg-level-3"
              >
                <div className="flex items-center w-full gap-2">
                  <span className="text-sm text-text-main w-8 text-left">
                    {currency?.code}
                  </span>
                  <span className="hidden">{currency?.symbol}</span>
                  <span className="text-sm text-text-main">
                    {currency?.name}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  },
)

CurrencySelectComponent.displayName = 'CurrencySelect'

const CurrencySelect = React.memo(CurrencySelectComponent)

export { CurrencySelect }
