"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { Mail, Coins, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface UserInfoCardProps {
  credits?: number;
  isSubscribed?: boolean;
  email?: string;
}

const UserInfoCard = ({
  credits = 0,
  isSubscribed = false,
  email,
}: UserInfoCardProps) => {
  const { user, isLoaded } = useUser();
  const createBillingPortal = useAction(api.stripe.billingPortal);

  const handleBillingPortal = async () => {
    if (!user) return;
    const { url } = await createBillingPortal();
    window.location.href = url;
  };

  if (!isLoaded) {
    return (
      <Card className="w-full max-w-md p-4 animate-pulse">
        <div className="h-24 bg-muted rounded-md"></div>
      </Card>
    );
  }

  // Use provided email or fall back to user's email
  const userEmail = email || user?.primaryEmailAddress?.emailAddress;

  return (
    <Card className="w-full max-w-md">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-muted">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
            <AvatarFallback className="text-lg">
              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                {user?.fullName || user?.username}
              </h3>
              <Badge variant={isSubscribed ? "default" : "outline"}>
                {isSubscribed ? "Subscribed" : "Not Subscribed"}
              </Badge>
            </div>

            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <Mail className="h-4 w-4" />
              <span>{userEmail || "No email available"}</span>
            </div>

            <div className="flex items-center text-sm text-muted-foreground gap-1">
              <Coins className="h-4 w-4" />
              <span>{credits} credits available</span>
            </div>
          </div>
        </div>
        {isSubscribed && (
          <div className="mt-10 text-sm text-muted-foreground">
            <Button
              onClick={handleBillingPortal}
              className="flex justify-center items-center mx-auto cursor-pointer"
            >
              <CreditCard />
              Billing Dashboard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserInfoCard;