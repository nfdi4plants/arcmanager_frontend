<script lang="ts" setup>
export interface Props {
  icon: String;
  text: String;
  requiresARC?: Boolean;
  requiresUser?: Boolean;
}

const props = withDefaults(defineProps<Props>(), {
  icon: "help",
  text: "TODO",
  requiresARC: false,
  requiresUser: false,
});

const emit = defineEmits(["clicked"]);
</script>

<template>
  <q-item v-ripple clickable v-on:click="emit('clicked')">
    <q-item-section avatar>
      <q-icon color="grey-7" :name="props.icon"></q-icon>
    </q-item-section>
    <q-item-section style="margin-left: -1.2em">{{
      props.text
    }}</q-item-section>
  </q-item>
</template>
