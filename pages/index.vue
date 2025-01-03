<script setup lang="ts">
  import { Plus, CircleUser, Home, Menu, ScrollText, Search } from 'lucide-vue-next'

  definePageMeta({
    middleware: ['auth']
  })

  const { data: notes, status: notesStatus } = useLazyFetch('/api/notes', {
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

    return groupedNotes;
  })

  function handleChangeCurrentNoteId(id: number) {
    currentNoteId.value = id
  }

</script>


<template>
  <div class="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
    <div class="hidden border-r bg-muted/40 md:block">
      <div class="flex h-full max-h-screen flex-col gap-2">
        <div class="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <a href="/" class="flex items-center gap-2 font-semibold">
            <ScrollText class="h-6 w-6" />
            <span class="">MyNote</span>
          </a>

          <Button variant="outline" size="icon" class="ml-auto h-8 w-8">
            <Plus class="h-4 w-4" />
            <span class="sr-only">Toggle notifications</span>
          </Button>
        </div>
 
        <NoteListItem></NoteListItem>

        <!-- Notes -->
        <div v-if="notesStatus === 'success'">
          <div class="flex justify-between px-4 py-2 text-sm font-semibold">
            <span>Today</span>
            <Badge variant="outline">{{ notesGroupByCategory['today']?.length ?? 0 }}</Badge>
          </div>
          <ol v-for="note in notesGroupByCategory['today']" :key="note.id">
            <li>
              <button @click="() => handleChangeCurrentNoteId(note.id)" :disabled="note.id === currentNoteId" :class="note.id === currentNoteId ? 'bg-primary' : 'hover:bg-primary/60'" class=" p-4 flex w-full gap-2 flex-col items-start" type="button">
                {{ note.text }}
                <span class="text-xs text-muted-foreground">
                  {{ new Date(note.updatedAt).toDateString() === new Date().toDateString()
                  ? 'Today' 
                  : new Date(note.updatedAt).toLocaleDateString() }}
                </span>
              </button>
            </li>
          </ol>

          <div class="flex justify-between px-4 py-2 text-sm font-semibold">
            <span>Yesterday</span>
            <Badge variant="outline">{{ notesGroupByCategory['yesterday']?.length ?? 0 }}</Badge>
          </div>
          <ol v-for="note in notesGroupByCategory['yesterday']" :key="note.id">
            <li>
              <button @click="() => handleChangeCurrentNoteId(note.id)" :disabled="note.id === currentNoteId" :class="note.id === currentNoteId ? 'bg-primary' : 'hover:bg-primary/60'" class=" p-4 flex w-full gap-2 flex-col items-start" type="button">
                {{ note.text }}
                <span class="text-xs text-muted-foreground">
                  {{ new Date(note.updatedAt).toDateString() === new Date().toDateString()
                  ? 'Today' 
                  : new Date(note.updatedAt).toLocaleDateString() }}
                </span>
              </button>
            </li>
          </ol>
          
          <div class="flex justify-between px-4 py-2 text-sm font-semibold">
            <span>Earlier</span>
            <Badge variant="outline">{{ notesGroupByCategory['earlier']?.length ?? 0 }}</Badge>
          </div>
          <ol v-for="note in notesGroupByCategory['earlier']" :key="note.id">
            <li>
              <button @click="() => handleChangeCurrentNoteId(note.id)" :disabled="note.id === currentNoteId" :class="note.id === currentNoteId ? 'bg-primary' : 'hover:bg-primary/60'" class=" p-4 flex w-full gap-2 flex-col items-start" type="button">
                {{ note.text }}
                <span class="text-xs text-muted-foreground">
                  {{ new Date(note.updatedAt).toDateString() === new Date().toDateString()
                  ? 'Today' 
                  : new Date(note.updatedAt).toLocaleDateString() }}
                </span>
              </button>
            </li>
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
          <SheetContent side="left" class="flex flex-col">
            <nav class="grid gap-2 text-lg font-medium">
              <a
                href="#"
                class="flex items-center gap-2 text-lg font-semibold"
              >
                <ScrollText class="h-6 w-6" />
                <span class="sr-only">MyNote</span>
              </a>
              <a
                href="#"
                class="mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground"
              >
                <Home class="h-5 w-5" />
                Dashboard-mobile
              </a>
            </nav>
          </SheetContent>
        </Sheet>
        <div class="w-full flex-1">
          <form>
            <div class="relative">
              <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                class="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
              />
            </div>
          </form>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="secondary" size="icon" class="rounded-full">
              <CircleUser class="h-5 w-5" />
              <span class="sr-only">Toggle user menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main class="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6"> 
        <div class="flex flex-col flex-1 p-4 rounded-lg border border-dashed shadow-sm">
          <div v-if="!currentNote">
            <h1 class="text-2xl font-semibold">Welcome to MyNote</h1>
            <p class="text-muted-foreground">
              Click on a note to view or edit it.
            </p>
          </div>
          <div v-else>
            {{ new Date(currentNote.updatedAt).toLocaleDateString() }}
          </div>  
          <div>
            {{ currentNote?.text }}
          </div>
        </div>
      </main>
    </div>
  </div>
</template>