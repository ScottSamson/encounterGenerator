export default function Features() {
  return (
    <section id="features" className="mx-auto max-w-5xl px-6 pb-20">
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Fast setup</h2>
          <p className="mt-2 text-slate-300">Create encounters quickly with a clean, focused flow.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Balanced pacing</h2>
          <p className="mt-2 text-slate-300">Design encounters that fit your party size and difficulty.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-xl font-semibold">Ready to run</h2>
          <p className="mt-2 text-slate-300">Bring the setup to the table with confidence and clarity.</p>
        </div>
      </div>
    </section>
  );
}
