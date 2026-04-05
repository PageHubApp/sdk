/** SDK stub — the real useUserProfile lives in the main app's SWR layer. */
export function useUserProfile(_isAuthenticated: boolean) {
  return {
    user: null,
    creditsRemaining: null,
    isLoading: false,
    isError: false,
    error: null,
    mutate: () => Promise.resolve(undefined),
  };
}
