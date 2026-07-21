<script setup lang="ts">
  import { useDebounceFn } from '@vueuse/core';
  import { Plus, Trash2, CircleUser, Menu, ScrollText, Loader2, MessageSquare, Bot } from 'lucide-vue-next'
  import type { AsyncDataRequestStatus } from "#app";
  import { useChat } from '@ai-sdk/vue'
  import { CopyIcon, RefreshCcwIcon, XIcon } from '@lucide/vue'
  import type { ChatStatus, UIMessage } from 'ai'
  import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'

  import {
    Conversation,
    ConversationContent,
    ConversationScrollButton,
    ConversationEmptyState,
  } from '@/components/ai-elements/conversation'
  import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
    MessageResponse,
  } from '@/components/ai-elements/message'
  import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputTextarea,
    PromptInputSubmit,
    PromptInputTools,
  } from '@/components/ai-elements/prompt-input'
  import { Loader } from '@/components/ai-elements/loader'
  import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
  } from '@/components/ai-elements/reasoning'
  import {
    Tool,
    ToolContent,
    ToolHeader,
    ToolInput,
    ToolOutput,
  } from '@/components/ai-elements/tool'

  definePageMeta({
    middleware: ['auth']
  })

  // ── Notes ──
  const { data: notes, status: notesStatus, refresh: refreshNotes } = useLazyFetch('/api/notes', {
    transform: (res) => {
      return res?.map(note => {
        const noteUpdatedString = new Date(note.updatedAt).toDateString();
        const todayString = new Date().toDateString();    
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayString = yesterday.toDateString()
        if (noteUpdatedString === todayString) return {...note, category: 'today' as const }
        if(noteUpdatedString === yesterdayString) return {...note, category: 'yesterday' as const }
        return {...note, category: 'earlier' as const}
      })
    }
  })
  const currentNoteId = ref<null | number>(null)
  const updatedNoteText = ref<string | null>('')
  const updatedNoteTitle = ref<string>('')
  const currentNote = computed(() => {
    if (!currentNoteId.value) return null
    return notes?.value?.find(note => note.id === currentNoteId.value)
  })
  type RefType<T> = T extends globalThis.Ref<infer U> ? U : never;
  type Notes = RefType<typeof notes>;
  interface NotesGroupByCategory {
    today: Notes
    yesterday: Notes
    earlier: Notes
  }

  const notesGroupByCategory = computed<NotesGroupByCategory>(() => {
    const defaultNotes = {
      today: [],
      yesterday: [],
      earlier: []
    }

    if (!notes?.value?.length) return defaultNotes

    const groupedNotes = notes.value.reduce((acc: NotesGroupByCategory, note) => {
      const { category } = note;
      if (!acc[category]) acc[category] = [];
      acc[category].push(note);
      return acc;
    }, defaultNotes);

    const sortedGroupedNotes = {
      today: groupedNotes.today?.slice().sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ) ?? [],
      yesterday: groupedNotes.yesterday?.slice().sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ) ?? [],
      earlier: groupedNotes.earlier?.slice().sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ) ?? []
    };

    return sortedGroupedNotes;
  })

  function handleChangeCurrentNoteId(id: number) {
    currentNoteId.value = id
  }

  async function saveNotePatch(patch: { title?: string, text?: string | null }) {
    if (!currentNoteId.value) return
    try {
      await $fetch(`/api/notes/${currentNoteId.value}`, {
        method: 'PATCH',
        body: patch
      })
      mergeIntoNotes(currentNoteId.value, patch)
    } catch(err) {
      console.error(err)
    }
  }

  function mergeIntoNotes(id: number, patch: { title?: string, text?: string | null }) {
    if (!notes.value) return
    notes.value = notes.value.map(note =>
      note.id === id ? { ...note, ...patch } : note
    )
  }

  const handleDebouncedUpdateNote = useDebounceFn(() => {
    saveNotePatch({ text: updatedNoteText.value })
  }, 300)

  const handleDebouncedUpdateTitle = useDebounceFn(() => {
    const title = updatedNoteTitle.value.trim()
    if (!title) return
    saveNotePatch({ title })
  }, 300)

  watchEffect(() => {
    if (currentNote.value) {
      updatedNoteText.value = currentNote.value.text
      updatedNoteTitle.value = currentNote.value.title ?? ''
    }
  })

  const noteTextarea = ref<HTMLTextAreaElement | null>(null)
  const createNoteStatus = ref<AsyncDataRequestStatus>('idle')

  async function handleCreateNote() {
    if (!notes.value) return

    try {
      createNoteStatus.value = 'pending'
      const newNote = await $fetch(`/api/notes`, {
        method: 'POST',
        body: {}
      })
      notes.value = [...notes.value, {...newNote, category: 'today'}]
      currentNoteId.value = newNote.id
      if (noteTextarea.value) {
        noteTextarea.value.focus()
      }

    } catch(err) {
      console.error(err)
    } finally {
      createNoteStatus.value = 'idle'
    }
  }

  function handleLogout() {
    const jwtCookie = useCookie('userJwtToken')
    jwtCookie.value = null
    navigateTo('/signin')
  }

  const deleteNoteStatus = ref<AsyncDataRequestStatus>('idle')
  function handleDeleteNote() {
    if (!currentNoteId.value) return
    try {
      deleteNoteStatus.value = 'pending'
      $fetch(`/api/notes/${currentNoteId.value}`, {
        method: 'DELETE'
      })
      notes.value = notes.value!.filter(note => note.id !== currentNoteId.value)
      currentNoteId.value = null
    } catch (err) {
      console.error(err)
    } finally {
      deleteNoteStatus.value = 'idle'
    }
  }

  // ── Chat ──
  const showChat = ref(false)

  // Refetch notes and drop the selection if the current note vanished.
  async function refreshNotesAndReconcile() {
    await refreshNotes()
    if (currentNoteId.value && !notes.value?.some(note => note.id === currentNoteId.value)) {
      currentNoteId.value = null
    }
  }

  const { messages, status: chatStatus, sendMessage, regenerate, error: chatError } = useChat({
    onData(dataPart) {
      // The assistant emits this transient signal after any create/update/delete.
      if (dataPart.type === 'data-notes-changed') {
        refreshNotesAndReconcile()
      }
    }
  })

  // Deletion confirmations the user has already resolved (confirmed or cancelled).
  const resolvedDeletes = ref<Set<string>>(new Set())

  interface PendingDeleteData {
    token: string
    noteId: number
    title: string
  }

  function asPendingDelete(part: UIMessage['parts'][number]): PendingDeleteData {
    return (part as { data: PendingDeleteData }).data
  }

  const confirmDeleteStatus = ref<AsyncDataRequestStatus>('idle')

  async function handleConfirmDelete(data: PendingDeleteData) {
    try {
      confirmDeleteStatus.value = 'pending'
      await $fetch('/api/notes/confirm-delete', {
        method: 'POST',
        body: { token: data.token }
      })
      resolvedDeletes.value = new Set(resolvedDeletes.value).add(data.token)
      await refreshNotesAndReconcile()
    } catch (err) {
      console.error(err)
    } finally {
      confirmDeleteStatus.value = 'idle'
    }
  }

  function handleCancelDelete(data: PendingDeleteData) {
    resolvedDeletes.value = new Set(resolvedDeletes.value).add(data.token)
  }

  const lastMessageId = computed(() => messages.value.at(-1)?.id ?? null)

  const lastAssistantMessageId = computed(() => {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const msg = messages.value[i]
      if (msg && msg.role === 'assistant') return msg.id
    }
    return null
  })

  const chatSubmitDisabled = computed(() => {
    return chatStatus.value === 'submitted' || chatStatus.value === 'streaming'
  })

  async function handleChatSubmit(msg: PromptInputMessage) {
    if (!msg.text?.trim() && !msg.files?.length) return
    await sendMessage({ text: msg.text, files: msg.files })
  }

  function isLastTextPart(message: UIMessage, partIndex: number) {
    for (let i = partIndex + 1; i < message.parts.length; i++) {
      if (message.parts[i]?.type === 'text') return false
    }
    return true
  }

  function isReasoningStreaming(message: UIMessage, partIndex: number) {
    return (
      chatStatus.value === 'streaming' &&
      message.id === lastMessageId.value &&
      partIndex === message.parts.length - 1
    )
  }

  function shouldShowActions(message: UIMessage, partIndex: number) {
    if (message.role !== 'assistant') return false
    if (lastAssistantMessageId.value !== message.id) return false
    return isLastTextPart(message, partIndex)
  }

  async function copyToClipboard(text: string) {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  function handleRegenerate() {
    regenerate()
  }

</script>


<template>
  <div class="grid min-h-screen w-full" :class="showChat
    ? 'md:grid-cols-[220px_1fr_400px] lg:grid-cols-[280px_1fr_400px]'
    : 'md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]'
  ">
    <!-- Sidebar -->
    <div class="hidden border-r bg-muted/40 md:block">
      <div class="flex h-full max-h-screen overflow-auto flex-col gap-2">
        <div class="flex items-center border-b p-4">
          <a href="/" class="flex items-center gap-2 font-semibold">
            <ScrollText class="h-6 w-6" />
            <span class="">MyNote</span>
          </a>
          <Button v-if="createNoteStatus === 'pending'" variant="outline" size="icon" class="ml-auto h-8 w-8" @click="handleCreateNote">
            <Loader2 class="w-4 h-4 animate-spin" />
            <span class="sr-only" aria-live="polite">Creating Note</span>
          </Button>
          <Button v-else variant="outline" size="icon" class="ml-auto h-8 w-8" @click="handleCreateNote">
            <Plus class="h-4 w-4" />
            <span class="sr-only">Create Note</span>
          </Button>
        </div>
 
        <!-- Notes -->
        <div v-if="notesStatus === 'success'">
          <div class="flex justify-between px-4 py-2 text-sm font-semibold">
            <span>Today</span>
            <Badge variant="outline">{{ notesGroupByCategory['today']?.length ?? 0 }}</Badge>
          </div>
          <ol>
            <template v-for="note in notesGroupByCategory['today']" :key="note.id">
              <NoteListItem :note-id="note.id" :is-active="note.id === currentNoteId" :title="note.title" sub-title="Today" @change-current-note-id="(id) => handleChangeCurrentNoteId(id)"/>
            </template>
          </ol>


          <div class="flex justify-between px-4 py-2 text-sm font-semibold">
            <span>Yesterday</span>
            <Badge variant="outline">{{ notesGroupByCategory['yesterday']?.length ?? 0 }}</Badge>
          </div>
          <ol>
            <template v-for="note in notesGroupByCategory['yesterday']" :key="note.id">
              <NoteListItem :note-id="note.id" :is-active="note.id === currentNoteId" :title="note.title" sub-title="Yesterday" @change-current-note-id="(id) => handleChangeCurrentNoteId(id)"/>
            </template>
          </ol>
          <div class="flex justify-between px-4 py-2 text-sm font-semibold">
            <span>Earlier</span>
            <Badge variant="outline">{{ notesGroupByCategory['earlier']?.length ?? 0 }}</Badge>
          </div>
          <ol>
            <template v-for="note in notesGroupByCategory['earlier']" :key="note.id">
              <NoteListItem :note-id="note.id" :is-active="note.id === currentNoteId" :title="note.title" :sub-title="new Date(note.updatedAt).toLocaleDateString()" @change-current-note-id="(id) => handleChangeCurrentNoteId(id)"/>
            </template>
          </ol>
        </div>
        <div v-else>
            <ol>
              <li v-for="index in 5" :key='index' class="p-4 flex gap-2 w-full flex-col items-start">
                <Skeleton style="height: 28px; width: 128px;" class=" bg-muted-foreground h-5 rounded-md" />
                <Skeleton style="height: 16px; width: 31px;" class=" bg-muted-foreground h-5 rounded-md" />
              </li>
            </ol>
        </div>
      </div>
    </div>

    <!-- Main -->
    <div class="flex flex-col">
      <header class="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
        <Sheet>
          <SheetTrigger as-child>
            <Button
              variant="outline"
              size="icon"
              class="shrink-0 md:hidden"
            >
              <Menu class="h-5 w-5" />
              <span class="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" class="flex flex-col overflow-auto max-h-screen">
            <nav class="grid gap-2 text-lg font-medium">
                <!-- Notes -->
                <div v-if="notesStatus === 'success'">
                  <div class="flex justify-between px-4 py-2 text-sm font-semibold">
                    <span>Today</span>
                    <Badge variant="outline">{{ notesGroupByCategory['today']?.length ?? 0 }}</Badge>
                  </div>
                  <ol>
                    <template v-for="note in notesGroupByCategory['today']" :key="note.id">
                      <NoteListItem :note-id="note.id" :is-active="note.id === currentNoteId" :title="note.title" sub-title="Today" @change-current-note-id="(id) => handleChangeCurrentNoteId(id)"/>
                    </template>
                  </ol>

                  <div class="flex justify-between px-4 py-2 text-sm font-semibold">
                    <span>Yesterday</span>
                    <Badge variant="outline">{{ notesGroupByCategory['yesterday']?.length ?? 0 }}</Badge>
                  </div>
                  <ol>
                    <template v-for="note in notesGroupByCategory['yesterday']" :key="note.id">
                    <NoteListItem :note-id="note.id" :is-active="note.id === currentNoteId" :title="note.title" sub-title="Yesterday" @change-current-note-id="(id) => handleChangeCurrentNoteId(id)"/>
                    </template>
                  </ol>
                  
                  <div class="flex justify-between px-4 py-2 text-sm font-semibold">
                    <span>Earlier</span>
                    <Badge variant="outline">{{ notesGroupByCategory['earlier']?.length ?? 0 }}</Badge>
                  </div>
                  <ol>
                    <template v-for="note in notesGroupByCategory['earlier']" :key="note.id">
                    <NoteListItem :note-id="note.id" :is-active="note.id === currentNoteId" :title="note.title" :sub-title="new Date(note.updatedAt).toLocaleDateString()" @change-current-note-id="(id) => handleChangeCurrentNoteId(id)"/>
                    </template>
                  </ol>
                  
                </div>
                <div v-else>
                    <ol>
                      <li v-for="index in 5" :key='index' class="p-4 flex gap-2 w-full flex-col items-start">
                        <Skeleton style="height: 28px; width: 128px;" class=" bg-muted-foreground h-5 rounded-md" />
                        <Skeleton style="height: 16px; width: 31px;" class=" bg-muted-foreground h-5 rounded-md" />
                      </li>
                    </ol>
                </div>
            </nav>
          </SheetContent>
        </Sheet>

        <!-- AI Chat toggle -->
        <Button
          variant="ghost"
          size="sm"
          class="gap-2 ml-2"
          @click="showChat = !showChat"
        >
          <MessageSquare class="h-4 w-4" />
          AI Chat
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="secondary" size="icon" class="rounded-full ml-auto">
              <CircleUser class="h-5 w-5" />
              <span class="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem @click="handleLogout">Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <!-- Notes view (always visible) -->
      <main class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6"> 
        <div class="flex flex-col flex-1 p-4 rounded-lg border border-dashed shadow-sm">
          <div v-if="!currentNote">
            <h1 class="text-2xl font-semibold">Welcome to MyNote</h1>
            <p class="text-muted-foreground">
              Click on a note to view or edit it.
            </p>
          </div>
          <div v-else style="max-width: 75ch" class="flex flex-col h-full">
            <time class="mb-2 inline-block text-sm text-muted-foreground">
              Last Updated: {{ new Date(currentNote.updatedAt).toLocaleDateString() }}
            </time>
            <input
              v-model="updatedNoteTitle"
              class="mb-6 w-full bg-transparent text-2xl font-semibold focus:outline-none"
              placeholder="Untitled note"
              aria-label="Note title"
              @input="handleDebouncedUpdateTitle"
            >
            <textarea ref="noteTextarea" v-model="updatedNoteText" class="w-full h-full focus:outline-none resize-none" @input="handleDebouncedUpdateNote" />
          </div>
        </div>
        
        <Button v-if="deleteNoteStatus === 'pending'" :disabled="true" variant="destructive" size="icon" class="w-full">
            <Loader2 class="w-4 h-4 animate-spin" />
            <span aria-live="polite">Deleting Note</span>
        </Button>
        <Button v-else :disabled="!currentNoteId" variant="outline" size="icon" class="w-full" @click="handleDeleteNote">
          <Trash2 class="h-4 w-4" />
          Delete Note
        </Button>
      </main>
    </div>

    <!-- Right panel: AI Chat -->
    <div v-if="showChat" class="hidden border-l bg-muted/40 md:flex md:flex-col h-screen overflow-hidden">
      <div class="flex items-center border-b px-4 py-3 shrink-0">
        <span class="font-semibold text-sm">AI Chat</span>
        <Button variant="ghost" size="icon-sm" class="ml-auto h-7 w-7" @click="showChat = false">
          <XIcon class="h-4 w-4" />
        </Button>
      </div>
      <div class="flex flex-col flex-1 p-3 gap-3 overflow-hidden">
        <Conversation class="h-full">
          <ConversationContent>
            <ConversationEmptyState v-if="messages.length === 0 && chatStatus !== 'error'">
              <div class="flex flex-col items-center gap-2 text-center">
                <Bot class="h-8 w-8 text-muted-foreground/60" />
                <h2 class="text-base font-semibold">How can I help?</h2>
                <p class="text-xs text-muted-foreground">
                  Ask me to manage your notes.
                </p>
              </div>
            </ConversationEmptyState>

            <div v-for="message in messages" :key="message.id">
              <template
                v-for="(part, partIndex) in message.parts"
                :key="`${message.id}-${partIndex}`"
              >
                <Message
                  v-if="part.type === 'text'"
                  :from="message.role"
                >
                  <div>
                    <MessageContent>
                      <MessageResponse :content="part.text" />
                    </MessageContent>

                    <MessageActions v-if="shouldShowActions(message, partIndex)">
                      <MessageAction
                        label="Retry"
                        tooltip="Regenerate response"
                        @click="handleRegenerate"
                      >
                        <RefreshCcwIcon class="size-3" />
                      </MessageAction>
                      <MessageAction
                        label="Copy"
                        tooltip="Copy to clipboard"
                        @click="copyToClipboard(part.text)"
                      >
                        <CopyIcon class="size-3" />
                      </MessageAction>
                    </MessageActions>
                  </div>
                </Message>

                <Reasoning
                  v-else-if="part.type === 'reasoning'"
                  class="w-full"
                  :is-streaming="isReasoningStreaming(message, partIndex)"
                >
                  <ReasoningTrigger />
                  <ReasoningContent :content="part.text" />
                </Reasoning>

                <Tool v-else-if="part.type === 'dynamic-tool'" class="my-2">
                  <ToolHeader :type="part.type" :state="part.state" :tool-name="part.toolName" />
                  <ToolContent>
                    <ToolInput :input="part.input" />
                    <ToolOutput :output="part.output" :error-text="part.errorText" />
                  </ToolContent>
                </Tool>

                <div
                  v-else-if="part.type === 'data-pending-delete' && !resolvedDeletes.has(asPendingDelete(part).token)"
                  class="my-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm"
                >
                  <p class="mb-2">
                    Delete note <strong>“{{ asPendingDelete(part).title }}”</strong>? This can't be undone.
                  </p>
                  <div class="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      :disabled="confirmDeleteStatus === 'pending'"
                      @click="handleConfirmDelete(asPendingDelete(part))"
                    >
                      Confirm
                    </Button>
                    <Button variant="outline" size="sm" @click="handleCancelDelete(asPendingDelete(part))">
                      Cancel
                    </Button>
                  </div>
                </div>
              </template>
            </div>

            <Loader v-if="chatStatus === 'submitted'" class="mx-auto" />

            <div
              v-if="chatStatus === 'error' && chatError"
              class="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {{ chatError.message || 'Something went wrong.' }}
            </div>
          </ConversationContent>

          <ConversationScrollButton />
        </Conversation>

        <PromptInput
          class="shrink-0"
          @submit="handleChatSubmit"
        >
          <PromptInputBody>
            <PromptInputTextarea placeholder="Ask me to manage your notes..." class="min-h-[36px] text-sm" />
          </PromptInputBody>

          <PromptInputFooter>
            <PromptInputTools>
              <div class="flex-1" />
            </PromptInputTools>

            <PromptInputSubmit
              :disabled="chatSubmitDisabled"
              :status="chatStatus as ChatStatus"
              size="icon-sm"
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  </div>
</template>