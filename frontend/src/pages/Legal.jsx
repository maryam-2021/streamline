import { Link } from "react-router-dom";

const sections = {
  privacy: [
    ["Information we collect", "We collect account details, workflow configuration, client records, contact submissions, usage events, and payment identifiers required to operate StreamLine. Card details are handled directly by Stripe."],
    ["How we use information", "We use information to provide and secure the service, execute workflows, process subscriptions, communicate with you, and improve reliability."],
    ["Service providers", "We may use infrastructure, database, email, analytics, authentication, and payment providers. They process information only as needed to provide those services."],
    ["Retention and your rights", "We retain information while your account is active and as required for security, legal, and financial obligations. Contact us to request access, correction, export, or deletion."],
  ],
  terms: [
    ["Using StreamLine", "You must provide accurate information, protect your credentials, and use the service lawfully. You may not probe, disrupt, abuse, or use workflows to access systems without authorization."],
    ["Subscriptions", "Paid plans renew until cancelled. Prices and included usage are shown before purchase. Cancellation takes effect according to the billing portal terms presented at checkout."],
    ["Your content", "You retain ownership of content you submit. You grant StreamLine the limited rights required to store, process, and transmit it to provide the service."],
    ["Availability and liability", "The service is provided subject to reasonable maintenance and operational limits. Final jurisdiction-specific warranty, liability, and dispute language should be reviewed by qualified counsel before launch."],
  ],
};

export default function Legal({ type }) {
  const title = type === "privacy" ? "Privacy Policy" : "Terms of Service";
  return <main className="min-h-screen bg-background px-6 py-14"><article className="max-w-3xl mx-auto"><Link to="/" className="font-serif text-2xl text-primary">StreamLine</Link><h1 className="font-serif text-5xl mt-12 mb-3">{title}</h1><p className="text-sm text-muted-foreground mb-12">Last updated: 11 July 2026</p><div className="space-y-10">{sections[type].map(([heading, body]) => <section key={heading}><h2 className="font-serif text-2xl mb-3">{heading}</h2><p className="text-muted-foreground leading-7">{body}</p></section>)}</div><p className="mt-12 text-sm border-t border-border pt-6">Questions? Contact the address published on the StreamLine website.</p></article></main>;
}
