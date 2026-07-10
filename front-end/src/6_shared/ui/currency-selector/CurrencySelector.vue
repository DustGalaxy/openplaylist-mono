<script setup lang="ts">
import { ref } from 'vue'
import type { SelectRootProps } from 'radix-vue'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/6_shared/ui/select'
import { cn } from '@/6_shared/lib/utils'

// Hardcoding currencies locally to prevent dependency issues, as constants weren't fully migrated
const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' }
]

const props = withDefaults(defineProps<{
  value?: string
  name: string
  placeholder?: string
  currencies?: 'custom' | 'all'
  variant?: 'default' | 'small'
  valid?: boolean
  class?: string
}>(), {
  placeholder: 'Select currency',
  currencies: 'all',
  variant: 'default',
  valid: true
})

const emit = defineEmits<{
  (e: 'update:value', value: string): void
  (e: 'currencySelect', currency: any): void
}>()

const handleValueChange = (newValue: string) => {
  const fullCurrencyData = CURRENCIES.find((curr) => curr.code === newValue)
  if (fullCurrencyData) {
    emit('update:value', newValue)
    emit('currencySelect', fullCurrencyData)
  }
}
</script>

<template>
  <Select :model-value="value" @update:model-value="handleValueChange" :name="name" :data-valid="valid">
    <SelectTrigger
      :class="cn(
        'w-full',
        variant === 'small' && 'w-fit gap-2',
        'border-0 bg-level-2 active:ring-1 rounded-md',
        !valid && 'ring-destructive',
        props.class
      )"
      :data-valid="valid"
    >
      <SelectValue :placeholder="placeholder">
        <template v-if="value && variant === 'small'">
          <span>{{ value }}</span>
        </template>
      </SelectValue>
    </SelectTrigger>
    <SelectContent class="bg-level-2 border-0">
      <SelectGroup>
        <SelectItem
          v-for="currency in CURRENCIES"
          :key="currency.code"
          :value="currency.code"
          class="focus:bg-level-3"
        >
          <div class="flex items-center w-full gap-2">
            <span class="text-sm text-text-main text-center w-6 shrink-0">{{ currency.symbol }}</span>
            <span class="text-sm text-text-main w-8 text-left">{{ currency.code }}</span>
            <span class="text-sm text-text-main">{{ currency.name }}</span>
          </div>
        </SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>