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
}

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  features: PricingFeature[];
  buttonText: string;
  isSubscription?: boolean;
  className?: string;
  isLoading?: boolean;
  onButtonClick?: () => void;
}

const PricingCard = ({
  title,
  price,
  description,
  features,
  buttonText,
  isSubscription = false,
  className,
  isLoading,
  onButtonClick,
}: PricingCardProps) => {
  return (
    <Card className={cn("flex flex-col justify-between", className)}>
      <div>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <div className="flex items-baseline mt-2">
            <span className="text-3xl font-bold">{price}</span>
            {isSubscription && (
              <span className="text-muted-foreground ml-1 text-sm">/month</span>
            )}
          </div>
          <CardDescription className="mt-1 mb-3 text-sm leading-relaxed">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <Check className="mr-3 h-5 w-5 text-primary" />
                <span className="text-sm">{feature.text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </div>
      <CardFooter>
        <Button
          onClick={onButtonClick}
          className="w-full cursor-pointer"
          variant={isSubscription ? "outline" : "default"}
          disabled={isLoading}
        >
          {buttonText}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PricingCard;
