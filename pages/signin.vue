<script setup lang="ts">
</script>
<template>
  <div class="h-screen flex justify-center items-center">
    <Card class="mx-auto max-w-sm">
    <CardHeader>
      <CardTitle class="text-xl">
        Sign in
      </CardTitle>
      <CardDescription>
        Enter your information to sign in an account
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid gap-4">
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
          Sign in an account
        </Button>
      </div>
      <div class="mt-4 text-center text-sm">
        Don't have an account?
        <NuxtLink class="underline" to="/signup">Sign up</NuxtLink>
      </div>
    </CardContent>
  </Card>
  </div>
</template>