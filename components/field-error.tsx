export function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="mt-1 text-[11px] font-semibold text-red-600 dark:text-red-400"
    >
      {message}
    </p>
  );
}
