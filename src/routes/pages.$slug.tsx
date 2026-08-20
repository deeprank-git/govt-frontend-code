import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import * as pageService from "@/services/pageService";
import { unwrapItem } from "@/lib/api-unwrap";
import { PrivacyPolicy } from "@/components/site/PrivacyPolicy";
import { TermsAndConditions } from "@/components/site/TermsAndConditions";

export const Route = createFileRoute("/pages/$slug")({
  component: StaticPage,
});

function StaticPage() {
  const { slug } = Route.useParams();

  const isPrivacyPolicy = slug === "privacy-policy";
  const isTerms = slug === "terms-and-conditions";
  const isHardcoded = isPrivacyPolicy || isTerms;

  const { data: res, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: () => pageService.getPageBySlug(slug),
    enabled: !isHardcoded,
  });
  const page = unwrapItem<any>(res);

  if (isHardcoded) {
    const label = isPrivacyPolicy ? "Privacy Policy" : "Terms & Conditions";
    return (
      <SiteShell>
        <div className="container mx-auto px-4 lg:px-6 py-10 max-w-3xl">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: label }]} />
          <Button variant="ghost" size="sm" asChild className="mt-4 -ml-2">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back to Home</Link>
          </Button>
          <Card className="p-6 lg:p-8 mt-6">
            {isPrivacyPolicy ? <PrivacyPolicy /> : <TermsAndConditions />}
          </Card>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="container mx-auto px-4 lg:px-6 py-10 max-w-3xl">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: page?.title ?? slug }]} />
        <Button variant="ghost" size="sm" asChild className="mt-4 -ml-2">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" />Back to Home</Link>
        </Button>

        {isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading…</p>}

        {!isLoading && !page && (
          <Card className="p-8 text-center mt-6">
            <p className="text-sm text-muted-foreground">This page doesn't exist.</p>
          </Card>
        )}

        {page && (
          <Card className="p-6 lg:p-8 mt-6">
            <h1 className="text-2xl md:text-3xl font-display font-extrabold">{page.title}</h1>
            <div className="mt-5 text-[15px] leading-7 whitespace-pre-line">
              {typeof page.content === "string" ? page.content : JSON.stringify(page.content)}
            </div>
          </Card>
        )}
      </div>
    </SiteShell>
  );
}
