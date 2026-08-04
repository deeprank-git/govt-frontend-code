import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Target, BookOpen, BarChart3, Bell, Shield, Award, Users, Quote, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import aboutImg from "@/assets/about-hero.png";

export const Route = createFileRoute("/about-us")({
  head: () => ({
    meta: [
      { title: "About Us — Testopy" },
      { name: "description", content: "Testopy is India's most trusted online platform for government exam preparation." },
      { property: "og:title", content: "About Testopy" },
      { property: "og:description", content: "Empowering aspirants, building futures with quality test prep." },
    ],
  }),
  component: AboutPage,
});

const STATS = [
  { v: "10M+", l: "Happy Aspirants" },
  { v: "500+", l: "Exams Covered" },
  { v: "1.5M+", l: "Mock Tests Taken" },
  { v: "4.8/5", l: "User Rating" },
  { v: "50+", l: "Expert Educators" },
];

const REASONS = [
  { icon: BookOpen, title: "Comprehensive Content", desc: "Detailed and exam-focused study material curated by experts." },
  { icon: Target, title: "Exam-Oriented Practice", desc: "Mock tests and PYQ papers designed as per the latest exam pattern." },
  { icon: BarChart3, title: "Performance Analytics", desc: "In-depth reports help you identify strengths and improve weak areas." },
  { icon: Bell, title: "Timely Updates", desc: "Stay updated with the latest notifications, exam dates and important alerts." },
  { icon: Shield, title: "Trusted by Millions", desc: "10M+ aspirants trust Testopy for their preparation journey." },
];

const TEAM = [
  { name: "Arjun Singh", role: "Founder & CEO" },
  { name: "Priya Sharma", role: "Head of Content" },
  { name: "Rohit Verma", role: "Head of Technology" },
  { name: "Ankit Gupta", role: "Lead — Test Analytics" },
  { name: "Neha Rathi", role: "Lead — Operations" },
  { name: "Saurabh Jain", role: "Lead — Design" },
];

const WHY_TESTOPY = [
  { title: "Built for Bharat", desc: "Designed specifically for Indian government exams — SSC, UPSC, Banking, Railways, State PSCs and more. Every feature and every question is tailored to aspirants like you." },
  { title: "Expert-Curated Content", desc: "Our content is crafted by experienced educators who have cracked these exams themselves. No noise, no filler — only what matters for your success." },
  { title: "One Platform, All Exams", desc: "From daily current affairs to full-length mock tests and previous year papers — everything you need is in one place, accessible anytime, anywhere." },
];

function AboutPage() {
  return (
    <SiteShell>
      <section className="bg-hero-radial">
        <div className="container mx-auto px-4 lg:px-6 pt-6 pb-5">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "About Us" }]} />
          <div className="mt-6 grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">About Us</span>
              <h1 className="mt-4 text-4xl md:text-5xl font-display font-extrabold leading-[1.05]">
                Empowering Aspirants,<br /><span className="text-primary">Building Futures</span>
              </h1>
              <p className="mt-5 text-muted-foreground max-w-xl">
                Testopy is India's most trusted online platform for government exam preparation. We provide
                the right resources, practice and guidance to help aspirants achieve their goals and build
                successful careers.
              </p>
              <Button className="mt-6" size="lg" asChild>
                <Link to="/exams">Explore Exams <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <img src={aboutImg} alt="Testopy mission" width={1024} height={896} loading="lazy" className="w-full max-w-md mx-auto" />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-6 py-10">
        <Card className="p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {STATS.map((s) => (
            <div key={s.l} className="flex items-center gap-3 p-2">
              <span className="h-10 w-10 rounded-full bg-primary/10 text-primary grid place-items-center"><Users className="h-4 w-4" /></span>
              <div>
                <div className="font-display font-bold text-lg leading-tight">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section className="container mx-auto px-4 lg:px-6 pb-10 grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <span className="h-12 w-12 grid place-items-center rounded-full bg-primary/10 text-primary"><Target className="h-5 w-5" /></span>
          <h3 className="mt-3 font-display font-bold text-xl">Our Mission</h3>
          <p className="mt-2 text-muted-foreground">
            To make quality test preparation accessible to every aspirant across India and empower them with the right
            tools, practice and support to crack government exams.
          </p>
        </Card>
        <Card className="p-6">
          <span className="h-12 w-12 grid place-items-center rounded-full bg-primary/10 text-primary"><Eye className="h-5 w-5" /></span>
          <h3 className="mt-3 font-display font-bold text-xl">Our Vision</h3>
          <p className="mt-2 text-muted-foreground">
            To be the most reliable and innovative platform for government exam preparation and a catalyst in
            shaping the careers of millions of aspiring individuals.
          </p>
        </Card>
      </section>

      <section className="container mx-auto px-4 lg:px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">Founder's Message</span>
            <h2 className="mt-4 text-2xl md:text-3xl font-display font-bold">A Word from Our Founder</h2>
            <Quote className="h-8 w-8 text-primary mt-6 mb-3" />
            <p className="text-muted-foreground text-base leading-relaxed italic">
              "When I was preparing for government exams, I struggled to find a single platform that offered quality content, realistic mock tests, and actionable performance insights — all in one place. That struggle became the seed of Testopy. Today, I am proud that millions of aspirants across India trust us to help them achieve their dreams. Our mission is simple: give every aspirant the best possible chance to succeed, regardless of their background or location."
            </p>
            <div className="mt-8">
              <div className="font-display font-bold text-lg">Debabrata Roy</div>
              <div className="text-sm text-muted-foreground">Founder & CEO, Testopy</div>
            </div>
          </div>
          <div className="flex justify-center">
            <img
              src="/docs/founderImage.png"
              alt="Debabrata Roy — Founder & CEO, Testopy"
              className="w-[60%] object-cover object-top rounded-2xl"
              style={{ minHeight: "290px", maxHeight: "360px" }}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 lg:px-6 py-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center">Why Choose Testopy?</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {REASONS.map((r) => (
            <Card key={r.title} className="p-5 text-center">
              <span className="h-12 w-12 grid place-items-center rounded-xl bg-primary/10 text-primary mx-auto"><r.icon className="h-5 w-5" /></span>
              <h4 className="mt-3 font-semibold">{r.title}</h4>
              <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* <section className="container mx-auto px-4 lg:px-6 py-10">
        <h2 className="text-2xl md:text-3xl font-display font-bold text-center">Why Testopy?</h2>
        <p className="mt-3 text-center text-muted-foreground max-w-xl mx-auto">
          We didn't just build another test-prep app. We built the platform we wished we had.
        </p>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {WHY_TESTOPY.map((item) => (
            <div key={item.title} className="flex gap-4">
              <span className="mt-1 shrink-0"><CheckCircle2 className="h-5 w-5 text-primary" /></span>
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section> */}

      <section className="container mx-auto px-4 lg:px-6 pb-16">
        <Card className="p-6 sm:p-8 bg-footer-bg text-primary-foreground flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Award className="h-10 w-10" />
            <div>
              <div className="font-display font-bold text-xl">Your Dream Job is Closer Than You Think</div>
              <div className="text-sm text-primary-foreground/85">Join millions of aspirants who trust Testopy.</div>
            </div>
          </div>
          <Button variant="secondary" size="lg" asChild>
            <Link to="/auth" search={{ mode: "signup" } as never}>Start Your Journey <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </Card>
      </section>
    </SiteShell>
  );
}
