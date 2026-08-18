export default function CaveatBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="caveat-banner my-4" role="note">
      <strong>Real limitation: </strong>
      {children}
    </div>
  );
}
