import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { RESOURCES } from "@/lib/dsa-data";

export const Route = createFileRoute("/resources")({
  head: () => seoHead({ path: "/resources", title: "Curated DSA & Interview Resources | Codex", description: "A curated library of data structures, algorithms, system design and interview preparation resources hand-picked for placement candidates.", ogTitle: "Curated DSA & Interview Resources | Codex", ogDescription: "Hand-picked DSA, system design and interview preparation links for placement prep." }),
  component: () => (
    <DashboardLayout>
      <Resources />
    </DashboardLayout>
  ),
});

function Resources() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">DSA Resources</h1>
        <p className="text-sm text-muted-foreground">Curated books, sites and channels — categorized by format.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {RESOURCES.map((cat) => (
          <Card key={cat.category} className="p-5">
            <h2 className="font-display text-xl mb-3">{cat.category}</h2>
            <ul className="space-y-2">
              {cat.items.map((it) => (
                <li key={it.url}>
                  <a href={it.url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1 hover:underline">
                    {it.name} <ExternalLink className="size-3" />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
