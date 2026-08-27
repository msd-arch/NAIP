import { redirect } from "next/navigation";

// Demo Walkthrough was removed from the product as part of the productization
// pass (client-facing build has no demo scaffolding). Deleting this route file
// requires a filesystem delete this session's sandbox won't allow -- redirecting
// is the equivalent user-facing outcome without one.
export default function DemoWalkthroughRedirect() {
  redirect("/");
}
