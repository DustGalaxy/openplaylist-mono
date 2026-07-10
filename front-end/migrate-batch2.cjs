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

// 1. label
createFsdComponent('label', {
  'Label.vue': `<script setup lang="ts">
import { Label, type LabelProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<LabelProps & { class?: string }>()
</script>

<template>
  <Label
    v-bind="props"
    data-slot="label"
    :class="cn('flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50', props.class)"
  >
    <slot />
  </Label>
</template>`
});

// 2. my-btn
createFsdComponent('my-btn', {
  'MyBtn.vue': `<script setup lang="ts">
import { cn } from '@/shared/lib/utils'

const props = defineProps<{
  text?: string
  isActive?: boolean
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <button
    @click="(e) => emit('click', e)"
    :disabled="disabled"
    :class="cn(
      \`pt-0.5 pb-0.75 sm:pt-1 sm:pb-1.25 cursor-pointer transition-all text-text-main [&_svg]:text-text-main duration-100 ease-out rounded-(--rounded-std) flex items-center justify-center box-border ring-1 ring-level-3/40 border-level-2 bg-level-2
      hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),0_0_25px_rgba(255,255,255,0.4)]
      hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]
      disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:shadow-none disabled:hover:text-shadow-none disabled:[&_svg]:drop-shadow-none disabled:active:shadow-none disabled:translate-y-0\`,
      isActive !== undefined
        ? isActive
          ? 'transform translate-y-0 shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]'
          : '-translate-y-0.75 sm:-translate-y-1.25 shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]'
        : 'transform -translate-y-0.75 sm:-translate-y-1.25 active:translate-y-0 shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)] active:shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]',
      props.class
    )"
  >
    <slot>{{ text }}</slot>
  </button>
</template>`
});

// 3. priority-chip
createFsdComponent('priority-chip', {
  'PriorityChip.vue': `<script setup lang="ts">
import { ArrowUpCircleIcon } from 'lucide-vue-next'

defineProps<{ number: number }>()
</script>

<template>
  <div class="bg-level-2 rounded-[var(--rounded-std)] border-r-[3px] border-t-[3px] sm:border-r-[5px] sm:border-t-[5px] border-level-3 h-[28px] sm:h-[32px] md:h-[40px] shadow-[-1px_1px_6px_rgba(0,0,0,0.4),-1px_1px_4px_rgba(0,0,0,0.3)] sm:shadow-[-2px_2px_10px_rgba(0,0,0,0.45),-2px_2px_4px_rgba(0,0,0,0.35)] px-1.5 sm:px-2 md:px-3 inline-flex items-center justify-center">
    <div class="text-center flex text-[20px] sm:text-[22px] md:text-[26px] gap-1 sm:gap-1.5 md:gap-2 items-center h-full">
      <ArrowUpCircleIcon class="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] md:w-[24px] md:h-[24px]" />
      {{ number }}
    </div>
  </div>
</template>`
});

// 4. radio-group
createFsdComponent('radio-group', {
  'RadioGroup.vue': `<script setup lang="ts">
import { RadioGroupRoot, type RadioGroupRootProps, type RadioGroupRootEmits, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RadioGroupRootProps & { class?: string }>()
const emits = defineEmits<RadioGroupRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <RadioGroupRoot
    v-bind="forwarded"
    data-slot="radio-group"
    :class="cn('grid gap-3', props.class)"
  >
    <slot />
  </RadioGroupRoot>
</template>`,

  'RadioGroupItem.vue': `<script setup lang="ts">
import { RadioGroupItem, type RadioGroupItemProps, RadioGroupIndicator, useForwardProps } from 'radix-vue'
import { CircleIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

const props = defineProps<RadioGroupItemProps & { class?: string }>()
const forwarded = useForwardProps(props)
</script>

<template>
  <RadioGroupItem
    v-bind="forwarded"
    data-slot="radio-group-item"
    :class="cn('border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  >
    <RadioGroupIndicator
      data-slot="radio-group-indicator"
      class="relative flex items-center justify-center"
    >
      <CircleIcon class="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>`
});

