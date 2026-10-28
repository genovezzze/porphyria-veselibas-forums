import { redirect } from "next/navigation";

// No separate landing page: the site opens straight into the demo cabinet.
export default function Home() {
  redirect("/demo");
}
