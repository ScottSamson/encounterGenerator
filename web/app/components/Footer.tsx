export default function Footer() {
  return (
    <footer className="border-t border-edge px-6 py-8">
      <p className="mx-auto max-w-5xl text-center text-xs text-fg-subtle">
        This work includes material from the System Reference Document 5.2.1 (&ldquo;SRD 5.2.1&rdquo;) by Wizards of
        the Coast LLC, available at{" "}
        <a
          href="https://www.dndbeyond.com/srd"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-fg-bright"
        >
          https://www.dndbeyond.com/srd
        </a>
        . The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/legalcode"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-fg-bright"
        >
          https://creativecommons.org/licenses/by/4.0/legalcode
        </a>
        .
      </p>
    </footer>
  );
}
