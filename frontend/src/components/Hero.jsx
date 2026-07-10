import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "./ui/button";

const HERO_IMG =
  "https://images.unsplash.com/photo-1616440347437-b1c73416efc2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBtaW5pbWFsJTIwZGVzayUyMGNvbXB1dGVyJTIwc2V0dXB8ZW58MHx8fHwxNzgzNzA3NzE1fDA&ixlib=rb-4.1.0&q=85";

export const Hero = () => (
  <section id="hero" data-testid="hero-section" className="pt-32 pb-20 lg:pt-44 lg:pb-32 px-6 lg:px-10">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      <motion.div
        className="lg:col-span-7"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="inline-block text-xs font-semibold uppercase tracking-widest text-accent mb-6">
          Workflow automation for small teams
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05] mb-8">
          Automate the busywork.
          <br />
          <span className="text-primary italic">Ship what matters.</span>
        </h1>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-10">
          StreamLine connects your tools, automates repetitive tasks, and gives your team hours back every week — on web and mobile, starting at $0.
        </p>
        <div className="flex flex-wrap gap-4">
          <Button asChild data-testid="hero-cta-primary" size="lg" className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 transition-[transform,background-color]">
            <a href="#contact">
              Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </Button>
          <Button asChild data-testid="hero-cta-secondary" size="lg" variant="outline" className="rounded-xl border-border hover:bg-secondary transition-colors">
            <a href="#features">
              <Play className="w-4 h-4 mr-2" /> See how it works
            </a>
          </Button>
        </div>
        <div className="flex gap-10 mt-14">
          {[["12k+", "Teams onboard"], ["4.9★", "Avg. rating"], ["38h", "Saved / month"]].map(([v, l]) => (
            <div key={l}>
              <div className="font-serif text-2xl md:text-3xl text-primary">{v}</div>
              <div className="text-xs text-muted-foreground mt-1">{l}</div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        className="lg:col-span-5"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="relative">
          <div className="absolute -inset-4 bg-primary/10 rounded-2xl rotate-2" />
          <img
            src={HERO_IMG}
            alt="StreamLine workflow in action"
            data-testid="hero-image"
            className="relative rounded-2xl shadow-xl shadow-teal-900/10 dark:shadow-black/40 w-full object-cover max-h-[70vh]"
          />
        </div>
      </motion.div>
    </div>
  </section>
);
