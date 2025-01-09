<script setup lang="ts">
  import { Loader2 } from 'lucide-vue-next'
  import type { AsyncDataRequestStatus } from "#app";

  const signUpStatus = ref<AsyncDataRequestStatus>('idle')

  async function handleSubmitSignUpForm(e: Event) {
    const form = e.target as HTMLFormElement;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const passwordInput = form.elements.namedItem("password") as HTMLInputElement;

    if (!emailInput || !passwordInput) {
      throw Error("email or password element not found")
    }

    const email = emailInput.value;
    const password = passwordInput.value;
      
    try {
      signUpStatus.value = 'pending'
      await $fetch('/api/user/signup', {
        method: 'POST',
        body: {
          email,
          password
        },
        onResponseError({ response }) {
          const zodIssues = response?._data.message;
          alert(zodIssues)
        }
      })
      confirm("Signup created successfully.")
      navigateTo('/')
    } finally {
      signUpStatus.value = 'idle'
    }
  }
</script>

<template>
  <div class="h-screen flex justify-center items-center">
    <Card class="mx-auto max-w-sm">
    <CardHeader>
      <CardTitle class="text-xl">
        Sign Up
      </CardTitle>
      <CardDescription>
        Enter your information to create an account
      </CardDescription>
    </CardHeader>
    <CardContent>
      <form class="grid gap-4" @submit.prevent="handleSubmitSignUpForm">
        <div class="grid gap-2">
          <Label for="email">Email</Label>
          <Input
            id="email"
            data-test-email
            type="email"
            required
          />
        </div>
        <div class="grid gap-2">
          <Label data-test-password for="password">Password</Label>
          <Input id="password" type="password" />
        </div>
        <Button v-if="signUpStatus === 'pending'" disabled>
          <Loader2 class="w-4 h-4 mr-2 animate-spin" />
          Please wait
        </Button>
        <Button v-else data-test-signup type="submit" class="w-full">
          Create an account
        </Button>
      </form>
      <div class="mt-4 text-center text-sm">
        Already have an account?
        <NuxtLink class="underline" to="/signin">Sign in</NuxtLink>
      </div>
    </CardContent>
  </Card>
  </div>
</template>