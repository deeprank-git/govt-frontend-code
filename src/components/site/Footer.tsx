import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { Logo } from "./Logo";

const COLS = [
  {
    title: "Solutions",
    links: [
      { label: "Mock Tests", to: "/exams" },
      { label: "Previous Year Papers", to: "/exam-info" },
      { label: "Current Affairs", to: "/current-affairs" },
      { label: "Exam Alerts", to: "/exam-info" },
    ],
  },
  {
    title: "Products",
    links: [
      { label: "All Exams", to: "/exams" },
      { label: "SSC", to: "/exams", hash: "SSC" },
      { label: "Banking", to: "/exams", hash: "Banking" },
      { label: "Railways", to: "/exams", hash: "Railway" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", to: "/about-us" },
      { label: "Careers", to: "/about-us" },
      { label: "Contact", to: "/about-us" },
      { label: "Privacy Policy", to: "/pages/$slug", params: { slug: "privacy-policy" } },
      { label: "Terms & Conditions", to: "/pages/$slug", params: { slug: "terms-and-conditions" } },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative mt-24 bg-footer-bg text-primary-foreground overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 -top-12 select-none text-center text-[35vw] md:text-[20vw] leading-none font-display font-extrabold text-white/[0.07] md:text-white/[0.04]">
        Testopy
      </div>
      <div className="relative container mx-auto px-4 lg:px-6 pt-16 pb-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2 flex flex-col items-center md:items-start">
            <Logo size="h-14" />
            <p className="mt-4 text-sm text-primary-foreground/80 max-w-sm text-center md:text-left">
              Building the future of government exam preparation — free mock tests, previous year papers,
              current affairs, and analytics in one place.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title} className="text-center md:text-left">
              <h4 className="font-display font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-2.5 text-sm text-primary-foreground/80">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} params={"params" in l ? l.params : undefined} hash={"hash" in l ? l.hash : undefined} className="hover:text-primary-foreground transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-primary-foreground/70">
            © {new Date().getFullYear()} Testopy. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {[Instagram, Linkedin, Twitter, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="h-9 w-9 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 transition"
                aria-label="social"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
