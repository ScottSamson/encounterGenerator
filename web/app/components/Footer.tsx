export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8">
      <p className="mx-auto max-w-5xl text-center text-xs text-slate-400">
        This work includes material from the System Reference Document 5.2.1 (&ldquo;SRD 5.2.1&rdquo;) by Wizards of
        the Coast LLC, available at{" "}
        <a
          href="https://www.dndbeyond.com/srd"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-200"
        >
          https://www.dndbeyond.com/srd
        </a>
        . The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/legalcode"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-200"
        >
          https://creativecommons.org/licenses/by/4.0/legalcode
        </a>
        .
      </p>
    </footer>
  );
}
