import { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TEAM_IMG =
  "https://images.unsplash.com/photo-1576267423445-b2e0074d68a4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwxfHxzbWlsaW5nJTIwZGl2ZXJzZSUyMHByb2Zlc3Npb25hbHMlMjBvZmZpY2V8ZW58MHx8fHwxNzgzNzA3NzE1fDA&ixlib=rb-4.1.0&q=85";

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post(`${API}/contact`, { ...form, company: form.company || null });
      toast.success("Message sent! We'll get back to you within 24 hours.");
      setForm({ name: "", email: "", company: "", message: "" });
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="contact" data-testid="contact-section" className="py-20 lg:py-32 px-6 lg:px-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-accent">Contact</span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-4 mb-6">Let's streamline your team</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10">
            Tell us about your workflows and we'll show you how much time you could save.
          </p>
          <img
            src={TEAM_IMG}
            alt="StreamLine team"
            className="rounded-2xl shadow-xl shadow-teal-900/10 dark:shadow-black/40 w-full object-cover max-h-[40vh] hidden lg:block"
          />
        </motion.div>

        <motion.form
          onSubmit={submit}
          data-testid="contact-form"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-8 lg:p-12 shadow-xl shadow-teal-900/5 dark:shadow-black/40 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="contact-name">Name *</label>
              <Input id="contact-name" data-testid="contact-name-input" required value={form.name} onChange={set("name")} placeholder="Jane Doe" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="contact-email">Email *</label>
              <Input id="contact-email" data-testid="contact-email-input" required type="email" value={form.email} onChange={set("email")} placeholder="jane@company.com" className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="contact-company">Company</label>
            <Input id="contact-company" data-testid="contact-company-input" value={form.company} onChange={set("company")} placeholder="Acme Inc. (optional)" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="contact-message">Message *</label>
            <Textarea id="contact-message" data-testid="contact-message-input" required value={form.message} onChange={set("message")} placeholder="Tell us about your workflows..." rows={5} className="rounded-xl resize-none" />
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="contact-submit-button"
            className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 transition-[transform,background-color]"
            size="lg"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {loading ? "Sending..." : "Send Message"}
          </Button>
        </motion.form>
      </div>
    </section>
  );
};
