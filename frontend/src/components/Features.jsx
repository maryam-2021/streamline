import { motion } from "framer-motion";
import { Workflow, Smartphone, Bell, BarChart3, Plug, ShieldCheck } from "lucide-react";

const FEATURE_IMG =
  "https://images.unsplash.com/photo-1764258560292-ba76effe9797?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzV8MHwxfHNlYXJjaHw0fHxhYnN0cmFjdCUyMGdlb21ldHJpYyUyMGZsb3clMjB0ZWFsJTIwZnVjaHNpYXxlbnwwfHx8fDE3ODM3MDc3MTV8MA&ixlib=rb-4.1.0&q=85";

const features = [
  { icon: Workflow, title: "Visual Workflow Builder", desc: "Drag, drop, done. Chain triggers and actions across your entire stack without writing a line of code.", span: "md:col-span-8 lg:col-span-8" },
  { icon: Smartphone, title: "Mobile Companion", desc: "Approve, monitor, and trigger workflows on the go.", span: "md:col-span-4 lg:col-span-4" },
  { icon: Bell, title: "Smart Alerts", desc: "Get notified only when it matters — noise filtered out.", span: "md:col-span-4 lg:col-span-4" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "See time saved, runs completed, and bottlenecks at a glance with real-time reporting.", span: "md:col-span-4 lg:col-span-4" },
  { icon: Plug, title: "100+ Integrations", desc: "Slack, GitHub, Notion, Gmail and more out of the box.", span: "md:col-span-4 lg:col-span-4" },
];

export const Features = () => (
  <section id="features" data-testid="features-section" className="py-20 lg:py-32 px-6 lg:px-10">
    <div className="max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mb-16"
      >
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">Features</span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-4 mb-6">
          Everything your team needs, nothing it doesn't
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          Built for small teams that move fast. One design system, one workflow engine, everywhere.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-8 lg:grid-cols-12 gap-8">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            data-testid={`feature-card-${i}`}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`${f.span} bg-card border border-border rounded-2xl p-8 lg:p-10 shadow-xl shadow-teal-900/5 dark:shadow-black/40 hover:-translate-y-1 transition-transform`}
          >
            <span className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
              <f.icon className="w-6 h-6" />
            </span>
            <h3 className="text-xl lg:text-2xl tracking-tight mb-3">{f.title}</h3>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}

        <motion.div
          data-testid="feature-card-visual"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="md:col-span-8 lg:col-span-8 relative rounded-2xl overflow-hidden shadow-xl shadow-teal-900/5 dark:shadow-black/40 min-h-[260px]"
        >
          <img src={FEATURE_IMG} alt="Abstract teal and fuchsia flow" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-end p-8 lg:p-10">
            <div>
              <span className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-xl text-white flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </span>
              <h3 className="text-xl lg:text-2xl tracking-tight text-white mb-2">Enterprise-grade security</h3>
              <p className="text-sm text-white/80 leading-relaxed max-w-md">SOC 2 ready, encrypted at rest and in transit, with granular role-based access.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);
