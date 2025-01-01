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
            type="email"
            required
          />
        </div>
        <div class="grid gap-2">
          <Label for="password">Password</Label>
          <Input id="password" type="password" />
        </div>
        <Button type="submit" class="w-full">
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