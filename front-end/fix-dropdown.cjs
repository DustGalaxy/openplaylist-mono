const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', '6_shared', 'ui', 'dropdown-menu');

const files = {
  'DropdownMenuPortal.vue': `<script setup lang="ts">
import { DropdownMenuPortal, type DropdownMenuPortalProps } from 'radix-vue'
const props = defineProps<DropdownMenuPortalProps>()
</script>
<template>
  <DropdownMenuPortal v-bind="props" data-slot="dropdown-menu-portal">
    <slot />
  </DropdownMenuPortal>
</template>`,

  'DropdownMenuGroup.vue': `<script setup lang="ts">
import { DropdownMenuGroup, type DropdownMenuGroupProps } from 'radix-vue'
const props = defineProps<DropdownMenuGroupProps>()
</script>
<template>
  <DropdownMenuGroup v-bind="props" data-slot="dropdown-menu-group">
    <slot />
  </DropdownMenuGroup>
</template>`,

  'DropdownMenuCheckboxItem.vue': `<script setup lang="ts">
import { DropdownMenuCheckboxItem, type DropdownMenuCheckboxItemProps, DropdownMenuItemIndicator, type DropdownMenuCheckboxItemEmits, useForwardPropsEmits } from 'radix-vue'
import { CheckIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<DropdownMenuCheckboxItemProps & { class?: string }>()
const emits = defineEmits<DropdownMenuCheckboxItemEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuCheckboxItem
    v-bind="forwarded"
    data-slot="dropdown-menu-checkbox-item"
    :class="cn('focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\\'size-\\'])]:size-4', props.class)"
  >
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <CheckIcon class="size-4" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuCheckboxItem>
</template>`,

  'DropdownMenuRadioGroup.vue': `<script setup lang="ts">
import { DropdownMenuRadioGroup, type DropdownMenuRadioGroupProps, type DropdownMenuRadioGroupEmits, useForwardPropsEmits } from 'radix-vue'

const props = defineProps<DropdownMenuRadioGroupProps>()
const emits = defineEmits<DropdownMenuRadioGroupEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuRadioGroup v-bind="forwarded" data-slot="dropdown-menu-radio-group">
    <slot />
  </DropdownMenuRadioGroup>
</template>`,

  'DropdownMenuRadioItem.vue': `<script setup lang="ts">
import { DropdownMenuRadioItem, type DropdownMenuRadioItemProps, DropdownMenuItemIndicator, type DropdownMenuRadioItemEmits, useForwardPropsEmits } from 'radix-vue'
import { CircleIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<DropdownMenuRadioItemProps & { class?: string }>()
const emits = defineEmits<DropdownMenuRadioItemEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuRadioItem
    v-bind="forwarded"
    data-slot="dropdown-menu-radio-item"
    :class="cn('focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\\'size-\\'])]:size-4', props.class)"
  >
    <span class="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuItemIndicator>
        <CircleIcon class="size-2 fill-current" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuRadioItem>
</template>`,

  'DropdownMenuShortcut.vue': `<script setup lang="ts">
import { cn } from '@/6_shared/lib/utils'
const props = defineProps<{ class?: string }>()
</script>
<template>
  <span data-slot="dropdown-menu-shortcut" :class="cn('text-text-secondary ml-auto text-xs tracking-widest', props.class)">
    <slot />
  </span>
</template>`,

  'DropdownMenuSub.vue': `<script setup lang="ts">
import { DropdownMenuSub, type DropdownMenuSubProps, type DropdownMenuSubEmits, useForwardPropsEmits } from 'radix-vue'
const props = defineProps<DropdownMenuSubProps>()
const emits = defineEmits<DropdownMenuSubEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuSub v-bind="forwarded" data-slot="dropdown-menu-sub">
    <slot />
  </DropdownMenuSub>
</template>`,

  'DropdownMenuSubTrigger.vue': `<script setup lang="ts">
import { DropdownMenuSubTrigger, type DropdownMenuSubTriggerProps } from 'radix-vue'
import { ChevronRightIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<DropdownMenuSubTriggerProps & { class?: string, inset?: boolean }>()
</script>
<template>
  <DropdownMenuSubTrigger
    v-bind="props"
    data-slot="dropdown-menu-sub-trigger"
    :data-inset="inset"
    :class="cn('focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8', props.class)"
  >
    <slot />
    <ChevronRightIcon class="ml-auto size-4" />
  </DropdownMenuSubTrigger>
</template>`,

  'DropdownMenuSubContent.vue': `<script setup lang="ts">
import { DropdownMenuSubContent, type DropdownMenuSubContentProps, type DropdownMenuSubContentEmits, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<DropdownMenuSubContentProps & { class?: string }>()
const emits = defineEmits<DropdownMenuSubContentEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DropdownMenuSubContent
    v-bind="forwarded"
    data-slot="dropdown-menu-sub-content"
    :class="cn('bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border p-1 shadow-lg', props.class)"
  >
    <slot />
  </DropdownMenuSubContent>
</template>`
};

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(dir, filename), content);
}

let indexContent = fs.readFileSync(path.join(dir, 'index.ts'), 'utf-8');
const newExports = [
  'DropdownMenuPortal',
  'DropdownMenuGroup',
  'DropdownMenuCheckboxItem',
  'DropdownMenuRadioGroup',
  'DropdownMenuRadioItem',
  'DropdownMenuShortcut',
  'DropdownMenuSub',
  'DropdownMenuSubTrigger',
  'DropdownMenuSubContent'
];

for (const exp of newExports) {
  if (!indexContent.includes(exp)) {
    indexContent += "export { default as " + exp + " } from './" + exp + ".vue'\\n";
  }
}

fs.writeFileSync(path.join(dir, 'index.ts'), indexContent);
console.log('Dropdown menu components fixed successfully.');
