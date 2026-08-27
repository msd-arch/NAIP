/** Persistent, always-visible disclaimer bar (WRIP-style) directly under a
    page's H1. One consistent presentation for whichever honesty caveat
    applies on that page -- never collapsible. */
export default function DisclaimerBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="disclaimer-bar -mx-4 mt-3 sm:mx-0 sm:rounded-lg sm:border sm:border-t-[3px]" role="note">
      <strong>Read before trusting this page: </strong>
      {children}
    </div>
  );
}
