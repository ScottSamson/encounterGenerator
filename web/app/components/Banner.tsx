export default function Banner() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-4 rounded-full border border-accent-bright/30 bg-accent/10 px-3 py-1 text-sm text-accent-text">
        5th Edition Encounter Generator
      </span>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
        Build memorable encounters in minutes.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-fg-muted">
        A simple, polished single-page experience for planning encounters, balancing difficulty, and getting to the table faster.
      </p>
    </section>
  );
}
