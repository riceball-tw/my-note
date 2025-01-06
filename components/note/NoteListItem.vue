
<script setup lang="ts">
  const props = defineProps<{
    noteId: number
    isActive: boolean
    title: string
    subTitle: string
  }>()  
  const { isActive, title, subTitle, noteId } = toRefs(props)

  const emit = defineEmits<{
  'change-current-note-id': [id: number]
}>()
</script>

<template>
  <li>
    <button :disabled="isActive" :class="isActive ? 'bg-primary' : 'hover:bg-primary/60'" class="p-4 flex w-full gap-2 flex-col items-start text-left" type="button" @click="() => emit('change-current-note-id', noteId)">
      <div class="line-clamp-1" v-if="title">{{ title }}</div>
      <div v-else>
        Untitled
      </div>

      <span class="text-xs text-muted-foreground line-clamp-1">
        {{ subTitle }}
      </span>
    </button>
  </li>
</template>
