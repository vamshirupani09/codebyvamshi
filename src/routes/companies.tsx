import { seoHead } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Search, ListChecks, Code2, MessageSquareQuote, Route as RouteIcon, HelpCircle, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COMPANIES, type CompanyProfile } from "@/lib/companies";

export const Route = createFileRoute("/companies")({
  head: () =>
    seoHead({
      path: "/companies",
      title: "Company Interview Prep Hub | Codex",
      description:
        "Hiring process, DSA topics, coding questions, HR questions and 8-week roadmaps for Google, Microsoft, Amazon, TCS, Infosys and 13 more companies.",
      ogTitle: "Company Interview Prep Hub | Codex",
      ogDescription: "Company-wise interview preparation for 18 top tech recruiters.",
    }),
  component: () => (
    <DashboardLayout>
      <Companies />
    </DashboardLayout>
  ),
});

function Companies() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState<CompanyProfile>(COMPANIES[0]!);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return COMPANIES;
    return COMPANIES.filter((c) => c.name.toLowerCase().includes(s) || c.tags.some((t) => t.toLowerCase().includes(s)));
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Company Preparation Hub</h1>
        <p className="text-sm text-muted-foreground">
          Hiring process, question banks and a week-by-week roadmap for {COMPANIES.length} top recruiters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-4">
        <Card className="p-3 space-y-3">
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company…" className="pl-8" maxLength={40} />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-1.5 max-h-[28rem] overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActive(c)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition ${
                  active.slug === c.slug ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <Building2 className="size-4 shrink-0" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground px-2 py-4">No match.</p>}
          </div>
        </Card>

        <Card className="p-5 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl">{active.name}</h2>
            <Badge variant="secondary">{active.tier}</Badge>
            {active.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <a href={`/interview?company=${active.slug}`}>
                <Sparkles className="size-4 mr-2" /> Mock interview
              </a>
            </Button>
          </div>

          <Tabs defaultValue="process">
            <TabsList className="grid grid-cols-3 md:grid-cols-6 w-full">
              <TabsTrigger value="process">Process</TabsTrigger>
              <TabsTrigger value="dsa">DSA</TabsTrigger>
              <TabsTrigger value="coding">Coding</TabsTrigger>
              <TabsTrigger value="hr">HR</TabsTrigger>
              <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="process" className="pt-4 space-y-4">
              <Section icon={ListChecks} title="Hiring process">
                <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                  {active.process.map((p, i) => <li key={i}>{p}</li>)}
                </ol>
              </Section>
              <Section icon={MessageSquareQuote} title="Interview experience">
                <p className="text-sm text-muted-foreground">{active.experience}</p>
              </Section>
            </TabsContent>

            <TabsContent value="dsa" className="pt-4">
              <div className="flex flex-wrap gap-2">
                {active.dsaTopics.map((t) => <Badge key={t} variant="secondary" className="text-sm">{t}</Badge>)}
              </div>
            </TabsContent>

            <TabsContent value="coding" className="pt-4">
              <Section icon={Code2} title="Frequently asked coding questions">
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {active.codingQuestions.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </Section>
            </TabsContent>

            <TabsContent value="hr" className="pt-4">
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {active.hrQuestions.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </TabsContent>

            <TabsContent value="roadmap" className="pt-4">
              <Section icon={RouteIcon} title="Preparation roadmap">
                <ol className="space-y-2">
                  {active.roadmap.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">{i + 1}</span>
                      <span className="text-muted-foreground">{r}</span>
                    </li>
                  ))}
                </ol>
              </Section>
            </TabsContent>

            <TabsContent value="faq" className="pt-4">
              <Accordion type="single" collapsible>
                {active.faqs.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`}>
                    <AccordionTrigger className="text-sm text-left">
                      <span className="flex items-center gap-2"><HelpCircle className="size-4" />{f.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-2"><Icon className="size-4" /> {title}</p>
      {children}
    </div>
  );
}
