export async function useSignUp(body) {
  const { status: signUpStatus } = await useFetch('/api/user', {
    method: 'POST',
    body,
    onResponseError({ response }) {
      const zodIssues = response?._data.message;
      alert(zodIssues)
    }
  })

  if (signUpStatus.value === 'success') {
    confirm("Signup created successfully.")
    navigateTo('/')
  }

  return {
    signUpStatus
  }
}