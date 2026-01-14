export default function Layout({ title, rightSlot, children }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto w-full max-w-md min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-neutral-950/80 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60">Economía</p>
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
          </div>
          {rightSlot}
        </header>

        <main className="flex-1 px-4 py-4">{children}</main>
      </div>
    </div>
  );
}
