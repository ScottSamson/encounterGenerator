export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 pb-20">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Fast setup</h2>
          <p className="mt-2 text-fg-muted">Create encounters quickly with a clean, focused flow.</p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Balanced pacing</h2>
          <p className="mt-2 text-fg-muted">Design encounters that fit your party size and difficulty.</p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-semibold">Ready to run</h2>
          <p className="mt-2 text-fg-muted">Bring the setup to the table with confidence and clarity.</p>
        </div>
      </div>
    </section>
  );
}
