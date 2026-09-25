export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-background-color)' }}>
      {children}
    </div>
  );
}
