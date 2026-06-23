interface MessageProps {
  message?: string;
}

export function Loading({ message = "Loading…" }: MessageProps) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

export function ErrorState({ message = "Something went wrong." }: MessageProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
      {message}
    </div>
  );
}

export function Empty({ message = "No data for the current filters." }: MessageProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}
