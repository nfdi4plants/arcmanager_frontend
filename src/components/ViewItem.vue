<script lang="ts" setup>
export interface Props {
  label: String;
  caption: String;
  icon: String;
  defaultOpened?: Boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <q-expansion-item
    expand-separator
    :icon="props.icon"
    :label="props.label"
    :caption="props.caption"
    header-class="bg-grey-33"
    :default-opened="props.defaultOpened">
    <div style="display: block; margin: 0 auto; max-width: 80%">
      <slot></slot>
    </div>
  </q-expansion-item>
</template>

<style></style>
