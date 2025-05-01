import { Terminal, TypingAnimation, AnimatedSpan } from "./magicui/terminal";

export function TerminalDemo() {
  return (
    <Terminal className="text-left">
      <TypingAnimation>&gt; npx create-saas-stack my-app </TypingAnimation>

      <AnimatedSpan delay={2000} className="text-green-500">
        <span>✔ NextJS.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={2500} className="text-green-500">
        <span>✔ Clerk Authentication.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={3000} className="text-green-500">
        <span>✔ Convex.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={3500} className="text-green-500">
        <span>✔ Stripe.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={4000} className="text-green-500">
        <span>✔ Tailwind CSS.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={4500} className="text-green-500">
        <span>✔ ShadCN UI.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={5000} className="text-green-500">
        <span>✔ Stripe/Clerk Webhook.</span>
      </AnimatedSpan>

      <AnimatedSpan delay={5500} className="text-muted-foreground">
        Success! Project initialization completed.
      </AnimatedSpan>

      <AnimatedSpan delay={6000} className="text-muted-foreground">
        You may now add your own idea and ship it 🚀.
      </AnimatedSpan>
    </Terminal>
  );
}
