import { redirect } from "next/navigation";

export default function Home() {
  // Start with company setup
  redirect("/setup");
}
