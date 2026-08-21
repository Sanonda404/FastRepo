import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Users,
  GitPullRequest,
  ShieldHalf,
  GitMerge,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { FeatureGrid } from "@/components/feature-grid";
import Footer from "@/components/footer";

const features = [
  {
    title: "Per-folder permissions",
    description:
      "Grant write on /services/payments without opening the whole repo.",
    icon: ShieldCheck,
  },
  {
    title: "Nested teams",
    description:
      "Engineering → Backend → Payments Squad. Rules cascade down the tree.",
    icon: Users,
  },
  {
    title: "Pull requests",
    description: "Reviewable changes with merge handling built in.",
    icon: GitPullRequest,
  },
  {
    title: "Code reviews",
    description: "Approve, request changes or leave comments on any PR.",
    icon: ShieldHalf,
  },
  {
    title: "Clean merges",
    description:
      "Conflict detection and merge commits that keep history readable.",
    icon: GitMerge,
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 pt-24 pb-16 text-center">
          <div className="mx-auto inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            Self-hosted code hosting for your org
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Code hosting with permissions that match your org chart.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            FastRepo gives every team exactly the access they need — no more, no
            less. Self-hosted, fast, and built around how your teams are
            actually structured.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              to="/login?mode=register"
              className={buttonVariants({ variant: "default", size: "lg" })}
            >
              Get started
            </Link>
            <Link
              to="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
            Everything your team needs to ship
          </h2>
          <FeatureGrid features={features} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
