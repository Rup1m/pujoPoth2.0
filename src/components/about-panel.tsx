
"use client";

import { Instagram, Linkedin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from './ui/separator';

const SocialLink = ({ href, icon: Icon, text }: { href: string, icon: React.ElementType, text: string }) => (
    <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted"
    >
        <Icon className="w-6 h-6 text-primary" />
        <span className="text-base font-medium text-foreground">{text}</span>
    </a>
);

export function AboutPanel({ children, open, onOpenChange }: { children: React.ReactNode, open: boolean, onOpenChange: (open: boolean) => void }) {
  const linkedInUrl = "https://www.linkedin.com/in/rupam88?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app";
  const instagramUrl = "https://www.instagram.com/rup1m?igsh=bnZ5czA3cmw5dW1q";
  const email = "rupamiem@gmail.com";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="mb-4 text-center">
            <SheetTitle className="text-2xl font-bold tracking-tight">
                <span className="font-calligraphy">Pujo</span><span className="font-extrabold text-3xl">পথ</span>
            </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 px-2 pb-6">
            <div className="text-center">
                <p className="text-lg font-semibold text-foreground">A Rupam Banerjee Production</p>
                <p className="text-sm text-muted-foreground">Your Smart Guide to Durga Puja in Kolkata</p>
            </div>

            <Separator />
            
            <div className="space-y-3">
                <h3 className="text-center text-base font-semibold text-muted-foreground">Follow me</h3>
                <div className="flex justify-center items-center gap-4">
                    <SocialLink href={linkedInUrl} icon={Linkedin} text="LinkedIn" />
                    <SocialLink href={instagramUrl} icon={Instagram} text="Instagram" />
                </div>
            </div>

            <Separator />

            <div className="text-center space-y-2">
                <h3 className="text-base font-semibold text-muted-foreground">Provide feedback</h3>
                 <a 
                    href={`mailto:${email}`}
                    className="inline-block text-base font-medium text-primary underline-offset-4 hover:underline"
                 >
                    {email}
                </a>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
