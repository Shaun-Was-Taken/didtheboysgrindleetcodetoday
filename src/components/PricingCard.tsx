import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface PricingFeature {
  text: string;
  /** Marks a perk unique to this tier — rendered with a warm accent. */
  highlight?: boolean;
}

interface PricingCardProps {
  title: string;
  price: string;
  period?: string;
  description: string;
  features: PricingFeature[];
  buttonText: string;
  onButtonClick?: () => void;
  isLoading?: boolean;
  /** Visually elevates this card and shows the badge — the anchor plan. */
  recommended?: boolean;
  badge?: string;
  buttonVariant?: "default" | "outline";
  /** Reassurance line under the CTA (e.g. "Cancel anytime"). */
  microcopy?: string;
  className?: string;
}

const PricingCard = ({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  onButtonClick,
  isLoading,
  recommended = false,
  badge,
  buttonVariant = "default",
  microcopy,
  className,
}: PricingCardProps) => {
  return (
    <div className="relative h-full">
      {recommended && badge && (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
          {badge}
        </span>
      )}
      <Card
        className={cn(
          "relative flex h-full flex-col justify-between overflow-hidden",
          recommended && "border-primary shadow-md ring-1 ring-primary/25",
          className
        )}
      >
        {recommended && (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/40 blur-3xl"
          />
        )}

        <div className="relative">
          <CardHeader>
            <CardTitle className="font-display text-xl">{title}</CardTitle>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold tracking-tight">
                {price}
              </span>
              {period && (
                <span className="text-sm text-muted-foreground">{period}</span>
              )}
            </div>
            <CardDescription className="mt-2 text-sm leading-relaxed">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3.5">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  {feature.highlight ? (
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  ) : (
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary/60" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      feature.highlight && "font-medium"
                    )}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </div>

        <CardFooter className="relative flex-col items-stretch gap-2">
          <Button
            onClick={onButtonClick}
            className="w-full cursor-pointer"
            variant={buttonVariant}
            disabled={isLoading}
          >
            {buttonText}
          </Button>
          {microcopy && (
            <p className="text-center text-xs text-muted-foreground">
              {microcopy}
            </p>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PricingCard;
