// A soft grey block that shimmers while a page loads. Pass the size and shape with Tailwind classes.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

// Wraps a loading screen so screen readers announce it once.
export function LoadingShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <main role="status" aria-busy="true" className={className}>
      <span className="sr-only">Loading</span>
      {children}
    </main>
  );
}
