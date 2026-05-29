export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 p-5 animate-pulse">
      <div className="h-8 w-64 bg-muted rounded-lg" />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 h-72 bg-muted rounded-2xl" />
        <div className="h-72 bg-muted rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 h-60 bg-muted rounded-2xl" />
        <div className="h-60 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}
