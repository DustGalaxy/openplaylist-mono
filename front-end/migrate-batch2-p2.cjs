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

// 6. separator
createFsdComponent('separator', {
  'Separator.vue': `<script setup lang="ts">
import { Separator, type SeparatorProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<SeparatorProps & { class?: string }>(), {
  orientation: 'horizontal',
  decorative: true
})
</script>

<template>
  <Separator
    v-bind="props"
    data-slot="separator"
    :class="cn('shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', props.class)"
  />
</template>`
});

// 7. sonner
createFsdComponent('sonner', {
  'Sonner.vue': `<script setup lang="ts">
import { Toaster as Sonner, type ToasterProps } from 'vue-sonner'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-vue-next'

const props = defineProps<ToasterProps>()

// In a real Vue app with next-themes equivalent, this would be reactive.
// Hardcoded to system for now, as useTheme is not migrated yet.
const theme = 'system'
</script>

<template>
  <Sonner
    v-bind="props"
    :theme="theme"
    class="toaster group"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
    }"
  >
    <!-- Vue Sonner uses slots for custom icons -->
    <template #success-icon><CircleCheckIcon class="size-4" /></template>
    <template #info-icon><InfoIcon class="size-4" /></template>
    <template #warning-icon><TriangleAlertIcon class="size-4" /></template>
    <template #error-icon><OctagonXIcon class="size-4" /></template>
    <template #loading-icon><Loader2Icon class="size-4 animate-spin" /></template>
  </Sonner>
</template>`
});

// 8. switch
createFsdComponent('switch', {
  'Switch.vue': `<script setup lang="ts">
import { SwitchRoot, type SwitchRootProps, type SwitchRootEmits, SwitchThumb, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<SwitchRootProps & { class?: string }>()
const emits = defineEmits<SwitchRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    data-slot="switch"
    :class="cn(
      'peer data-[state=checked]:bg-level-3 data-[state=unchecked]:bg-level-2 focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="cn('bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0')"
    />
  </SwitchRoot>
</template>`
});

// 9. tabs
createFsdComponent('tabs', {
  'Tabs.vue': `<script setup lang="ts">
import { TabsRoot, type TabsRootProps, type TabsRootEmits, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsRootProps & { class?: string }>()
const emits = defineEmits<TabsRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <TabsRoot v-bind="forwarded" data-slot="tabs" :class="cn('flex flex-col gap-2', props.class)">
    <slot />
  </TabsRoot>
</template>`,

  'TabsList.vue': `<script setup lang="ts">
import { TabsList, type TabsListProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsListProps & { class?: string }>()
</script>
<template>
  <TabsList v-bind="props" data-slot="tabs-list" :class="cn('bg-level-2 text-text-secondary grid grid-cols-4 w-fit items-center justify-center rounded-(--rounded-std) p-[3px]', props.class)">
    <slot />
  </TabsList>
</template>`,

  'TabsTrigger.vue': `<script setup lang="ts">
import { TabsTrigger, type TabsTriggerProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsTriggerProps & { class?: string }>()
</script>
<template>
  <TabsTrigger
    v-bind="props"
    data-slot="tabs-trigger"
    :class="cn('data-[state=active]:bg-level-3 text-text-main px-2 py-1 cursor-pointer rounded-(--rounded-std) focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:text-text-secondary inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 border border-transparent whitespace-nowrap transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\\'size-\\'])]:size-4', props.class)"
  >
    <slot />
  </TabsTrigger>
</template>`,

  'TabsContent.vue': `<script setup lang="ts">
import { TabsContent, type TabsContentProps } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = defineProps<TabsContentProps & { class?: string }>()
</script>
<template>
  <TabsContent v-bind="props" data-slot="tabs-content" :class="cn('flex-1 outline-none', props.class)">
    <slot />
  </TabsContent>
</template>`
});

// 10. textarea
createFsdComponent('textarea', {
  'Textarea.vue': `<script setup lang="ts">
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: string }>()
</script>
<template>
  <textarea
    data-slot="textarea"
    :class="cn('border-input placeholder:text-text-secondary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm', props.class)"
  />
</template>`
});

console.log('Batch 2 part 2 executed successfully.');
