export default function AdminLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        role="status"
        aria-label="Loading"
        className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500"
      />
    </div>
  );
}
