import React from 'react'

import type { SelectProps } from '@radix-ui/react-select'
import type { Currency } from '@/types/utils'
import { cn } from '@/lib/utils'

// shadcn
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import CURRENCIES from '@/lib/constants/currencies'

// types

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

// Переменная-заглушка со списком валют

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
      currencies = 'all',
      variant = 'default',
      valid = true,
      className = '',
      ...props
    },
    ref,
  ) => {
    const [selectedCurrency, setSelectedCurrency] =
      React.useState<Currency | null>(null)

    // Используем заглушку напрямую
    const uniqueCurrencies = CURRENCIES

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
                  <span className="text-sm text-text-main  text-center w-6 shrink-0">
                    {currency?.symbol}
                  </span>
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
