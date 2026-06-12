"use client";

import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/analytics";

export function AuthScreen() {
  const { signInWithGoogle } = useAuth();
  const { text } = useLanguage();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      await signInWithGoogle();
      trackEvent('auth_success', { provider: 'google' });
    } catch (err) {
      console.error(err);
      setError(text.authError || "Failed to sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-4 animate-fade-in">
      <div className="mb-8 text-center animate-smooth-reveal">
        <h1 className="font-calligraphy text-5xl text-primary drop-shadow-sm md:text-6xl">
          Pujo<span className="text-foreground">পথ</span>
        </h1>
        <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
          {text.tagline || "Your Smart Guide to Durga Puja Pandals"}
        </p>
      </div>

      <Card className="w-full max-w-sm shadow-xl animate-fade-in-up border-primary/20">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline text-accent">Welcome / স্বাগতম</CardTitle>
          <CardDescription>
            Sign in to track your pandal visits and earn achievements!
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button 
            size="lg" 
            className="w-full text-md font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            onClick={handleSignIn}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogIn className="w-5 h-5" />
            )}
            Sign in with Google
          </Button>
          {error && (
            <p className="text-sm text-destructive text-center mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
