/** Chart-card provenance line: source + last-updated, under every chart card. */
export default function ProvenanceLine({ source, updated }: { source: string; updated: string }) {
  return (
    <p className="provenance-line">
      {source} &mdash; {updated}
    </p>
  );
}
