export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startElectionCloseScheduler } = await import(
      "@/features/voting/server/close-scheduler"
    );
    startElectionCloseScheduler();
  }
}