// 5. select
createFsdComponent('select', {
  'Select.vue': `<script setup lang="ts">
import { SelectRoot, type SelectRootProps, type SelectRootEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<SelectRootProps>()
const emits = defineEmits<SelectRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <SelectRoot v-bind="forwarded" data-slot="select">
    <slot />
  </SelectRoot>
</template>`,

  'SelectGroup.vue': `<script setup lang="ts">
import { SelectGroup, type SelectGroupProps } from 'radix-vue'
const props = defineProps<SelectGroupProps>()
</script>
<template>
  <SelectGroup v-bind="props" data-slot="select-group">
    <slot />
  </SelectGroup>
</template>`,

  'SelectValue.vue': `<script setup lang="ts">
import { SelectValue, type SelectValueProps } from 'radix-vue'
const props = defineProps<SelectValueProps>()
</script>
<template>
  <SelectValue v-bind="props" data-slot="select-value">
    <slot />
  </SelectValue>
</template>`,

  'SelectTrigger.vue': `<script setup lang="ts">
import { SelectTrigger, type SelectTriggerProps, SelectIcon } from 'radix-vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<SelectTriggerProps & { class?: string, size?: 'sm'|'default' }>(), { size: 'default' })
</script>
<template>
  <SelectTrigger
    v-bind="props"
    data-slot="select-trigger"
    :data-size="size"
    :class="cn(\`border-input data-[placeholder]:text-text-secondary [&_svg:not([class*='text-'])]:text-text-secondary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\`, props.class)"
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDownIcon class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>`,

  'SelectContent.vue': `<script setup lang="ts">
import { SelectContent, type SelectContentProps, SelectPortal, SelectViewport } from 'radix-vue'
import SelectScrollUpButton from './SelectScrollUpButton.vue'
import SelectScrollDownButton from './SelectScrollDownButton.vue'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<SelectContentProps & { class?: string }>(), { position: 'popper' })
</script>
<template>
  <SelectPortal>
    <SelectContent
      v-bind="props"
      data-slot="select-content"
      :class="cn('bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md', position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1', props.class)"
    >
      <SelectScrollUpButton />
      <SelectViewport :class="cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1')">
        <slot />
      </SelectViewport>
      <SelectScrollDownButton />
    </SelectContent>
  </SelectPortal>
</template>`,

  'SelectItem.vue': `<script setup lang="ts">
import { SelectItem, type SelectItemProps, SelectItemIndicator, SelectItemText } from 'radix-vue'
import { CheckIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectItemProps & { class?: string }>()
</script>
<template>
  <SelectItem
    v-bind="props"
    data-slot="select-item"
    :class="cn(\`focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-text-secondary relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2\`, props.class)"
  >
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <CheckIcon class="size-4" />
      </SelectItemIndicator>
    </span>
    <SelectItemText><slot /></SelectItemText>
  </SelectItem>
</template>`,

  'SelectLabel.vue': `<script setup lang="ts">
import { SelectLabel, type SelectLabelProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectLabelProps & { class?: string }>()
</script>
<template>
  <SelectLabel v-bind="props" data-slot="select-label" :class="cn('text-text-secondary px-2 py-1.5 text-xs', props.class)">
    <slot />
  </SelectLabel>
</template>`,

  'SelectSeparator.vue': `<script setup lang="ts">
import { SelectSeparator, type SelectSeparatorProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectSeparatorProps & { class?: string }>()
</script>
<template>
  <SelectSeparator v-bind="props" data-slot="select-separator" :class="cn('bg-border pointer-events-none -mx-1 my-1 h-px', props.class)" />
</template>`,

  'SelectScrollUpButton.vue': `<script setup lang="ts">
import { SelectScrollUpButton, type SelectScrollUpButtonProps } from 'radix-vue'
import { ChevronUpIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectScrollUpButtonProps & { class?: string }>()
</script>
<template>
  <SelectScrollUpButton v-bind="props" data-slot="select-scroll-up-button" :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <ChevronUpIcon class="size-4 text-text-main" />
  </SelectScrollUpButton>
</template>`,

  'SelectScrollDownButton.vue': `<script setup lang="ts">
import { SelectScrollDownButton, type SelectScrollDownButtonProps } from 'radix-vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SelectScrollDownButtonProps & { class?: string }>()
</script>
<template>
  <SelectScrollDownButton v-bind="props" data-slot="select-scroll-down-button" :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <ChevronDownIcon class="size-4 text-text-main" />
  </SelectScrollDownButton>
</template>`
});

console.log('Batch 2 part 1 executed successfully.');
