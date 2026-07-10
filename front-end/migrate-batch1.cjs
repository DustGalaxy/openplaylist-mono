const fs = require('fs');
const path = require('path');

const sharedUiDir = path.join(__dirname, 'src', 'shared', 'ui');
const sharedLibDir = path.join(__dirname, 'src', 'shared', 'lib');

// Ensure directories exist
const mkdir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

mkdir(sharedUiDir);
mkdir(sharedLibDir);

// 0. shared/lib/utils.ts
fs.writeFileSync(path.join(sharedLibDir, 'utils.ts'), `import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
`);
fs.writeFileSync(path.join(sharedLibDir, 'index.ts'), `export * from './utils'`);

// Helper to create component dir and files
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

// 1. accordion
createFsdComponent('accordion', {
  'Accordion.vue': `<script setup lang="ts">
import { AccordionRoot, type AccordionRootProps, type AccordionRootEmits, useForwardPropsEmits } from 'radix-vue'

const props = defineProps<AccordionRootProps>()
const emits = defineEmits<AccordionRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <AccordionRoot v-bind="forwarded" data-slot="accordion">
    <slot />
  </AccordionRoot>
</template>`,

  'AccordionItem.vue': `<script setup lang="ts">
import { AccordionItem, type AccordionItemProps, useForwardProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<AccordionItemProps & { class?: string }>()
const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionItem v-bind="forwarded" data-slot="accordion-item" :class="cn('', props.class)">
    <slot />
  </AccordionItem>
</template>`,

  'AccordionTrigger.vue': `<script setup lang="ts">
import { AccordionHeader, AccordionTrigger, type AccordionTriggerProps, useForwardProps } from 'radix-vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<AccordionTriggerProps & { class?: string }>()
const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger v-bind="forwarded" data-slot="accordion-trigger" :class="cn('flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180', props.class)">
      <slot />
      <ChevronDownIcon class="pointer-events-none size-4 shrink-0 translate-y-0.5 text-text-secondary transition-transform duration-200" />
    </AccordionTrigger>
  </AccordionHeader>
</template>`,

  'AccordionContent.vue': `<script setup lang="ts">
import { AccordionContent, type AccordionContentProps, useForwardProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<AccordionContentProps & { class?: string }>()
const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionContent v-bind="forwarded" data-slot="accordion-content" class="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
    <div :class="cn('pt-0 pb-4', props.class)">
      <slot />
    </div>
  </AccordionContent>
</template>`
});

// 2. button
createFsdComponent('button', {
  'variants.ts': `import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-text-main hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline: 'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
`,
  'Button.vue': `<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { buttonVariants } from './variants'
import { cn } from '@/shared/lib/utils'

interface ButtonVariantProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
}

const props = withDefaults(defineProps<PrimitiveProps & ButtonVariantProps & { class?: string }>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>`
});

// 3. button-group
createFsdComponent('button-group', {
  'variants.ts': `import { cva } from 'class-variance-authority'

export const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal: "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
        vertical: "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
)
`,
  'ButtonGroup.vue': `<script setup lang="ts">
import { buttonGroupVariants } from './variants'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  class?: string
}>(), {
  orientation: 'horizontal'
})
</script>

<template>
  <div
    role="group"
    data-slot="button-group"
    :data-orientation="orientation"
    :class="cn(buttonGroupVariants({ orientation }), props.class)"
  >
    <slot />
  </div>
</template>`,

  'ButtonGroupText.vue': `<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<PrimitiveProps & { class?: string }>(), {
  as: 'div'
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn('flex items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*=\\'size-\\'])]:size-4', props.class)"
  >
    <slot />
  </Primitive>
</template>`,

  'ButtonGroupSeparator.vue': `<script setup lang="ts">
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  class?: string
}>(), {
  orientation: 'vertical'
})
</script>

<template>
  <Separator
    data-slot="button-group-separator"
    :orientation="orientation"
    :class="cn('relative m-0! self-stretch bg-input data-[orientation=vertical]:h-auto', props.class)"
  />
</template>`
});

// 4. checkbox
createFsdComponent('checkbox', {
  'Checkbox.vue': `<script setup lang="ts">
import { CheckboxRoot, type CheckboxRootProps, type CheckboxRootEmits, CheckboxIndicator, useForwardPropsEmits } from 'radix-vue'
import { CheckIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<CheckboxRootProps & { class?: string }>()
const emits = defineEmits<CheckboxRootEmits>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="cn('peer h-4 w-4 shrink-0 border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', props.class)"
  >
    <CheckboxIndicator class="flex items-center justify-center text-current">
      <CheckIcon class="h-4 w-4" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>`
});

// 5. content-switch
createFsdComponent('content-switch', {
  'ContentSwitch.vue': `<script setup lang="ts">
import { ref } from 'vue'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<{
  defaultValue?: 'left' | 'right'
  width?: string
  height?: string
  class?: string
}>(), {
  defaultValue: 'left',
  width: '140px',
  height: '33px'
})

const emit = defineEmits<{
  (e: 'change', side: 'left' | 'right'): void
}>()

const isRight = ref(props.defaultValue === 'right')

const toggle = () => {
  isRight.value = !isRight.value
  emit('change', isRight.value ? 'right' : 'left')
}
</script>

<template>
  <div
    @click="toggle"
    :style="{ width, height }"
    :class="cn('relative flex cursor-pointer select-none items-center rounded-2xl border-2 border-level-3/40 bg-level-2 p-1.5 transition-colors duration-300', props.class)"
  >
    <div
      :class="cn('absolute right-5 font-medium text-text-main transition-all duration-300 ease-out',
        isRight ? 'pointer-events-none scale-95 opacity-0' : 'scale-100 opacity-100')"
    >
      <slot name="leftLabel" />
    </div>
    
    <div
      :class="cn('absolute left-5 font-medium text-text-main transition-all duration-300 ease-out',
        isRight ? 'scale-100 opacity-100' : 'pointer-events-none scale-95 opacity-0')"
    >
      <slot name="rightLabel" />
    </div>
    
    <div
      :style="{ transform: isRight ? \`translateX(calc(\${width} - \${height} + 3px))\` : 'translateX(0px)' }"
      class="h-full aspect-square rounded-xl bg-level-3 shadow-md transition-transform duration-300 ease-in-out"
    />
  </div>
</template>`
});

console.log('Batch 1 part 1 executed successfully.');
