const fs = require('fs');
const path = require('path');

const sharedUiDir = path.join(__dirname, 'src', 'shared', 'ui');

const mkdir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createFsdComponent = (name, files) => {
  const dir = path.join(sharedUiDir, name);
  mkdir(dir);
  
  let exports = [];
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content);
    if (filename.endsWith('.vue')) {
      const componentName = filename.replace('.vue', '');
      exports.push(`export { default as ${componentName} } from './${filename}'`);
    } else if (filename !== 'index.ts' && filename.endsWith('.ts')) {
      exports.push(`export * from './${filename.replace('.ts', '')}'`);
    }
  }
  
  if (!files['index.ts']) {
    fs.writeFileSync(path.join(dir, 'index.ts'), exports.join('\n') + '\n');
  }
};

// 6. currency-selector
createFsdComponent('currency-selector', {
  'CurrencySelector.vue': `<script setup lang="ts">
import { ref } from 'vue'
import type { SelectRootProps } from 'radix-vue'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

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
</template>`
});

// 7. date-chip
createFsdComponent('date-chip', {
  'DateChip.vue': `<script setup lang="ts">
import { CalendarIcon } from 'lucide-vue-next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

const props = defineProps<{ date: string }>()

// Fallback logic for i18n
const locale = 'en-US'
const dateObj = new Date(props.date)

const formattedDate = dateObj.toLocaleDateString(locale, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const fullDate = dateObj.toLocaleDateString(locale, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})
</script>

<template>
  <div class="bg-level-2 rounded-[var(--rounded-std)] border-t-[3px] sm:border-t-[5px] border-level-3 h-[28px] sm:h-[32px] md:h-[40px] px-1.5 sm:px-2 md:px-3 shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)] sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)] inline-flex items-center justify-center">
    <div class="text-center flex text-[14px] sm:text-[16px] md:text-[18px] gap-1 sm:gap-1.5 md:gap-2 items-center h-full">
      <CalendarIcon class="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]" />
      <Tooltip>
        <TooltipTrigger>
          <span class="text-text-main pb-1 text-[12px] sm:text-[16px] md:text-[18px]">
            {{ formattedDate }}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ fullDate }}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  </div>
</template>`
});

// 8. dialog
createFsdComponent('dialog', {
  'Dialog.vue': `<script setup lang="ts">
import { DialogRoot, type DialogRootProps, type DialogRootEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<DialogRootProps>()
const emits = defineEmits<DialogRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DialogRoot v-bind="forwarded" data-slot="dialog">
    <slot />
  </DialogRoot>
</template>`,

  'DialogTrigger.vue': `<script setup lang="ts">
import { DialogTrigger, type DialogTriggerProps, useForwardProps } from 'radix-vue'
const props = defineProps<DialogTriggerProps>()
const forwarded = useForwardProps(props)
</script>
<template>
  <DialogTrigger v-bind="forwarded" data-slot="dialog-trigger">
    <slot />
  </DialogTrigger>
</template>`,

  'DialogPortal.vue': `<script setup lang="ts">
import { DialogPortal, type DialogPortalProps } from 'radix-vue'
const props = defineProps<DialogPortalProps>()
</script>
<template>
  <DialogPortal v-bind="props" data-slot="dialog-portal">
    <slot />
  </DialogPortal>
</template>`,

  'DialogClose.vue': `<script setup lang="ts">
import { DialogClose, type DialogCloseProps, useForwardProps } from 'radix-vue'
const props = defineProps<DialogCloseProps>()
const forwarded = useForwardProps(props)
</script>
<template>
  <DialogClose v-bind="forwarded" data-slot="dialog-close">
    <slot />
  </DialogClose>
</template>`,

  'DialogOverlay.vue': `<script setup lang="ts">
import { DialogOverlay, type DialogOverlayProps, useForwardProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = defineProps<DialogOverlayProps & { class?: string }>()
</script>
<template>
  <DialogOverlay
    v-bind="props"
    data-slot="dialog-overlay"
    :class="cn('data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50', props.class)"
  />
</template>`,

  'DialogContent.vue': `<script setup lang="ts">
import { DialogContent, type DialogContentProps, DialogClose, useForwardPropsEmits } from 'radix-vue'
import { XIcon } from 'lucide-vue-next'
import DialogPortal from './DialogPortal.vue'
import DialogOverlay from './DialogOverlay.vue'
import { cn } from '@/shared/lib/utils'
const props = withDefaults(defineProps<DialogContentProps & { class?: string, showCloseButton?: boolean }>(), {
  showCloseButton: true
})
const emits = defineEmits<{
  (e: 'escapeKeyDown', event: KeyboardEvent): void
  (e: 'pointerDownOutside', event: Event): void
  (e: 'focusOutside', event: Event): void
  (e: 'interactOutside', event: Event): void
  (e: 'openAutoFocus', event: Event): void
  (e: 'closeAutoFocus', event: Event): void
}>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      v-bind="forwarded"
      data-slot="dialog-content"
      :class="cn('bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg', props.class)"
    >
      <slot />
      <DialogClose v-if="showCloseButton" data-slot="dialog-close" class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-text-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\\'size-\\'])]:size-4">
        <XIcon />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>`,

  'DialogHeader.vue': `<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
const props = defineProps<{ class?: string }>()
</script>
<template>
  <div data-slot="dialog-header" :class="cn('flex flex-col gap-2 text-center sm:text-left', props.class)">
    <slot />
  </div>
</template>`,

  'DialogFooter.vue': `<script setup lang="ts">
import { cn } from '@/shared/lib/utils'
const props = defineProps<{ class?: string }>()
</script>
<template>
  <div data-slot="dialog-footer" :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', props.class)">
    <slot />
  </div>
</template>`,

  'DialogTitle.vue': `<script setup lang="ts">
import { DialogTitle, type DialogTitleProps, useForwardProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = defineProps<DialogTitleProps & { class?: string }>()
</script>
<template>
  <DialogTitle v-bind="props" data-slot="dialog-title" :class="cn('text-lg leading-none font-semibold', props.class)">
    <slot />
  </DialogTitle>
</template>`,

  'DialogDescription.vue': `<script setup lang="ts">
import { DialogDescription, type DialogDescriptionProps, useForwardProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = defineProps<DialogDescriptionProps & { class?: string }>()
</script>
<template>
  <DialogDescription v-bind="props" data-slot="dialog-description" :class="cn('text-text-secondary text-sm py-[2px]', props.class)">
    <slot />
  </DialogDescription>
</template>`
});

