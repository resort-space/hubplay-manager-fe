import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-[10px] px-3.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45',
  {
    variants: {
      variant: {
        default: 'bg-blue-700 text-white',
        ghost: 'border border-slate-200 bg-white font-medium text-slate-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Button({
  className,
  variant,
  asChild = false,
  type = 'button',
  ...props
}: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp type={asChild ? undefined : type} className={cn(buttonVariants({ variant }), className)} {...props} />;
}
