export default function LoadingState({ label = "Loading your finances..." }: { label?: string }) {
  return (
    <div className="flex min-h-[45vh] items-center justify-center p-6">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
        <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}
