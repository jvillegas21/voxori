import { Calendar, Building2, Users, MessageSquare } from 'lucide-react';
import { RevealOnScroll } from '@/components/marketing/motion';

const INTEGRATIONS = [
  {
    icon: Calendar,
    name: 'Google Calendar',
    description: 'Real-time availability and showing booking',
  },
  {
    icon: Building2,
    name: 'MLS',
    description: 'Live listing search during every call',
  },
  {
    icon: Users,
    name: 'CRM',
    description: 'Follow Up Boss and HubSpot sync',
  },
  {
    icon: MessageSquare,
    name: 'SMS',
    description: 'Listing links and confirmations in under 60s',
  },
] as const;

export function IntegrationsRow() {
  return (
    <section
      id="integrations"
      className="scroll-mt-24 border-t border-border/60 py-16 md:py-24"
      aria-labelledby="integrations-heading"
    >
      <div className="mx-auto max-w-6xl px-6">
        <RevealOnScroll>
          <h2 id="integrations-heading" className="font-heading text-3xl font-semibold text-foreground">
            Connects to your stack
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Voxori plugs into the tools you already use — no rip-and-replace required for launch.
          </p>
        </RevealOnScroll>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {INTEGRATIONS.map(({ icon: Icon, name, description }, index) => (
            <li key={name}>
              <RevealOnScroll index={index}>
                <article className="integration-card card-lift h-full cursor-default rounded-2xl border border-border/60 bg-card p-6">
                  <Icon
                    className="integration-logo h-8 w-8 text-primary opacity-80"
                    aria-hidden
                  />
                  <h3 className="mt-4 font-medium text-foreground">{name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{description}</p>
                </article>
              </RevealOnScroll>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