// 9. dropdown-menu
createFsdComponent('dropdown-menu', {
  'DropdownMenu.vue': `<script setup lang="ts">
import { DropdownMenuRoot, type DropdownMenuRootProps, type DropdownMenuRootEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<DropdownMenuRootProps>()
const emits = defineEmits<DropdownMenuRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuRoot v-bind="forwarded" data-slot="dropdown-menu">
    <slot />
  </DropdownMenuRoot>
</template>`,

  'DropdownMenuTrigger.vue': `<script setup lang="ts">
import { DropdownMenuTrigger, type DropdownMenuTriggerProps } from 'radix-vue'
const props = defineProps<DropdownMenuTriggerProps>()
</script>
<template>
  <DropdownMenuTrigger v-bind="props" data-slot="dropdown-menu-trigger">
    <slot />
  </DropdownMenuTrigger>
</template>`,

  'DropdownMenuContent.vue': `<script setup lang="ts">
import { DropdownMenuContent, type DropdownMenuContentProps, DropdownMenuPortal, useForwardProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = withDefaults(defineProps<DropdownMenuContentProps & { class?: string }>(), { sideOffset: 4 })
const forwarded = useForwardProps(props)
</script>
<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      v-bind="forwarded"
      data-slot="dropdown-menu-content"
      :class="cn('bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md', props.class)"
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>`,

  'DropdownMenuItem.vue': `<script setup lang="ts">
import { DropdownMenuItem, type DropdownMenuItemProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = withDefaults(defineProps<DropdownMenuItemProps & { class?: string, inset?: boolean, variant?: 'default'|'destructive' }>(), { variant: 'default' })
</script>
<template>
  <DropdownMenuItem
    v-bind="props"
    data-slot="dropdown-menu-item"
    :data-inset="inset"
    :data-variant="variant"
    :class="cn(\`focus:bg-level-1 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-text-secondary relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\`, props.class)"
  >
    <slot />
  </DropdownMenuItem>
</template>`,
  
  'DropdownMenuLabel.vue': `<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = defineProps<DropdownMenuLabelProps & { class?: string, inset?: boolean }>()
</script>
<template>
  <DropdownMenuLabel v-bind="props" data-slot="dropdown-menu-label" :data-inset="inset" :class="cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', props.class)">
    <slot />
  </DropdownMenuLabel>
</template>`,

  'DropdownMenuSeparator.vue': `<script setup lang="ts">
import { DropdownMenuSeparator, type DropdownMenuSeparatorProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
const props = defineProps<DropdownMenuSeparatorProps & { class?: string }>()
</script>
<template>
  <DropdownMenuSeparator v-bind="props" data-slot="dropdown-menu-separator" :class="cn('bg-border -mx-1 my-1 h-px', props.class)" />
</template>`
});

// 10. duration-chip
createFsdComponent('duration-chip', {
  'DurationChip.vue': `<script setup lang="ts">
import { ClockIcon } from 'lucide-vue-next'
import { formatTime } from '@/shared/lib/utils'

const props = defineProps<{ time: number }>()
</script>

<template>
  <div class="bg-level-2 rounded-[var(--rounded-std)] border-r-[3px] border-t-[3px] sm:border-r-[5px] sm:border-t-[5px] border-level-3 transform-origin-center h-[28px] sm:h-[32px] md:h-[40px] shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)] sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)] px-1.5 sm:px-2 md:px-3 inline-flex items-center justify-center">
    <div class="text-center flex text-[14px] sm:text-[16px] md:text-[18px] gap-1 sm:gap-1.5 md:gap-2 items-center h-full">
      <ClockIcon class="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]" />
      {{ formatTime(time) }}
    </div>
  </div>
</template>`
});

console.log('Batch 1 part 2 executed successfully.');
