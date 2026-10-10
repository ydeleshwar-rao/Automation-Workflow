// Full-height layout for the AI Workflow canvas editor — no padding.
export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {children}
    </div>
  );
}
