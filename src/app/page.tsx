import { redirect } from "next/navigation";

// Root redirect: /login là điểm vào. Dashboard check token client-side.
export default function Home() {
  redirect("/login");
}
